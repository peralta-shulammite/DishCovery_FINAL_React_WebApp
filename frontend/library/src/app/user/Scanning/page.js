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

// Multiple models configuration
const MODELS = {
  yolov8s: {
    url: "/assets/yolov8s-model.onnx",
    labels: "/assets/labels.txt",
    name: "YOLOv8s General",
    description: "General ingredient detection"
  },
  custom: {
    url: "/assets/your-second-model.onnx",
    labels: "/assets/labels2.txt",
    name: "Custom Food Model",
    description: "Specialized food detection"
  }
};

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

// Non-Maximum Suppression
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
  const newIngredientRef = useRef(null);
  
  const [cameraState, setCameraState] = useState('not-started');
  const [isScanning, setIsScanning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [scannedIngredients, setScannedIngredients] = useState([]);
  const [newIngredient, setNewIngredient] = useState('');

  // Updated state for multiple models
  const [sessions, setSessions] = useState({});
  const [labelsData, setLabelsData] = useState({});
  const [currentModel, setCurrentModel] = useState('yolov8s');
  const [modelLoadingStates, setModelLoadingStates] = useState({});
  const [modelErrors, setModelErrors] = useState({});
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

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageDataUrl = e.target.result;
        setCapturedImage(imageDataUrl);
        
        // Run detection on uploaded image
        setIsScanning(true);
        try {
          const detections = await runDetection(imageDataUrl);
          
          // Convert detections to ingredients format
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
    
    // Create URL parameters with selected ingredients
    const ingredientNames = selectedIngredients.map(ingredient => ingredient.name);
    const params = new URLSearchParams();
    params.set('ingredients', ingredientNames.join(','));
    
    // Navigate to recipe page with ingredients
    window.location.href = `/user/recipe?${params.toString()}`;
  };

  const getSelectedCount = () => {
    return scannedIngredients.filter(i => i.selected).length;
  };

  // Check if any model is loading
  const isAnyModelLoading = () => {
    return Object.values(modelLoadingStates).some(loading => loading);
  };

  // Get current model data
  const getCurrentModel = () => {
    return {
      session: sessions[currentModel],
      labels: labelsData[currentModel]
    };
  };

  // Load all ONNX models
  useEffect(() => {
    const loadAllModels = async () => {
      const modelKeys = Object.keys(MODELS);
      
      // Initialize loading states
      const initialLoadingStates = {};
      modelKeys.forEach(key => {
        initialLoadingStates[key] = true;
      });
      setModelLoadingStates(initialLoadingStates);
      
      try {
        // Set WASM paths for ONNX runtime
        ort.env.wasm.wasmPaths = '/assets/';
        
        const loadedSessions = {};
        const loadedLabels = {};
        const loadedErrors = {};
        
        for (const [key, config] of Object.entries(MODELS)) {
          try {
            console.log(`Loading model: ${config.name}`);
            
            // Check if model file exists first
            const modelResponse = await fetch(config.url, { method: 'HEAD' });
            if (!modelResponse.ok) {
              throw new Error(`Model file not found: ${config.url}`);
            }
            
            // Create inference session
            const session = await ort.InferenceSession.create(config.url);
            loadedSessions[key] = session;
            
            // Load labels
            const response = await fetch(config.labels);
            if (!response.ok) {
              throw new Error(`Failed to fetch labels: ${response.statusText}`);
            }
            const text = await response.text();
            const labels = text.split('\n')
              .map(line => line.trim())
              .filter(line => line.length > 0);
            
            loadedLabels[key] = labels;
            console.log(`${config.name} loaded successfully with ${labels.length} classes`);
            
          } catch (error) {
            console.error(`Error loading model ${key}:`, error);
            loadedErrors[key] = `${config.name}: ${error.message}`;
            
            // If this is the current model and it fails, switch to a working one
            if (key === currentModel) {
              const workingModels = Object.keys(loadedSessions);
              if (workingModels.length > 0) {
                setCurrentModel(workingModels[0]);
              }
            }
          }
          
          // Update individual model loading state
          setModelLoadingStates(prev => ({ ...prev, [key]: false }));
        }
        
        setSessions(loadedSessions);
        setLabelsData(loadedLabels);
        setModelErrors(loadedErrors);
        
      } catch (error) {
        console.error('Error in loadAllModels:', error);
      }
    };

    loadAllModels();
  }, []);

  // Preprocess image for YOLOv8
  function preprocessImage(imageData) {
    const { data, width, height } = imageData;
    const input = new Float32Array(1 * 3 * INPUT_SIZE * INPUT_SIZE);
    
    for (let y = 0; y < INPUT_SIZE; y++) {
      for (let x = 0; x < INPUT_SIZE; x++) {
        const idx = (y * INPUT_SIZE + x) * 4;
        const outIdx = y * INPUT_SIZE + x;
        
        // Normalize to [0, 1] and arrange in CHW format (YOLOv8 expects CHW)
        input[outIdx] = data[idx] / 255.0; // R channel
        input[INPUT_SIZE * INPUT_SIZE + outIdx] = data[idx + 1] / 255.0; // G channel
        input[2 * INPUT_SIZE * INPUT_SIZE + outIdx] = data[idx + 2] / 255.0; // B channel
      }
    }
    return input;
  }

  // Parse YOLOv8 detection output
  function parseDetections(results, labels, session) {
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
    
    // YOLOv8 output format: [batch, 84, 8400] where 84 = 4 (bbox) + num_classes
    const numDetections = 8400;
    const numClasses = labels.length;

    for (let i = 0; i < numDetections; i++) {
      // Extract bbox coordinates (center_x, center_y, width, height)
      const centerX = outputData[i];
      const centerY = outputData[numDetections + i];
      const width = outputData[2 * numDetections + i];
      const height = outputData[3 * numDetections + i];

      // Extract class scores
      const classScores = [];
      for (let j = 0; j < numClasses; j++) {
        classScores.push(outputData[(4 + j) * numDetections + i]);
      }

      // Find the class with highest score
      const maxScore = Math.max(...classScores);
      const classIndex = classScores.indexOf(maxScore);
      
      // Apply confidence threshold
      if (maxScore > 0.5 && classIndex < labels.length) {
        // Convert center coordinates to corner coordinates
        const x_min = Math.max(0, (centerX - width / 2) / INPUT_SIZE);
        const y_min = Math.max(0, (centerY - height / 2) / INPUT_SIZE);
        const x_max = Math.min(1, (centerX + width / 2) / INPUT_SIZE);
        const y_max = Math.min(1, (centerY + height / 2) / INPUT_SIZE);

        // Validate bbox
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

  // Run detection on image using current model
  async function runDetection(imageDataUrl) {
    const { session, labels } = getCurrentModel();
    
    if (!session || !labels || !labels.length) {
      console.log('Current model not ready');
      return [];
    }

    try {
      // Create image element
      const img = new window.Image();
      img.src = imageDataUrl;
      await new Promise(resolve => { img.onload = resolve; });

      // Create canvas and resize image
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = INPUT_SIZE;
      tempCanvas.height = INPUT_SIZE;
      const ctx = tempCanvas.getContext('2d');
      ctx.drawImage(img, 0, 0, INPUT_SIZE, INPUT_SIZE);

      // Get image data and preprocess
      const imageData = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
      const input = preprocessImage(imageData);
      
      // Create tensor
      const tensor = new ort.Tensor("float32", input, [1, 3, INPUT_SIZE, INPUT_SIZE]);
      
      // Run inference
      const feeds = {};
      feeds[session.inputNames[0]] = tensor;
      const results = await session.run(feeds);

      // Parse results
      const rawDetections = parseDetections(results, labels, session);
      
      // Apply NMS to remove duplicate detections
      const finalDetections = nms(rawDetections, 0.4);
      
      // Return top detections sorted by confidence
      return finalDetections
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 10); // Limit to top 10 detections

    } catch (error) {
      console.error("Detection error:", error);
      return [];
    }
  }

  // Real-time detection for camera feed
  useEffect(() => {
    let interval;
    
    const { session, labels } = getCurrentModel();
    
    if (session && labels && labels.length && cameraState === 'available' && !showModal) {
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
          
          const rawDetections = parseDetections(results, labels, session);
          const finalDetections = nms(rawDetections, 0.5);
          
          // Filter for high-confidence detections for real-time display
          const topDetections = finalDetections
            .filter(det => det.confidence > 0.87)
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 5);
          
          setDetections(topDetections);
          
          // Clear detections after timeout
          if (detectionTimeoutRef.current) {
            clearTimeout(detectionTimeoutRef.current);
          }
          
          detectionTimeoutRef.current = setTimeout(() => {
            setDetections([]);
          }, 2000);
          
        } catch (error) {
          console.error("Real-time detection error:", error);
        }
      }, 1000); // Run detection every second
    }
    
    return () => {
      if (interval) clearInterval(interval);
      if (detectionTimeoutRef.current) {
        clearTimeout(detectionTimeoutRef.current);
      }
    };
  }, [sessions, labelsData, currentModel, cameraState, showModal]);

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
          {/* Model selector */}
          <select 
            value={currentModel} 
            onChange={(e) => setCurrentModel(e.target.value)}
            className="model-selector"
            style={{
              marginRight: '10px',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              backgroundColor: '#fff',
              fontSize: '14px'
            }}
          >
            {Object.entries(MODELS).map(([key, config]) => (
              <option key={key} value={key}>
                {config.name}
              </option>
            ))}
          </select>
          
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

        {/* Real-time detection overlay */}
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
            disabled={isScanning || cameraState !== 'available' || isAnyModelLoading()}
            className={`scan-button ${isScanning || cameraState !== 'available' || isAnyModelLoading() ? 'disabled' : ''}`}
          >
            <FontAwesomeIcon icon={faSearch} className="scan-icon" />
            <span>
              {isAnyModelLoading() ? 'Loading Models...' :
               cameraState === 'available' ? 'Scan Ingredient' : 
               cameraState === 'loading' ? 'Camera Loading...' :
               cameraState === 'denied' ? 'Enable Camera' : 'Start Camera'}
            </span>
          </button>
          <button 
            onClick={handleImageUpload}
            disabled={isScanning || isAnyModelLoading()}
            className={`upload-button ${isScanning || isAnyModelLoading() ? 'disabled' : ''}`}
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
                    <p className="help-step-text">Select your preferred AI model from the dropdown in the header.</p>
                  </li>
                  <li className="help-step">
                    <div className="help-step-number">2</div>
                    <p className="help-step-text">Point the camera at your ingredients with good lighting.</p>
                  </li>
                  <li className="help-step">
                    <div className="help-step-number">3</div>
                    <p className="help-step-text">Keep ingredients separated and visible.</p>
                  </li>
                  <li className="help-step">
                    <div className="help-step-number">4</div>
                    <p className="help-step-text">Press "Scan Ingredient" to capture and analyze the image.</p>
                  </li>
                  <li className="help-step">
                    <div className="help-step-number">5</div>
                    <p className="help-step-text">Review detected ingredients and adjust selections as needed.</p>
                  </li>
                  <li className="help-step">
                    <div className="help-step-number">6</div>
                    <p className="help-step-text">Add any missed ingredients manually.</p>
                  </li>
                  <li className="help-step">
                    <div className="help-step-number">7</div>
                    <p className="help-step-text">Click "Generate Recipe" to proceed with selected ingredients.</p>
                  </li>
                </ul>
              </div>

              <div className="help-section">
                <h2 className="help-section-title">Available AI Models</h2>
                <ul className="help-steps">
                  <li className="help-step">
                    <div className="help-step-number">1</div>
                    <p className="help-step-text">YOLOv8s General: Best for general ingredient detection with wide variety support.</p>
                  </li>
                  <li className="help-step">
                    <div className="help-step-number">2</div>
                    <p className="help-step-text">Custom Food Model: Specialized for food items with enhanced accuracy for specific ingredients.</p>
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
                  <li className="help-step">
                    <div className="help-step-number">6</div>
                    <p className="help-step-text">Try different AI models if one doesn't detect your ingredients well.</p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAnyModelLoading() && (
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
          Loading AI models for ingredient detection...
        </div>
      )}
      {Object.keys(modelErrors).length > 0 && (
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
          zIndex: 1000,
          maxWidth: '80%',
          textAlign: 'center'
        }}>
          Model Errors: {Object.values(modelErrors)[0]}
        </div>
      )}
    </div>
  );
};

export default IngredientScanner;