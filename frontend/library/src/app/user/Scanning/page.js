'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faQuestionCircle,
  faUpload,
  faTimes,
  faPlus,
  faCheck,
  faTrash,
  faExclamationTriangle,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import * as ort from 'onnxruntime-web';
import './style.css';

const INPUT_SIZE = 640;
const MOBILE_INPUT_SIZE = 320;
const MODEL_URL = "/assets/yolov8s-model.onnx";
const LABELS_URL = "/assets/labels.txt";

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

function calculateIoU(boxA, boxB) {
  const x1 = Math.max(boxA.x_min, boxB.x_min);
  const y1 = Math.max(boxA.y_min, boxB.y_min);
  const x2 = Math.min(boxA.x_max, boxB.x_max);
  const y2 = Math.min(boxA.y_max, boxB.y_max);
  
  const interArea = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const boxAArea = (boxA.x_max - boxA.x_min) * (boxA.y_max - boxA.y_min);
  const boxBArea = (boxB.x_max - boxB.x_min) * (boxB.y_max - boxB.y_min);
  
  if (boxAArea + boxBArea - interArea === 0) return 0;
  return interArea / (boxAArea + boxBArea - interArea);
}

function nms(detections, iouThreshold = 0.5) {
  if (detections.length === 0) return [];
  
  const sorted = detections.sort((a, b) => b.confidence - a.confidence);
  const picked = [];
  
  while (sorted.length > 0) {
    const current = sorted.shift();
    picked.push(current);
    
    for (let i = sorted.length - 1; i >= 0; i--) {
      const iou = calculateIoU(current.bbox, sorted[i].bbox);
      if (iou > iouThreshold) {
        sorted.splice(i, 1);
      }
    }
  }
  
  return picked;
}

const IngredientScanner = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const ingredientsListRef = useRef(null);
  const detectionTimeoutRef = useRef(null);
  
  const lastInferenceTime = useRef(0);
  const processingRef = useRef(false);
  const offscreenCanvas = useRef(null);
  const offscreenCtx = useRef(null);
  const animationFrameRef = useRef(null);
  
  const adaptiveThrottleRef = useRef(isMobile ? 1000 : 500);
  const performanceMetricsRef = useRef({ count: 0, totalTime: 0 });
  
  const [cameraState, setCameraState] = useState('not-started');
  const [isScanning, setIsScanning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [scannedIngredients, setScannedIngredients] = useState([]);
  const [newIngredient, setNewIngredient] = useState('');
  const newIngredientRef = useRef(null);

  const [session, setSession] = useState(null);
  const [labels, setLabels] = useState([]);
  const [modelError, setModelError] = useState(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [detections, setDetections] = useState([]);

  const [scanningDetections, setScanningDetections] = useState([]);
  const [showScanningBounds, setShowScanningBounds] = useState(false);

  // Handle back button click
  const handleGoBack = () => {
    // You can customize this based on your routing needs
    window.history.back();
    // Or use Next.js router:
    // import { useRouter } from 'next/navigation';
    // const router = useRouter();
    // router.back();
  };

  useEffect(() => {
    const inputSize = isMobile ? MOBILE_INPUT_SIZE : INPUT_SIZE;
    
    if (typeof OffscreenCanvas !== 'undefined') {
      offscreenCanvas.current = new OffscreenCanvas(inputSize, inputSize);
      offscreenCtx.current = offscreenCanvas.current.getContext('2d', {
        willReadFrequently: true,
        alpha: false
      });
    } else {
      offscreenCanvas.current = document.createElement('canvas');
      offscreenCanvas.current.width = inputSize;
      offscreenCanvas.current.height = inputSize;
      offscreenCtx.current = offscreenCanvas.current.getContext('2d', {
        willReadFrequently: true,
        alpha: false
      });
    }
  }, []);

  const startCamera = useCallback(async () => {
    setCameraState('loading');
    try {
      const constraints = {
        video: { 
          facingMode: 'environment',
          width: { ideal: isMobile ? 640 : 1280 },
          height: { ideal: isMobile ? 480 : 720 }
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraState('available');
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setCameraState('denied');
    }
  }, []);

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(imageDataUrl);
    }
  };

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageDataUrl = e.target.result;
        setCapturedImage(imageDataUrl);
        
        setIsScanning(true);
        try {
          const detections = await runDetectionHighQuality(imageDataUrl);
          
          const ingredients = detections.map((det, idx) => ({
            id: idx + 1,
            name: capitalizeWords(det.name),
            selected: true,
            confidence: det.confidence
          }));
          
          setScannedIngredients(ingredients);
        } catch (error) {
          console.error('Error processing uploaded image:', error);
          setScannedIngredients([]);
        } finally {
          setIsScanning(false);
        }
        
        setShowModal(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScan = async () => {
    setIsScanning(true);
    setScanningDetections([]);
    setShowScanningBounds(false);
    captureImage();

    setTimeout(async () => {
      if (canvasRef.current) {
        const imageDataUrl = canvasRef.current.toDataURL('image/jpeg', 0.9);
        
        setShowScanningBounds(true);
        
        const detections = await runDetectionWithProgress(imageDataUrl);
        
        const ingredients = detections.map((det, idx) => ({
          id: idx + 1,
          name: capitalizeWords(det.name),
          selected: true,
          confidence: det.confidence
        }));
        
        setScannedIngredients(ingredients);
        
        setTimeout(() => {
          setShowScanningBounds(false);
          setScanningDetections([]);
          setIsScanning(false);
          setShowModal(true);
        }, 500);
      }
    }, 800);
  };

  const capitalizeWords = (str) => {
    return str.replace(/\b\w/g, l => l.toUpperCase());
  };

  const toggleIngredientSelection = (id) => {
    setScannedIngredients(prev => 
      prev.map(ingredient => 
        ingredient.id === id 
          ? { ...ingredient, selected: !ingredient.selected }
          : ingredient
      )
    );
  };

  const deleteIngredient = (id) => {
    setScannedIngredients(prev => 
      prev.filter(ingredient => ingredient.id !== id)
    );
  };

  const addIngredient = () => {
    if (newIngredient.trim()) {
      const newId = Math.max(...scannedIngredients.map(i => i.id), 0) + 1;
      setScannedIngredients(prev => [
        ...prev,
        { id: newId, name: newIngredient.trim(), selected: true }
      ]);
      setNewIngredient('');

      setTimeout(() => {
        if (newIngredientRef.current) {
          newIngredientRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 0);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setCapturedImage(null);
  };

  const closeHelpModal = () => {
    setShowHelpModal(false);
  };

  const generateRecipe = () => {
    const selectedIngredients = scannedIngredients.filter(i => i.selected);
    
    const ingredientNames = selectedIngredients.map(ingredient => ingredient.name);
    const params = new URLSearchParams();
    params.set('ingredients', ingredientNames.join(','));
    
    window.location.href = `/user/recipe?${params.toString()}`;
  };

  const getSelectedCount = () => {
    return scannedIngredients.filter(i => i.selected).length;
  };

  useEffect(() => {
    const loadModel = async () => {
      setIsModelLoading(true);
      setModelError(null);
      
      try {
        ort.env.wasm.wasmPaths = '/assets/';
        
        if (isMobile) {
          ort.env.wasm.numThreads = 2;
          ort.env.wasm.simd = true;
        }
        
        const sessionOptions = {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
          enableCpuMemArena: true,
          enableMemPattern: true,
          executionMode: 'sequential'
        };
        
        const inferenceSession = await ort.InferenceSession.create(MODEL_URL, sessionOptions);
        setSession(inferenceSession);
        console.log('Model loaded successfully', isMobile ? '(Mobile optimized)' : '');
      } catch (error) {
        console.error('Error loading model:', error);
        setModelError(`Model load error: ${error.message}`);
      } finally {
        setIsModelLoading(false);
      }
    };

    loadModel();
  }, []);

  useEffect(() => {
    const loadLabels = async () => {
      try {
        const response = await fetch(LABELS_URL);
        if (!response.ok) {
          throw new Error(`Failed to fetch labels: ${response.statusText}`);
        }
        const text = await response.text();
        const labelLines = text.split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
        
        setLabels(labelLines);
        console.log('Labels loaded:', labelLines.length, 'classes');
      } catch (error) {
        console.error('Error loading labels:', error);
        setModelError(`Labels load error: ${error.message}`);
      }
    };

    loadLabels();
  }, []);

  function preprocessImageOptimized(canvas) {
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const imageData = ctx.getImageData(0, 0, size, size);
    const { data } = imageData;
    const input = new Float32Array(3 * size * size);
    
    const pixelCount = size * size;
    
    let pixelIndex = 0;
    let rIndex = 0;
    let gIndex = pixelCount;
    let bIndex = 2 * pixelCount;
    
    for (let i = 0; i < pixelCount; i++) {
      input[rIndex++] = data[pixelIndex++] * 0.00392156862745098;
      input[gIndex++] = data[pixelIndex++] * 0.00392156862745098;
      input[bIndex++] = data[pixelIndex++] * 0.00392156862745098;
      pixelIndex++;
    }
    
    return input;
  }

  function preprocessImage(imageData) {
    const { data, width, height } = imageData;
    const input = new Float32Array(1 * 3 * INPUT_SIZE * INPUT_SIZE);
    
    for (let y = 0; y < INPUT_SIZE; y++) {
      for (let x = 0; x < INPUT_SIZE; x++) {
        const idx = (y * INPUT_SIZE + x) * 4;
        const outIdx = y * INPUT_SIZE + x;
        
        input[outIdx] = data[idx] / 255.0;
        input[INPUT_SIZE * INPUT_SIZE + outIdx] = data[idx + 1] / 255.0;
        input[2 * INPUT_SIZE * INPUT_SIZE + outIdx] = data[idx + 2] / 255.0;
      }
    }
    return input;
  }

  function parseDetectionsOptimized(results, labels, confidenceThreshold = 0.75) {
    if (!results || !session?.outputNames?.length) return [];

    const outputName = session.outputNames[0];
    const output = results[outputName];
    
    if (!output?.data) return [];

    const outputData = output.data;
    const numDetections = 8400;
    const numClasses = labels.length;
    const detections = [];
    
    const step = isMobile ? 2 : 1;
    const mobileConfidenceThreshold = isMobile ? 0.85 : confidenceThreshold;

    for (let i = 0; i < numDetections; i += step) {
      const centerX = outputData[i];
      const centerY = outputData[numDetections + i];
      const width = outputData[2 * numDetections + i];
      const height = outputData[3 * numDetections + i];

      if (centerX < 0 || centerX > INPUT_SIZE || centerY < 0 || centerY > INPUT_SIZE) {
        continue;
      }

      let maxScore = 0;
      let classIndex = -1;
      
      for (let j = 0; j < numClasses; j++) {
        const score = outputData[(4 + j) * numDetections + i];
        if (score > maxScore) {
          maxScore = score;
          classIndex = j;
        }
      }

      if (maxScore < mobileConfidenceThreshold) continue;

      const x_min = Math.max(0, (centerX - width / 2) / INPUT_SIZE);
      const y_min = Math.max(0, (centerY - height / 2) / INPUT_SIZE);
      const x_max = Math.min(1, (centerX + width / 2) / INPUT_SIZE);
      const y_max = Math.min(1, (centerY + height / 2) / INPUT_SIZE);

      const minSize = isMobile ? 0.03 : 0.02;
      if (x_max > x_min && y_max > y_min && (x_max - x_min) > minSize && (y_max - y_min) > minSize) {
        detections.push({
          name: labels[classIndex],
          confidence: maxScore,
          bbox: { x_min, y_min, x_max, y_max }
        });
      }
      
      if (isMobile && detections.length >= 5) break;
    }

    return detections;
  }

  function parseDetections(results, labels) {
    if (!results || !session || !session.outputNames || session.outputNames.length === 0) {
      console.error('Invalid results or session');
      return [];
    }

    const outputName = session.outputNames[0];
    const output = results[outputName];
    
    if (!output || !output.data) {
      console.error('No output data found');
      return [];
    }

    const outputData = Array.from(output.data);
    const detections = [];
    
    const numDetections = 8400;
    const numClasses = labels.length;
    const outputSize = 4 + numClasses;

    for (let i = 0; i < numDetections; i++) {
      const centerX = outputData[i];
      const centerY = outputData[numDetections + i];
      const width = outputData[2 * numDetections + i];
      const height = outputData[3 * numDetections + i];

      const classScores = [];
      for (let j = 0; j < numClasses; j++) {
        classScores.push(outputData[(4 + j) * numDetections + i]);
      }

      const maxScore = Math.max(...classScores);
      const classIndex = classScores.indexOf(maxScore);
      
      if (maxScore > 0.4 && classIndex < labels.length) {
        const x_min = Math.max(0, (centerX - width / 2) / INPUT_SIZE);
        const y_min = Math.max(0, (centerY - height / 2) / INPUT_SIZE);
        const x_max = Math.min(1, (centerX + width / 2) / INPUT_SIZE);
        const y_max = Math.min(1, (centerY + height / 2) / INPUT_SIZE);

        if (x_max > x_min && y_max > y_min) {
          detections.push({
            name: labels[classIndex],
            confidence: maxScore,
            bbox: { x_min, y_min, x_max, y_max }
          });
        }
      }
    }

    return detections;
  }

  async function runDetectionHighQuality(imageDataUrl) {
    if (!session || !labels.length) {
      console.log('Model or labels not ready');
      return [];
    }

    try {
      const img = new window.Image();
      img.src = imageDataUrl;
      await new Promise(resolve => { img.onload = resolve; });

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = INPUT_SIZE;
      tempCanvas.height = INPUT_SIZE;
      const ctx = tempCanvas.getContext('2d');
      ctx.drawImage(img, 0, 0, INPUT_SIZE, INPUT_SIZE);

      const imageData = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
      const input = preprocessImage(imageData);
      
      const tensor = new ort.Tensor("float32", input, [1, 3, INPUT_SIZE, INPUT_SIZE]);
      
      const feeds = {};
      feeds[session.inputNames[0]] = tensor;
      const results = await session.run(feeds);

      const rawDetections = parseDetections(results, labels);
      
      const finalDetections = nms(rawDetections, 0.4);
      
      return finalDetections
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 15);

    } catch (error) {
      console.error("Detection error:", error);
      return [];
    }
  }

  async function runDetection(imageDataUrl) {
    return runDetectionHighQuality(imageDataUrl);
  }

  async function runDetectionWithProgress(imageDataUrl) {
    if (!session || !labels.length) return [];

    try {
      const img = new Image();
      img.src = imageDataUrl;
      await new Promise(resolve => { img.onload = resolve; });

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = INPUT_SIZE;
      tempCanvas.height = INPUT_SIZE;
      const ctx = tempCanvas.getContext('2d');
      ctx.drawImage(img, 0, 0, INPUT_SIZE, INPUT_SIZE);

      const imageData = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
      const input = preprocessImage(imageData);
      
      const tensor = new ort.Tensor("float32", input, [1, 3, INPUT_SIZE, INPUT_SIZE]);
      const feeds = {};
      feeds[session.inputNames[0]] = tensor;
      
      setTimeout(() => {
        if (showScanningBounds) {
          setScanningDetections([
            { bbox: { x_min: 0.2, y_min: 0.2, x_max: 0.4, y_max: 0.4 }, name: 'Analyzing...', confidence: 0.8 },
            { bbox: { x_min: 0.6, y_min: 0.3, x_max: 0.8, y_max: 0.5 }, name: 'Processing...', confidence: 0.7 }
          ]);
        }
      }, 300);

      const results = await session.run(feeds);
      const rawDetections = parseDetections(results, labels);
      const finalDetections = nms(rawDetections, 0.4);
      
      const topDetections = finalDetections
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 15);

      if (showScanningBounds) {
        setScanningDetections(topDetections);
      }

      return topDetections;

    } catch (error) {
      console.error("Detection error:", error);
      return [];
    }
  }

  useEffect(() => {
    let isProcessing = false;
    const inputSize = isMobile ? MOBILE_INPUT_SIZE : INPUT_SIZE;
    
    const runRealtimeDetection = async () => {
      if (isProcessing || !session || !labels.length || cameraState !== 'available' || showModal) {
        animationFrameRef.current = requestAnimationFrame(runRealtimeDetection);
        return;
      }

      const now = performance.now();
      
      if (now - lastInferenceTime.current < adaptiveThrottleRef.current) {
        animationFrameRef.current = requestAnimationFrame(runRealtimeDetection);
        return;
      }

      isProcessing = true;
      const inferenceStart = performance.now();

      try {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          animationFrameRef.current = requestAnimationFrame(runRealtimeDetection);
          isProcessing = false;
          return;
        }

        const canvas = offscreenCanvas.current;
        const ctx = offscreenCtx.current;
        
        if (!canvas || !ctx) {
          animationFrameRef.current = requestAnimationFrame(runRealtimeDetection);
          isProcessing = false;
          return;
        }

        ctx.drawImage(videoRef.current, 0, 0, inputSize, inputSize);
        
        const input = preprocessImageOptimized(canvas);
        
        const tensor = new ort.Tensor("float32", input, [1, 3, inputSize, inputSize]);
        const feeds = { [session.inputNames[0]]: tensor };
        
        const results = await session.run(feeds);
        
        const confidenceThreshold = isMobile ? 0.85 : 0.8;
        const rawDetections = parseDetectionsOptimized(results, labels, confidenceThreshold);
        
        const nmsThreshold = isMobile ? 0.7 : 0.6;
        const finalDetections = nms(rawDetections, nmsThreshold);
        
        const maxDetections = isMobile ? 2 : 3;
        const topDetections = finalDetections
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, maxDetections);
        
        setDetections(topDetections);
        
        if (detectionTimeoutRef.current) {
          clearTimeout(detectionTimeoutRef.current);
        }
        
        detectionTimeoutRef.current = setTimeout(() => {
          setDetections([]);
        }, isMobile ? 2000 : 1500);
        
        const inferenceTime = performance.now() - inferenceStart;
        performanceMetricsRef.current.count++;
        performanceMetricsRef.current.totalTime += inferenceTime;
        
        if (performanceMetricsRef.current.count >= 5) {
          const avgTime = performanceMetricsRef.current.totalTime / performanceMetricsRef.current.count;
          
          if (avgTime > 800) {
            adaptiveThrottleRef.current = Math.min(2000, adaptiveThrottleRef.current + 200);
          } else if (avgTime < 400) {
            adaptiveThrottleRef.current = Math.max(isMobile ? 500 : 300, adaptiveThrottleRef.current - 100);
          }
          
          performanceMetricsRef.current = { count: 0, totalTime: 0 };
          console.log(`Adaptive throttle: ${adaptiveThrottleRef.current}ms, Avg inference: ${avgTime.toFixed(0)}ms`);
        }
        
        lastInferenceTime.current = now;
        
      } catch (error) {
        console.error("Real-time detection error:", error);
        adaptiveThrottleRef.current = Math.min(2000, adaptiveThrottleRef.current + 300);
      } finally {
        isProcessing = false;
      }

      animationFrameRef.current = requestAnimationFrame(runRealtimeDetection);
    };

    animationFrameRef.current = requestAnimationFrame(runRealtimeDetection);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (detectionTimeoutRef.current) {
        clearTimeout(detectionTimeoutRef.current);
      }
    };
  }, [session, labels, cameraState, showModal]);

  useEffect(() => {
    startCamera();
  }, [startCamera]);

  useEffect(() => {
    if (showModal || cameraState !== 'available') {
      setDetections([]);
    }
  }, [showModal, cameraState]);

  return (
    <div className="app-container">
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
      />

      <div className="header">
        <div className="header-left">
          <button className="back-button" onClick={handleGoBack}>
            <FontAwesomeIcon icon={faArrowLeft} className="icon" />
          </button>
        </div>
        
        <h1 className="title">Ingredient Scanner</h1>
        
        <div className="header-right">
          <button className="help-button" onClick={() => setShowHelpModal(true)}>
            <FontAwesomeIcon icon={faQuestionCircle} className="icon" />
          </button>
        </div>
      </div>

      <div className="camera-feed" style={{ position: 'relative' }}>
        <video ref={videoRef} autoPlay playsInline />
        
        {isScanning && (
          <div className="scanning-overlay">
            <div className="scanning-content">
              <div className="spinner"></div>
              <p className="scanning-text">Analyzing ingredients...</p>
            </div>
          </div>
        )}

        {cameraState === 'loading' && (
          <div className="no-camera-overlay">
            <div className="no-camera-content">
              <div className="spinner"></div>
              <p>Loading camera...</p>
            </div>
          </div>
        )}
        {cameraState === 'denied' && (
          <div className="no-camera-overlay denied">
            <div className="no-camera-content">
              <FontAwesomeIcon icon={faExclamationTriangle} className="warning-icon" />
              <h2>Camera Access Denied</h2>
              <p className="camera-subtitle">
                Please enable camera permissions in your browser or device settings to scan ingredients.
                Alternatively, upload an image using the button below.
              </p>
              <p className="camera-instructions">
                <strong>How to enable:</strong><br />
                - On Chrome: Click the lock icon in the address bar, select "Permissions," and allow Camera.<br />
                - On iOS: Go to Settings {'>'} Safari {'>'} Camera and select "Allow."<br />
                - On Android: Go to Settings {'>'} Apps {'>'} Browser {'>'} Permissions and enable Camera.
              </p>
              <div className="camera-denied-actions">
                <button onClick={startCamera} className="retry-camera-btn">
                  Try Again
                </button>
                <button onClick={handleImageUpload} className="upload-fallback-btn">
                  Upload Image
                </button>
              </div>
            </div>
          </div>
        )}
        {cameraState === 'not-started' && (
          <div className="no-camera-overlay">
            <div className="no-camera-content">
              <div className="camera-emoji">📷</div>
              <p>Camera starting...</p>
            </div>
          </div>
        )}

        {cameraState === 'available' && detections.length > 0 && !showModal && (
          <div 
            className="detection-overlay" 
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%', 
              pointerEvents: 'none',
              zIndex: 10
            }}
          >
            {detections.map((det, idx) => {
              const left = `${det.bbox.x_min * 100}%`;
              const top = `${det.bbox.y_min * 100}%`;
              const width = `${(det.bbox.x_max - det.bbox.x_min) * 100}%`;
              const height = `${(det.bbox.y_max - det.bbox.y_min) * 100}%`;
              
              return (
                <div
                  key={`${det.name}-${idx}`}
                  style={{
                    position: 'absolute',
                    left,
                    top,
                    width,
                    height,
                    border: '3px solid #4CAF50',
                    borderRadius: '8px',
                    boxSizing: 'border-box',
                    backgroundColor: 'rgba(76, 175, 80, 0.15)',
                    boxShadow: '0 0 15px rgba(76, 175, 80, 0.4)'
                  }}
                >
                  <span
                    style={{
                      background: 'rgba(76, 175, 80, 0.95)',
                      color: '#fff',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      position: 'absolute',
                      top: '-2em',
                      left: 0,
                      whiteSpace: 'nowrap',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {capitalizeWords(det.name)} ({(det.confidence * 100).toFixed(0)}%)
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {isScanning && showScanningBounds && scanningDetections.length > 0 && (
          <div 
            className="scanning-detection-overlay" 
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%', 
              pointerEvents: 'none',
              zIndex: 12
            }}
          >
            {scanningDetections.map((det, idx) => {
              const left = `${det.bbox.x_min * 100}%`;
              const top = `${det.bbox.y_min * 100}%`;
              const width = `${(det.bbox.x_max - det.bbox.x_min) * 100}%`;
              const height = `${(det.bbox.y_max - det.bbox.y_min) * 100}%`;
              
              return (
                <div
                  key={`scanning-${det.name}-${idx}`}
                  style={{
                    position: 'absolute',
                    left,
                    top,
                    width,
                    height,
                    border: '3px solid #FF9800',
                    borderRadius: '8px',
                    boxSizing: 'border-box',
                    backgroundColor: 'rgba(255, 152, 0, 0.2)',
                    boxShadow: '0 0 20px rgba(255, 152, 0, 0.6)'
                  }}
                >
                  <span
                    style={{
                      background: 'rgba(255, 152, 0, 0.95)',
                      color: '#fff',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      position: 'absolute',
                      top: '-2em',
                      left: 0,
                      whiteSpace: 'nowrap',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {capitalizeWords(det.name)} 
                    {det.confidence && det.confidence < 1 && ` (${(det.confidence * 100).toFixed(0)}%)`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bottom-controls">
        <div className="controls-container">
          <button 
            onClick={handleScan}
            disabled={isScanning || cameraState !== 'available' || isModelLoading}
            className={`scan-button ${isScanning || cameraState !== 'available' || isModelLoading ? 'disabled' : ''}`}
          >
            <FontAwesomeIcon icon={faSearch} className="scan-icon" />
            <span>
              {isModelLoading ? 'Loading Model...' :
               cameraState === 'available' ? 'Scan Ingredient' : 
               cameraState === 'loading' ? 'Camera Loading...' :
               cameraState === 'denied' ? 'Enable Camera' : 'Start Camera'}
            </span>
          </button>
          <button 
            onClick={handleImageUpload}
            disabled={isScanning || isModelLoading}
            className={`upload-button ${isScanning || isModelLoading ? 'disabled' : ''}`}
          >
            <FontAwesomeIcon icon={faUpload} className="upload-icon" />
          </button>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>Detected Ingredients</h2>
              <button className="close-button" onClick={closeModal}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            
            <div className="modal-content">
              <div className="image-section">
                <div className="image-container">
                  {capturedImage ? (
                    <img src={capturedImage} alt="Captured ingredients" />
                  ) : (
                    <div className="no-image">
                      <p>No image captured</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="ingredients-section">
                <div className="ingredients-header">
                  <h3>Select ingredients</h3>
                  <span className="ingredients-count">{getSelectedCount()} ingredients</span>
                </div>

                <div className="ingredients-list" ref={ingredientsListRef}>
                  {scannedIngredients.length === 0 ? (
                    <div className="no-ingredients">
                      <p>No ingredients detected. Try scanning again or add ingredients manually.</p>
                    </div>
                  ) : (
                    scannedIngredients.map(ingredient => (
                      <div 
                        key={ingredient.id} 
                        className="ingredient-item"
                        ref={ingredient.id === Math.max(...scannedIngredients.map(i => i.id), 0) ? newIngredientRef : null}
                      >
                        <div className="ingredient-content">
                          <div className="ingredient-info">
                            <span className="ingredient-name">{ingredient.name}</span>
                            {ingredient.confidence && (
                              <span className="ingredient-subtitle">
                                Confidence: {(ingredient.confidence * 100).toFixed(1)}%
                              </span>
                            )}
                          </div>
                          <div className="ingredient-actions">
                            <button 
                              className={`select-button ${ingredient.selected ? 'selected' : ''}`}
                              onClick={() => toggleIngredientSelection(ingredient.id)}
                            >
                              {ingredient.selected && <FontAwesomeIcon icon={faCheck} />}
                            </button>
                            <button 
                              className="delete-button"
                              onClick={() => deleteIngredient(ingredient.id)}
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="add-ingredient-section">
                  <div className="add-ingredient-input">
                    <input
                      type="text"
                      placeholder="Add new ingredient..."
                      value={newIngredient}
                      onChange={(e) => setNewIngredient(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addIngredient()}
                    />
                    <button onClick={addIngredient} className="add-button">
                      <FontAwesomeIcon icon={faPlus} />
                      <span>Add ingredient</span>
                    </button>
                  </div>
                </div>

                <button 
                  onClick={generateRecipe} 
                  className="generate-recipe-button"
                  disabled={getSelectedCount() === 0}
                >
                  Generate Recipe ({getSelectedCount()} ingredients)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHelpModal && (
        <div className="help-modal-overlay">
          <div className="help-modal-container">
            <div className="help-modal-header">
              <h1 className="help-modal-title">Ingredient Scanner Help</h1>
              <button className="help-close-button" onClick={closeHelpModal}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            
            <div className="help-modal-content">
              <div className="help-section">
                <h2 className="help-section-title">How to Use the Ingredient Scanner</h2>
                <ul className="help-steps">
                  <li className="help-step">
                    <div className="help-step-number">1</div>
                    <p className="help-step-text">Point the camera at your ingredients with good lighting.</p>
                  </li>
                  <li className="help-step">
                    <div className="help-step-number">2</div>
                    <p className="help-step-text">Keep ingredients separated and visible.</p>
                  </li>
                  <li className="help-step">
                    <div className="help-step-number">3</div>
                    <p className="help-step-text">Press "Scan Ingredient" to capture and analyze the image.</p>
                  </li>
                  <li className="help-step">
                    <div className="help-step-number">4</div>
                    <p className="help-step-text">Review detected ingredients and adjust selections as needed.</p>
                  </li>
                  <li className="help-step">
                    <div className="help-step-number">5</div>
                    <p className="help-step-text">Add any missed ingredients manually.</p>
                  </li>
                  <li className="help-step">
                    <div className="help-step-number">6</div>
                    <p className="help-step-text">Click "Generate Recipe" to proceed with selected ingredients.</p>
                  </li>
                </ul>
              </div>

              <div className="help-section">
                <h2 className="help-section-title">Tips for Better Detection</h2>
                <ul className="help-steps">
                  <li className="help-step">
                    <div className="help-step-number">1</div>
                    <p className="help-step-text">Use bright, even lighting for best results.</p>
                  </li>
                  <li className="help-step">
                    <div className="help-step-number">2</div>
                    <p className="help-step-text">Place ingredients on a plain, contrasting background.</p>
                  </li>
                  <li className="help-step">
                    <div className="help-step-number">3</div>
                    <p className="help-step-text">Keep ingredients separated and fully visible.</p>
                  </li>
                  <li className="help-step">
                    <div className="help-step-number">4</div>
                    <p className="help-step-text">Hold the camera steady during scanning.</p>
                  </li>
                  <li className="help-step">
                    <div className="help-step-number">5</div>
                    <p className="help-step-text">For small items, move the camera closer.</p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModelLoading && (
        <div style={{ 
          position: 'fixed', 
          bottom: '20px', 
          left: '50%', 
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.8)', 
          color: '#fff', 
          padding: '10px 20px', 
          borderRadius: '20px',
          fontSize: '0.9rem',
          zIndex: 1000
        }}>
          Loading AI model{isMobile ? ' (Mobile optimized)' : ''}...
        </div>
      )}
      {modelError && (
        <div style={{ 
          position: 'fixed', 
          bottom: '20px', 
          left: '50%', 
          transform: 'translateX(-50%)',
          background: 'rgba(231, 76, 60, 0.9)', 
          color: '#fff', 
          padding: '10px 20px', 
          borderRadius: '20px',
          fontSize: '0.9rem',
          zIndex: 1000
        }}>
          Model Error: {modelError}
        </div>
      )}
    </div>
  );
};

export default IngredientScanner;