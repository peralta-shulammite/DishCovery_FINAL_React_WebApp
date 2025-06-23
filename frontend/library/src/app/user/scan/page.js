'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCamera, 
  faQuestionCircle, 
  faUpload, 
  faExpand, 
  faTimes, 
  faPlus, 
  faCheck, 
  faTrash,
  faExclamationTriangle 
} from '@fortawesome/free-solid-svg-icons';
import './style.css';
let ort;

const INPUT_SIZE = 800;
const MODEL_URL = "/assets/model.onnx";
const LABELS_URL = "/assets/labels.txt";
const CONFIDENCE_THRESHOLD = 0.5;

const IngredientScanner = () => {
  // Camera and UI states
  const [stream, setStream] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraState, setCameraState] = useState('not-started');
  const [showModal, setShowModal] = useState(false);
  const [scannedImage, setScannedImage] = useState(null);
  const [scannedIngredients, setScannedIngredients] = useState([]);
  const [newIngredient, setNewIngredient] = useState('');
  
  // ONNX Model states
  const [session, setSession] = useState(null);
  const [labels, setLabels] = useState([]);
  const [modelError, setModelError] = useState(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  
  // Real-time detection states
  const [detections, setDetections] = useState([]);
  const [isRealTimeDetecting, setIsRealTimeDetecting] = useState(false);
  
  // Refs
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const lastIngredientRef = useRef(null);
  const detectionIntervalRef = useRef(null);

  // Load ONNX model with proper error handling
  useEffect(() => {
    const loadModel = async () => {
      try {
        setIsModelLoading(true);
        setModelError(null);
        
        // Check if model file exists
        const response = await fetch(MODEL_URL, { method: 'HEAD' });
        if (!response.ok) {
          throw new Error("Model file not found");
        }
        
        // Configure ONNX runtime wasm paths before importing
        // Dynamically import onnxruntime-web after setting wasmPaths
        const ortModule = await import('onnxruntime-web');
        ort = ortModule;
        ort.env.wasm.wasmPaths = '/assets/';
        ort.env.wasm.numThreads = 1; // Limit threads for stability

        // Fetch the model file as a blob and convert to ArrayBuffer
        const modelResponse = await fetch(MODEL_URL);
        if (!modelResponse.ok) {
          throw new Error(`Failed to fetch model file: ${modelResponse.statusText}`);
        }
        const modelArrayBuffer = await modelResponse.arrayBuffer();

        // Create session from ArrayBuffer instead of URL string
        const session = await ort.InferenceSession.create(modelArrayBuffer, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all'
        });

        setSession(session);
        console.log("ONNX Model loaded successfully");
        console.log("Input names:", session.inputNames);
        console.log("Output names:", session.outputNames);
        
      } catch (e) {
        console.error("Model load error:", e);
        setModelError("Model not available - running in demo mode");
        // Possible causes:
        // - model.onnx file is corrupted or invalid
        // - model.onnx file not served correctly by the server (check MIME type and accessibility)
        // - wasmPaths or onnxruntime-web version incompatibility
        // Please verify the model file integrity and server setup.
      } finally {
        setIsModelLoading(false);
      }
    };
    
    loadModel();
  }, []);

  // Load labels with fallback
  useEffect(() => {
    const loadLabels = async () => {
      try {
        const response = await fetch(LABELS_URL);
        if (!response.ok) {
          throw new Error("Labels file not found");
        }
        
        const text = await response.text();
        const labelList = text.split('\n').map(l => l.trim()).filter(Boolean);
        setLabels(labelList);
        console.log("Labels loaded successfully:", labelList.length, "labels");
        
      } catch (e) {
        console.log("Labels load error - using demo labels:", e.message);
        const demoLabels = [
          'tomato', 'onion', 'garlic', 'carrot', 'potato', 'bell pepper',
          'cucumber', 'lettuce', 'broccoli', 'spinach', 'celery', 'mushroom'
        ];
        setLabels(demoLabels);
      }
    };
    
    loadLabels();
  }, []);

  // Auto-start camera on component mount
  useEffect(() => {
    startCamera();
  }, []);

  const startCamera = async () => {
    setCameraState('loading');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', 
          width: { ideal: INPUT_SIZE }, 
          height: { ideal: INPUT_SIZE }
        }
      });
      setStream(mediaStream);
      setCameraState('available');
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        
        // Start real-time detection if model is loaded
        if (session && !detectionIntervalRef.current) {
          startRealTimeDetection();
        }
      }
    } catch (error) {
      console.log('Camera access denied or not available:', error);
      setCameraState('denied');
    }
  };

  // Unified ONNX detection function - aligned with both approaches
  const performONNXDetection = useCallback(async (imageSource) => {
    if (!session || !canvasRef.current) {
      console.log('Session or canvas not ready');
      return [];
    }

    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      
      const processImage = async (imgElement) => {
        try {
          // Ensure canvas is properly sized
          canvas.width = INPUT_SIZE;
          canvas.height = INPUT_SIZE;
          
          // Draw image to canvas with proper scaling
          ctx.drawImage(imgElement, 0, 0, INPUT_SIZE, INPUT_SIZE);
          const imageData = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);

          // Preprocess image data to Float32Array in NCHW format
          // This matches both code approaches
          const input = new Float32Array(1 * 3 * INPUT_SIZE * INPUT_SIZE);
          for (let y = 0; y < INPUT_SIZE; y++) {
            for (let x = 0; x < INPUT_SIZE; x++) {
              const pixelIndex = (y * INPUT_SIZE + x) * 4;
              const outputIndex = y * INPUT_SIZE + x;
              
              // Normalize pixel values to [0, 1] and arrange in CHW format
              input[outputIndex] = imageData.data[pixelIndex] / 255.0;     // R channel
              input[INPUT_SIZE * INPUT_SIZE + outputIndex] = imageData.data[pixelIndex + 1] / 255.0; // G channel  
              input[2 * INPUT_SIZE * INPUT_SIZE + outputIndex] = imageData.data[pixelIndex + 2] / 255.0; // B channel
            }
          }

          // Create tensor with proper shape
          const tensor = new ort.Tensor("float32", input, [1, 3, INPUT_SIZE, INPUT_SIZE]);
          
          // Prepare feeds - use first input name dynamically
          const feeds = {};
          feeds[session.inputNames[0]] = tensor;
          
          // Run inference
          console.log("Running ONNX inference...");
          const results = await session.run(feeds);
          
          // Get output tensor - use first output name
          const outputTensor = results[session.outputNames[0]];
          const outputData = Array.from(outputTensor.data);
          
          console.log("Raw output shape:", outputTensor.dims);
          console.log("Raw output length:", outputData.length);
          
          // Parse detections - assuming format: [batch, detections, 6] where 6 = [x1, y1, x2, y2, conf, class]
          const detectedIngredients = [];
          const numDetections = outputData.length / 6;
          
          console.log("Number of detections:", numDetections);
          
          for (let i = 0; i < numDetections; i++) {
            const offset = i * 6;
            const [x_min, y_min, x_max, y_max, confidence, class_id] = outputData.slice(offset, offset + 6);
            
            if (confidence > CONFIDENCE_THRESHOLD) {
              const classIndex = Math.floor(class_id);
              const labelName = labels[classIndex] || `Unknown Class ${classIndex}`;
              
              console.log(`Detection ${i}: ${labelName} (${(confidence * 100).toFixed(1)}%)`);
              
              detectedIngredients.push({
                id: Date.now() + Math.random(), // Unique ID
                name: labelName,
                description: `Detected with ${(confidence * 100).toFixed(1)}% confidence`,
                status: 'unchecked',
                confidence: confidence,
                bbox: { 
                  x_min: Math.max(0, Math.min(1, x_min)), 
                  y_min: Math.max(0, Math.min(1, y_min)), 
                  x_max: Math.max(0, Math.min(1, x_max)), 
                  y_max: Math.max(0, Math.min(1, y_max))
                }
              });
            }
          }
          
          console.log(`Found ${detectedIngredients.length} valid detections`);
          resolve(detectedIngredients);
          
        } catch (error) {
          console.error('ONNX Detection error:', error);
          resolve([]);
        }
      };

      // Handle different image sources
      if (typeof imageSource === 'string') {
        // Data URL or file path
        const img = new Image();
        img.onload = () => processImage(img);
        img.onerror = () => {
          console.error('Image load error');
          resolve([]);
        };
        img.src = imageSource;
      } else if (imageSource instanceof HTMLVideoElement) {
        // Direct video element
        processImage(imageSource);
      } else {
        console.error('Invalid image source');
        resolve([]);
      }
    });
  }, [session, labels]);

  // Real-time detection for camera feed
  const startRealTimeDetection = useCallback(() => {
    if (!session || !videoRef.current || cameraState !== 'available') {
      return;
    }
    
    setIsRealTimeDetecting(true);
    
    const runDetection = async () => {
      if (videoRef.current && videoRef.current.readyState >= 2) {
        try {
          const detectedIngredients = await performONNXDetection(videoRef.current);
          setDetections(detectedIngredients);
        } catch (error) {
          console.error('Real-time detection error:', error);
        }
      }
    };
    
    // Run detection every 1.5 seconds (aligned with first code)
    detectionIntervalRef.current = setInterval(runDetection, 1500);
    
    // Run initial detection
    setTimeout(runDetection, 500);
    
  }, [session, cameraState, performONNXDetection]);

  // Stop real-time detection
  const stopRealTimeDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    setIsRealTimeDetecting(false);
    setDetections([]);
  }, []);

  // Start real-time detection when model and camera are ready
  useEffect(() => {
    if (session && cameraState === 'available' && !detectionIntervalRef.current) {
      startRealTimeDetection();
    }
    
    return () => {
      stopRealTimeDetection();
    };
  }, [session, cameraState, startRealTimeDetection, stopRealTimeDetection]);

  const captureImage = () => {
    if (videoRef.current && cameraState === 'available') {
      const canvas = document.createElement('canvas');
      const video = videoRef.current;
      
      if (video.readyState < 2) {
        console.log('Video not ready for capture');
        return null;
      }
      
      canvas.width = video.videoWidth || INPUT_SIZE;
      canvas.height = video.videoHeight || INPUT_SIZE;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg');
    }
    return null;
  };

  const handleScan = async () => {
    console.log('Scan button clicked');
    
    if (cameraState !== 'available') {
      console.log('Camera not available, trying to start...');
      await startCamera();
      return;
    }

    setIsScanning(true);
    
    try {
      const capturedImage = captureImage();
      
      if (!capturedImage) {
        console.log('Failed to capture image');
        setIsScanning(false);
        return;
      }
      
      setScannedImage(capturedImage);
      
      if (session) {
        console.log('Running ONNX detection on captured image...');
        const detectedIngredients = await performONNXDetection(capturedImage);
        console.log('Detected ingredients:', detectedIngredients);
        
        if (detectedIngredients.length > 0) {
          setScannedIngredients(prev => [...prev, ...detectedIngredients]);
        } else {
          // If no detections, add a demo ingredient
          setScannedIngredients(prev => [...prev, {
            id: Date.now(),
            name: 'Unknown Ingredient',
            description: 'No clear detection - please add manually',
            status: 'unchecked'
          }]);
        }
      } else {
        // Demo mode fallback
        const demoIngredients = ['Tomato', 'Onion', 'Garlic', 'Carrot', 'Bell Pepper'];
        const randomIngredient = demoIngredients[Math.floor(Math.random() * demoIngredients.length)];
        
        setScannedIngredients(prev => [...prev, {
          id: Date.now(),
          name: randomIngredient,
          description: 'Demo mode - randomly detected ingredient',
          status: 'unchecked'
        }]);
      }
      
      setShowModal(true);
    } catch (error) {
      console.error('Scan error:', error);
    } finally {
      setIsScanning(false);
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
        setScannedImage(e.target.result);
        setIsScanning(true);
        
        try {
          if (session) {
            const detectedIngredients = await performONNXDetection(e.target.result);
            setScannedIngredients(prev => [...prev, ...detectedIngredients]);
          } else {
            // Demo mode for uploaded images
            const demoIngredients = ['Uploaded Tomato', 'Uploaded Onion', 'Uploaded Garlic'];
            const randomIngredient = demoIngredients[Math.floor(Math.random() * demoIngredients.length)];
            
            setScannedIngredients(prev => [...prev, {
              id: Date.now(),
              name: randomIngredient,
              description: 'Demo mode - uploaded image analysis',
              status: 'unchecked'
            }]);
          }
        } catch (error) {
          console.error('Upload detection error:', error);
        } finally {
          setIsScanning(false);
          setShowModal(true);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleHelp = () => {
    const helpMessage = session 
      ? 'Point your camera at ingredient labels to scan and identify them automatically, or upload an image to analyze. The AI model will detect ingredients in real-time.'
      : 'Camera scanning is available, but AI detection is in demo mode. You can still capture images and add ingredients manually.';
    alert(helpMessage);
  };

  const toggleIngredientStatus = (id) => {
    setScannedIngredients(prev => 
      prev.map(ingredient => {
        if (ingredient.id === id) {
          const newStatus = ingredient.status === 'unchecked' ? 'checked' : 'unchecked';
          return { ...ingredient, status: newStatus };
        }
        return ingredient;
      })
    );
  };

  const removeIngredient = (id) => {
    setScannedIngredients(prev => prev.filter(ingredient => ingredient.id !== id));
  };

  const handleAddIngredient = () => {
    if (newIngredient.trim()) {
      const newId = Date.now() + Math.random();
      setScannedIngredients(prev => [
        ...prev,
        {
          id: newId,
          name: newIngredient.trim(),
          description: 'Added manually',
          status: 'unchecked'
        }
      ]);
      setNewIngredient('');
    }
  };

  const generateRecipe = () => {
    const checkedIngredients = scannedIngredients.filter(i => i.status === 'checked');
    alert(`Generating recipe with ${checkedIngredients.length} ingredients: ${checkedIngredients.map(i => i.name).join(', ')}`);
    setShowModal(false);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      stopRealTimeDetection();
    };
  }, [stream, stopRealTimeDetection]);

  return (
    <div className="scanner-container">
      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} width={INPUT_SIZE} height={INPUT_SIZE} style={{ display: "none" }} />
      
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
      />

      {/* Camera Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="camera-feed"
        style={{ display: cameraState === 'available' ? 'block' : 'none' }}
      />
      
      {/* Real-time Detection Overlay */}
      {cameraState === 'available' && detections.length > 0 && (
        <div className="detection-overlay">
          {detections.map((detection, idx) => (
            <div
              key={idx}
              className="detection-box"
              style={{
                position: "absolute",
                left: `${detection.bbox.x_min * 100}%`,
                top: `${detection.bbox.y_min * 100}%`,
                width: `${(detection.bbox.x_max - detection.bbox.x_min) * 100}%`,
                height: `${(detection.bbox.y_max - detection.bbox.y_min) * 100}%`,
                border: "2px solid #ff9800",
                borderRadius: "8px",
                boxSizing: "border-box",
                pointerEvents: "none",
                zIndex: 10,
              }}
            >
              <span className="detection-label">
                {detection.name} ({(detection.confidence * 100).toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      )}
      
      {/* Overlay for camera states */}
      {cameraState === 'loading' && (
        <div className="no-camera-overlay">
          <div className="no-camera-content">
            <div className="spinner"></div>
            <p>Loading camera...</p>
            {isModelLoading && <p className="model-status">Loading AI model...</p>}
          </div>
        </div>
      )}

      {cameraState === 'denied' && (
        <div className="no-camera-overlay">
          <div className="no-camera-content">
            <div className="camera-emoji">📷</div>
            <p>Camera not available</p>
            <p className="camera-subtitle">Please allow camera access or upload an image</p>
            {modelError && (
              <div className="model-error">
                <FontAwesomeIcon icon={faExclamationTriangle} />
                <span>{modelError}</span>
              </div>
            )}
            <button onClick={startCamera} className="retry-camera-btn">
              Try Again
            </button>
          </div>
        </div>
      )}

      {cameraState === 'not-started' && (
        <div className="no-camera-overlay">
          <div className="no-camera-content">
            <div className="camera-emoji">📷</div>
            <p>Camera starting...</p>
            {isModelLoading && (
              <div className="model-loading">
                <div className="spinner"></div>
                <p>Loading AI model...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="header">
        <div className="header-spacer"></div>
        <h1 className="title">Ingredient Scanner</h1>
        <div className="header-right">
          <button onClick={handleHelp} className="help-button">
            <FontAwesomeIcon icon={faQuestionCircle} className="icon" />
          </button>
          {session && (
            <div className="model-status-indicator">
              <div className="status-dot active"></div>
              <span>AI Ready</span>
            </div>
          )}
        </div>
      </div>

      {/* Scanning Overlay */}
      {isScanning && (
        <div className="scanning-overlay">
          <div className="scanning-content">
            <div className="spinner"></div>
            <p className="scanning-text">
              {session ? 'Analyzing ingredients with AI...' : 'Processing image...'}
            </p>
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="bottom-controls">
        <div className="controls-container">
          <button
            onClick={handleScan}
            disabled={isScanning}
            className={`scan-button ${isScanning ? 'disabled' : ''}`}
          >
            <FontAwesomeIcon icon={faExpand} className="scan-icon" />
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
        
        {/* Real-time detection status */}
        {cameraState === 'available' && (
          <div className="realtime-status">
            {isRealTimeDetecting ? (
              <span className="realtime-active">
                <div className="pulse-dot"></div>
                Live Detection Active
              </span>
            ) : (
              <span className="realtime-inactive">Real-time Detection Off</span>
            )}
          </div>
        )}
      </div>

      {/* Modal - keeping the same modal structure from the second file */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <div className="modal-title-section">
                <h2 className="modal-title">Scanned Ingredients</h2>
              </div>
              <div className="modal-header-right">
                <button 
                  onClick={() => setShowModal(false)}
                  className="modal-close-button"
                >
                  <FontAwesomeIcon icon={faTimes} className="close-icon" />
                </button>
              </div>
            </div>

            <div className="modal-content">
              <div className="modal-left">
                <div className="ingredient-input-group">
                  <input
                    className="ingredient-input"
                    placeholder="Add ingredient..."
                    value={newIngredient}
                    onChange={(e) => setNewIngredient(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddIngredient();
                    }}
                  />
                  <button
                    className="ingredient-add-btn"
                    onClick={handleAddIngredient}
                  >
                    + Add Ingredient
                  </button>
                </div>

                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: '#d4fbe5',
                  borderRadius: '20px',
                  padding: '4px 12px',
                  fontWeight: 'bold',
                  color: '#19C37D',
                  fontSize: '1rem',
                  marginLeft: 0,
                  width: 'fit-content'
                }}>
                  <span style={{ fontWeight: 'bold', marginRight: '4px' }}>
                    {scannedIngredients.filter(i => i.status === 'checked').length}
                  </span>
                  selected ingredients
                </div>

                <div className="ingredients-list">
                  {scannedIngredients.length === 0 ? (
                    <div className="empty-ingredients">
                      <p>No ingredients detected yet.</p>
                      <p>Try scanning an ingredient or upload an image.</p>
                    </div>
                  ) : (
                    scannedIngredients.map((ingredient, idx) => (
                      <div
                        key={ingredient.id}
                        className="ingredient-item"
                        ref={idx === scannedIngredients.length - 1 ? lastIngredientRef : null}
                      >
                        <div className="ingredient-image-placeholder"></div>
                        <div className="ingredient-content">
                          <h4 className="ingredient-name">{ingredient.name}</h4>
                          <p className="ingredient-description">{ingredient.description}</p>
                          <button
                            onClick={() => removeIngredient(ingredient.id)}
                            className="ingredient-delete-button"
                          >
                            Delete
                          </button>
                        </div>
                        <div className="ingredient-actions">
                          <div 
                            className="ingredient-status-icon"
                            onClick={() => toggleIngredientStatus(ingredient.id)}
                          >
                            {ingredient.status === 'checked' && (
                              <div className="status-checked-circle">
                                <FontAwesomeIcon icon={faCheck} className="status-check" />
                              </div>
                            )}
                            {ingredient.status === 'unchecked' && (
                              <div className="status-unchecked-circle"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <button
                  onClick={generateRecipe}
                  disabled={scannedIngredients.filter(i => i.status === 'checked').length === 0}
                  className={`generate-recipe-button ${scannedIngredients.filter(i => i.status === 'checked').length === 0 ? 'disabled' : ''}`}
                >
                  Generate Recipe
                </button>
              </div>

              <div className="modal-right">
                <div className="image-preview">
                  {scannedImage ? (
                    <img 
                      src={scannedImage} 
                      alt="Scanned ingredient" 
                      className="scanned-image"
                    />
                  ) : (
                    <div className="image-preview-placeholder">
                      <div className="image-preview-icon">📷</div>
                      <p>No image captured</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IngredientScanner;