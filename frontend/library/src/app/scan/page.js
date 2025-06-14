'use client';

import React, { useRef, useState, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import './style.css';

const VIDEO_SIZE = 350; // px

export default function IngredientScanner() {
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    let stream;
    async function enableCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: VIDEO_SIZE, height: VIDEO_SIZE } });
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

  return (
    <div className="scanner-container" style={{ background: "#fff" }}>
      {/* Header */}
      <header className="header-overlay" style={{ background: "rgba(245,245,245,0.95)" }}>
        <h1 className="title">Ingredient Scanner</h1>
        <button className="help-btn" onClick={() => alert("Camera opens automatically if permissions are granted.")}>?</button>
      </header>

      {/* Centered camera */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          position: "relative"
        }}
      >
        <div style={{ position: "relative", marginTop: "60px" }}>
          {cameraError ? (
            <div
              style={{
                width: VIDEO_SIZE,
                height: VIDEO_SIZE,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#eee",
                borderRadius: "20px",
                color: "#c00",
                fontWeight: "bold"
              }}
            >
              <FontAwesomeIcon icon={faExclamationTriangle} style={{ marginRight: 8 }} />
              {cameraError}
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              width={VIDEO_SIZE}
              height={VIDEO_SIZE}
              style={{
                borderRadius: "20px",
                objectFit: "cover",
                background: "#000",
                boxShadow: "0 4px 24px rgba(0,0,0,0.12)"
              }}
              className="camera-video-fullscreen"
            />
          )}
        </div>
      </div>

      {/* Controls */}
      <footer className="controls-overlay" style={{ background: "transparent", boxShadow: "none" }}>
        <button className="scan-btn" style={{ marginRight: "1rem" }}>
          Scan Ingredient
        </button>
        <button className="camera-icon-btn" disabled={!cameraReady}>
          <FontAwesomeIcon icon={faCamera} />
        </button>
      </footer>
    </div>
  );
}