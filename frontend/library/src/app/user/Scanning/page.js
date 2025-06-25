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
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import * as ort from 'onnxruntime-web';
import './style.css';

const INPUT_SIZE = 640;
const MODEL_URL = "/assets/yolov8s-model.onnx";
const LABELS_URL = "/assets/labels.txt";

// Improved NMS function
function nms(detections, iouThreshold = 0.5) {
  if (detections.length === 0) return [];
  
  // Sort by confidence score in descending order
  const sorted = detections.sort((a, b) => b.confidence - a.confidence);
  const picked = [];
  
  while (sorted.length > 0) {
    const current = sorted.shift();
    picked.push(current);
    
    // Remove overlapping boxes
    for (let i = sorted.length - 1; i >= 0; i--) {
      const iou = calculateIoU(current.bbox, sorted[i].bbox);
      if (iou > iouThreshold) {
        sorted.splice(i, 1);
      }
    }
  }
  
  return picked;
}

// Calculate Intersection over Union
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

// Filter detections to only include food items
function filterFoodItems(detections, labels) {
  const foodKeywords = [
    'apple', 'banana', 'orange', 'lemon', 'lime', 'grape', 'strawberry', 'cherry',
    'tomato', 'potato', 'carrot', 'onion', 'garlic', 'pepper', 'cucumber', 'lettuce',
    'cabbage', 'broccoli', 'spinach', 'mushroom', 'corn', 'peas', 'bean', 'avocado',
    'egg', 'milk', 'cheese', 'bread', 'meat', 'chicken', 'fish', 'rice', 'pasta',
    'flour', 'sugar', 'salt', 'oil', 'butter', 'yogurt', 'cereal', 'nuts', 'seeds'
  ];
  
  return detections.filter(detection => {
    const name = detection.name.toLowerCase();
    return foodKeywords.some(keyword => 
      name.includes(keyword) || keyword.includes(name)
    );
  });
}

const IngredientScanner = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const ingredientsListRef = useRef(null);
  const detectionTimeoutRef = useRef(null);
  
  const [cameraState, setCameraState] = useState('not-started');
  const [isScanning, setIsScanning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [scannedIngredients, setScannedIngredients] = useState([]);
  const [newIngredient, setNewIngredient] = useState('');
  const newIngredientRef = useRef(null);

  // ONNX model and labels state
  const [session, setSession] = useState(null);
  const [labels, setLabels] = useState([]);
  const [modelError, setModelError] = useState(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [detections, setDetections] = useState([]);

  const startCamera = useCallback(async () => {
    setCameraState('loading');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
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

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target.result);
        setShowModal(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScan = async () => {
    setIsScanning(true);
    captureImage();

    setTimeout(async () => {
      if (canvasRef.current) {
        const imageDataUrl = canvasRef.current.toDataURL('image/jpeg', 0.9);
        const detections = await runDetection(imageDataUrl);
        
        // Convert detections to ingredients format
        const ingredients = detections.map((det, idx) => ({
          id: idx + 1,
          name: capitalizeWords(det.name),
          selected: true,
          confidence: det.confidence
        }));
        
        setScannedIngredients(ingredients);
      }
      setIsScanning(false);
      setShowModal(true);
    }, 1500);
  };

  // Utility function to capitalize words
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
    console.log('Generating recipe with:', selectedIngredients);
  };

  const getSelectedCount = () => {
    return scannedIngredients.filter(i => i.selected).length;
  };

  // Load ONNX model
  useEffect(() => {
    setIsModelLoading(true);
    setModelError(null);
    ort.env.wasm.wasmPaths = '/assets/';
    ort.InferenceSession.create(MODEL_URL)
      .then(setSession)
      .catch(e => setModelError("Model load error: " + e.message))
      .finally(() => setIsModelLoading(false));
  }, []);

  // Load labels.txt
  useEffect(() => {
    fetch(LABELS_URL)
      .then(res => res.text())
      .then(text => setLabels(text.split('\n').map(l => l.replace(/^\d+\s+/, '').trim()).filter(Boolean)))
      .catch(e => console.error("Error loading labels:", e));
  }, []);

  // FIXED: Single real-time detection with better logic
  useEffect(() => {
    let interval;
    
    if (session && labels.length && cameraState === 'available' && !showModal) {
      interval = setInterval(async () => {
        if (!videoRef.current || !canvasRef.current) return;
        
        try {
          const canvas = canvasRef.current;
          const video = videoRef.current;
          const ctx = canvas.getContext("2d");
          
          // Set canvas size to match input size
          canvas.width = INPUT_SIZE;
          canvas.height = INPUT_SIZE;
          ctx.drawImage(video, 0, 0, INPUT_SIZE, INPUT_SIZE);
          
          const imageData = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
          const input = preprocessImage(imageData);
          
          const tensor = new ort.Tensor("float32", input, [1, 3, INPUT_SIZE, INPUT_SIZE]);
          const feeds = {};
          feeds[session.inputNames[0]] = tensor;
          const results = await session.run(feeds);
          
          const rawDetections = parseDetections(results, labels);
          const filteredDetections = filterFoodItems(rawDetections, labels);
          const finalDetections = nms(filteredDetections, 0.6); // Higher NMS threshold
          
          // Only keep top 3 most confident detections and filter by higher confidence
          const topDetections = finalDetections
            .filter(det => det.confidence > 0.9) // Higher confidence threshold
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 3); // Limit to max 3 detections
          
          setDetections(topDetections);
          
          // Clear detections after 3 seconds if no new high-confidence detections
          if (detectionTimeoutRef.current) {
            clearTimeout(detectionTimeoutRef.current);
          }
          
          detectionTimeoutRef.current = setTimeout(() => {
            setDetections([]);
          }, 3000);
          
        } catch (error) {
          console.error("Real-time detection error:", error);
        }
      }, 2500); // Slower detection rate
    }
    
    return () => {
      if (interval) clearInterval(interval);
      if (detectionTimeoutRef.current) {
        clearTimeout(detectionTimeoutRef.current);
      }
    };
  }, [session, labels, cameraState, showModal]);

  // Improved image preprocessing
  function preprocessImage(imageData) {
    const { data } = imageData;
    const input = new Float32Array(1 * 3 * INPUT_SIZE * INPUT_SIZE);
    
    for (let y = 0; y < INPUT_SIZE; y++) {
      for (let x = 0; x < INPUT_SIZE; x++) {
        const idx = (y * INPUT_SIZE + x) * 4;
        const outIdx = y * INPUT_SIZE + x;
        // Normalize to [0, 1] range
        input[outIdx] = data[idx] / 255.0; // R
        input[INPUT_SIZE * INPUT_SIZE + outIdx] = data[idx + 1] / 255.0; // G
        input[2 * INPUT_SIZE * INPUT_SIZE + outIdx] = data[idx + 2] / 255.0; // B
      }
    }
    return input;
  }

  // Improved detection parsing with stricter filtering
  function parseDetections(results, labels) {
    const outputArr = Array.from(results[session.outputNames[0]].data);
    const numClasses = labels.length;
    const numDetections = outputArr.length / (5 + numClasses);
    const detections = [];
    
    for (let i = 0; i < numDetections; i++) {
      const offset = i * (5 + numClasses);
      const [x, y, w, h, objConf, ...classScores] = outputArr.slice(offset, offset + 5 + numClasses);

      const maxScore = Math.max(...classScores);
      const classIdx = classScores.indexOf(maxScore);
      const confidence = objConf * maxScore;

      // Stricter filtering criteria
      const relW = w / INPUT_SIZE;
      const relH = h / INPUT_SIZE;
      const aspect = relW / relH;
      const area = relW * relH;
      
      if (
        confidence > 0.92 && // Much higher confidence threshold
        relW > 0.1 && relH > 0.1 && // Larger minimum size
        relW < 0.7 && relH < 0.7 &&   // Smaller maximum size
        aspect > 0.4 && aspect < 2.5 && // More reasonable aspect ratios
        area > 0.02 && area < 0.4 && // Area constraints
        classIdx < labels.length
      ) {
        detections.push({
          name: labels[classIdx],
          confidence,
          bbox: {
            x_min: Math.max(0, (x - w / 2) / INPUT_SIZE),
            y_min: Math.max(0, (y - h / 2) / INPUT_SIZE),
            x_max: Math.min(1, (x + w / 2) / INPUT_SIZE),
            y_max: Math.min(1, (y + h / 2) / INPUT_SIZE),
          }
        });
      }
    }
    
    return detections;
  }

  async function runDetection(imageDataUrl) {
    if (!session || !labels.length) return [];

    try {
      const img = new window.Image();
      img.src = imageDataUrl;
      await new Promise(res => { img.onload = res; });

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
      const filteredDetections = filterFoodItems(rawDetections, labels);
      const finalDetections = nms(filteredDetections, 0.4);
      
      // Return top 8 most confident detections for manual scanning
      return finalDetections
        .filter(det => det.confidence > 0.85) // Lower threshold for manual scan
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 8);
    } catch (error) {
      console.error("Detection error:", error);
      return [];
    }
  }

  // Start camera on mount
  useEffect(() => {
    startCamera();
  }, [startCamera]);

  // Clear detections when modal opens or camera state changes
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

        {/* Fixed real-time detection overlay */}
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
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    animation: 'fadeIn 0.3s ease-in-out'
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
      </div>

      <div className="bottom-controls">
        <div className="controls-container">
          <button 
            onClick={handleScan}
            disabled={isScanning || cameraState !== 'available'}
            className={`scan-button ${isScanning || cameraState !== 'available' ? 'disabled' : ''}`}
          >
            <FontAwesomeIcon icon={faSearch} className="scan-icon" />
            <span>
              {cameraState === 'available' ? 'Scan Ingredient' : 
               cameraState === 'loading' ? 'Camera Loading...' :
               cameraState === 'denied' ? 'Enable Camera' : 'Start Camera'}
            </span>
          </button>
          <button 
            onClick={handleImageUpload}
            disabled={isScanning}
            className={`upload-button ${isScanning ? 'disabled' : ''}`}
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
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>Help - Ingredient Scanner</h2>
              <button className="close-button" onClick={closeHelpModal}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="modal-content" style={{ padding: '1.5rem' }}>
              <h3>How to Use the Ingredient Scanner</h3>
              <ol>
                <li>Point the camera at your ingredients with good lighting.</li>
                <li>Keep ingredients separated and visible.</li>
                <li>Press "Scan Ingredient" to capture and analyze the image.</li>
                <li>Review detected ingredients and adjust selections as needed.</li>
                <li>Add any missed ingredients manually.</li>
                <li>Click "Generate Recipe" to proceed with selected ingredients.</li>
              </ol>

              <h3>Tips for Better Detection</h3>
              <ul>
                <li>Use bright, even lighting for best results.</li>
                <li>Place ingredients on a plain, contrasting background.</li>
                <li>Keep ingredients separated and fully visible.</li>
                <li>Hold the camera steady during scanning.</li>
                <li>For small items, move the camera closer.</li>
              </ul>

              <h3>Troubleshooting</h3>
              <ul>
                <li>If detection is inaccurate, try different lighting or angles.</li>
                <li>Manually add or remove ingredients as needed.</li>
                <li>For best results, scan 3-5 ingredients at a time.</li>
                <li>Restart the app if performance issues occur.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {isModelLoading && (
        <div style={{ color: '#666', textAlign: 'center', margin: '1rem', fontSize: '0.9rem' }}>
          Loading AI model for ingredient detection...
        </div>
      )}
      {modelError && (
        <div style={{ color: '#e53e3e', textAlign: 'center', margin: '1rem', fontSize: '0.9rem' }}>
          Model Error: {modelError}
        </div>
      )}
    </div>
  );
};

export default IngredientScanner;