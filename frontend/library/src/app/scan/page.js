'use client';

import React, { useRef, useState, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import * as ort from "onnxruntime-web";
import './style.css';

const INPUT_SIZE = 800;
const MODEL_URL = "/assets/model.onnx";
const LABELS_URL = "/assets/labels.txt";

export default function IngredientScanner() {
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [session, setSession] = useState(null);
  const [labels, setLabels] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detections, setDetections] = useState([]);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Load ONNX model
  useEffect(() => {
    ort.env.wasm.wasmPaths = '/assets/';
    ort.InferenceSession.create(MODEL_URL)
      .then(setSession)
      .catch(e => setCameraError("Model load error: " + e.message));
  }, []);

  // Load labels.txt
  useEffect(() => {
    fetch(LABELS_URL)
      .then(res => res.text())
      .then(text => setLabels(text.split('\n').map(l => l.trim()).filter(Boolean)));
  }, []);

  // Start camera
  useEffect(() => {
    let stream;
    async function enableCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: INPUT_SIZE, height: INPUT_SIZE } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraReady(true);
        }
      } catch (err) {
        setCameraError('Camera error: ' + err.message);
      }
    }
    enableCamera();
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, []);

  // Detection logic (memoized to avoid stale closures)
  const handleCapture = useCallback(async () => {
    if (!session || !videoRef.current || !canvasRef.current) return;
    setIsAnalyzing(true);
    setDetections([]);
    const ctx = canvasRef.current.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, INPUT_SIZE, INPUT_SIZE);
    const imageData = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);

    // Preprocess to Float32Array (NCHW)
    const input = new Float32Array(1 * 3 * INPUT_SIZE * INPUT_SIZE);
    for (let y = 0; y < INPUT_SIZE; y++) {
      for (let x = 0; x < INPUT_SIZE; x++) {
        const idx = (y * INPUT_SIZE + x) * 4;
        const outIdx = y * INPUT_SIZE + x;
        input[outIdx] = imageData.data[idx] / 255.0;
        input[INPUT_SIZE * INPUT_SIZE + outIdx] = imageData.data[idx + 1] / 255.0;
        input[2 * INPUT_SIZE * INPUT_SIZE + outIdx] = imageData.data[idx + 2] / 255.0;
      }
    }
    const tensor = new ort.Tensor("float32", input, [1, 3, INPUT_SIZE, INPUT_SIZE]);
    const feeds = {};
    feeds[session.inputNames[0]] = tensor;
    const results = await session.run(feeds);

    // Parse detections (assuming output is [num, 6]: [x_min, y_min, x_max, y_max, conf, class])
    const outputArr = Array.from(results[session.outputNames[0]].data);
    const numDetections = outputArr.length / 6;
    const boxes = [];
    for (let i = 0; i < numDetections; i++) {
      const offset = i * 6;
      const [x_min, y_min, x_max, y_max, confidence, class_id] = outputArr.slice(offset, offset + 6);
      if (confidence > 0.5) {
        boxes.push({ x_min, y_min, x_max, y_max, confidence, class_id });
      }
    }
    setDetections(boxes);
    setIsAnalyzing(false);
  }, [session, videoRef, canvasRef]);

  // Automatic detection interval
  useEffect(() => {
    if (!session || !cameraReady) return;
    const interval = setInterval(() => {
      handleCapture();
    }, 1500); // Run detection every 1.5 seconds
    return () => clearInterval(interval);
  }, [session, cameraReady, handleCapture]);

  return (
    <div className="scanner-container" style={{ background: "#fff" }}>
      {/* Header */}
      <header className="header-overlay" style={{ background: "rgba(245,245,245,0.95)" }}>
        <h1 className="title">Ingredient Scanner</h1>
        <button className="help-btn" onClick={() => alert("Camera opens automatically if permissions are granted.")}>?</button>
      </header>

      {/* Camera area */}
      <div className="camera-fullscreen">
        {cameraError ? (
          <div className="camera-error-fullscreen">
            <div className="error-content">
              <div className="error-icon">
                <FontAwesomeIcon icon={faExclamationTriangle} />
              </div>
              <p>{cameraError}</p>
              <button className="retry-btn" onClick={() => window.location.reload()}>Retry Camera</button>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="camera-video-fullscreen"
              width={INPUT_SIZE}
              height={INPUT_SIZE}
            />
            {/* Detection box overlay */}
            <div className="scanning-overlay-fullscreen">
              <div className="scan-frame"></div>
              <p className="scan-instruction">Position ingredient inside the box</p>
              {/* Render detection boxes */}
              {detections.map((box, idx) => (
                <div
                  key={idx}
                  style={{
                    position: "absolute",
                    left: `${box.x_min * 100}%`,
                    top: `${box.y_min * 100}%`,
                    width: `${(box.x_max - box.x_min) * 100}%`,
                    height: `${(box.y_max - box.y_min) * 100}%`,
                    border: "2px solid #ff9800",
                    borderRadius: "8px",
                    boxSizing: "border-box",
                    pointerEvents: "none",
                    zIndex: 10,
                  }}
                >
                  <span style={{
                    background: "#ff9800",
                    color: "#fff",
                    padding: "2px 8px",
                    borderRadius: "6px",
                    fontSize: "0.9rem",
                    position: "absolute",
                    top: "-1.8em",
                    left: 0,
                  }}>
                    {labels[box.class_id] || `Class ${box.class_id}`} ({(box.confidence * 100).toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
            <canvas ref={canvasRef} width={INPUT_SIZE} height={INPUT_SIZE} style={{ display: "none" }} />
          </>
        )}
      </div>

      {/* Controls */}
      <footer className="controls-overlay" style={{ background: "transparent", boxShadow: "none" }}>
        <button className="scan-btn" style={{ marginRight: "1rem" }} disabled>
          {isAnalyzing ? "Analyzing..." : "Auto Detecting"}
        </button>
        <button className="camera-icon-btn" disabled>
          <FontAwesomeIcon icon={faCamera} />
        </button>
      </footer>
    </div>
  );
}