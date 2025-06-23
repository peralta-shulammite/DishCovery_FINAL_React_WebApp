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
  faTrash 
} from '@fortawesome/free-solid-svg-icons';
import './style.css';
import * as ort from "onnxruntime-web";

const INPUT_SIZE = 800;
const MODEL_URL = "/assets/model.onnx";
const LABELS_URL = "/assets/labels.txt";
const CONFIDENCE_THRESHOLD = 0.50;

const IngredientScanner = () => {
  const [stream, setStream] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraState, setCameraState] = useState('not-started'); // Changed initial state
  const [showModal, setShowModal] = useState(false);
  const [scannedImage, setScannedImage] = useState(null);
  const [scannedIngredients, setScannedIngredients] = useState([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [session, setSession] = useState(null);
  const [labels, setLabels] = useState([]);
  const [detections, setDetections] = useState([]);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const lastIngredientRef = useRef(null);

  // Load ONNX model
  useEffect(() => {
    const loadModel = async () => {
      try {
        // Check if model file exists first
        const response = await fetch(MODEL_URL, { method: 'HEAD' });
        if (!response.ok) {
          console.log("Model file not found - running in demo mode");
          return;
        }
        
        ort.env.wasm.wasmPaths = '/assets/';
        const session = await ort.InferenceSession.create(MODEL_URL);
        setSession(session);
        console.log("Model loaded successfully");
      } catch (e) {
        console.log("Model load error - running in demo mode:", e.message);
      }
    };
    
    loadModel();
  }, []);

  // Load labels.txt
  useEffect(() => {
    const loadLabels = async () => {
      try {
        const response = await fetch(LABELS_URL);
        if (!response.ok) {
          console.log("Labels file not found - using demo labels");
          setLabels(['tomato', 'onion', 'garlic', 'carrot', 'potato', 'bell pepper']);
          return;
        }
        
        const text = await response.text();
        setLabels(text.split('\n').map(l => l.trim()).filter(Boolean));
        console.log("Labels loaded successfully");
      } catch (e) {
        console.log("Labels load error - using demo labels:", e.message);
        setLabels(['tomato', 'onion', 'garlic', 'carrot', 'potato', 'bell pepper']);
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
        video: { facingMode: 'environment', width: INPUT_SIZE, height: INPUT_SIZE }
      });
      setStream(mediaStream);
      setCameraState('available');
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (error) {
      console.log('Camera access denied or not available:', error);
      setCameraState('denied');
    }
  };

  // Ensure video plays when stream is available
  useEffect(() => {
    if (stream && videoRef.current && cameraState === 'available') {
      videoRef.current.srcObject = stream;
      // Use a small delay to avoid interruption errors
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.play().catch(e => {
            // Ignore play interruption errors - they're harmless
            if (!e.message.includes('interrupted')) {
              console.log('Video play error:', e);
            }
          });
        }
      }, 100);
    }
  }, [stream, cameraState]);

  const captureImage = () => {
    if (videoRef.current && cameraState === 'available') {
      const canvas = document.createElement('canvas');
      const video = videoRef.current;
      
      // Wait for video to be ready
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

  // Real ONNX detection function
  const performDetection = useCallback(async (imageSource) => {
    if (!session || !canvasRef.current) {
      console.log('Session or canvas not ready');
      return [];
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    // Create image element from source
    const img = new Image();
    return new Promise((resolve) => {
      img.onload = async () => {
        // Draw and resize image to INPUT_SIZE
        canvas.width = INPUT_SIZE;
        canvas.height = INPUT_SIZE;
        ctx.drawImage(img, 0, 0, INPUT_SIZE, INPUT_SIZE);
        const imageData = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);

        // Preprocess to Float32Array (NCHW format)
        const input = new Float32Array(1 * 3 * INPUT_SIZE * INPUT_SIZE);
        for (let y = 0; y < INPUT_SIZE; y++) {
          for (let x = 0; x < INPUT_SIZE; x++) {
            const idx = (y * INPUT_SIZE + x) * 4;
            const outIdx = y * INPUT_SIZE + x;
            input[outIdx] = imageData.data[idx] / 255.0; // R
            input[INPUT_SIZE * INPUT_SIZE + outIdx] = imageData.data[idx + 1] / 255.0; // G
            input[2 * INPUT_SIZE * INPUT_SIZE + outIdx] = imageData.data[idx + 2] / 255.0; // B
          }
        }

        try {
          const tensor = new ort.Tensor("float32", input, [1, 3, INPUT_SIZE, INPUT_SIZE]);
          const feeds = {};
          feeds[session.inputNames[0]] = tensor;
          const results = await session.run(feeds);

          // Parse detections (assuming output is [num, 6]: [x_min, y_min, x_max, y_max, conf, class])
          const outputArr = Array.from(results[session.outputNames[0]].data);
          const numDetections = outputArr.length / 6;
          const detectedIngredients = [];

          for (let i = 0; i < numDetections; i++) {
            const offset = i * 6;
            const [x_min, y_min, x_max, y_max, confidence, class_id] = outputArr.slice(offset, offset + 6);
            
            if (confidence > CONFIDENCE_THRESHOLD) {
              const labelName = labels[Math.floor(class_id)] || `Class ${Math.floor(class_id)}`;
              detectedIngredients.push({
                id: Date.now() + i,
                name: labelName,
                description: `Detected with ${(confidence * 100).toFixed(1)}% confidence`,
                status: 'unchecked',
                confidence: confidence,
                bbox: { x_min, y_min, x_max, y_max }
              });
            }
          }
          resolve(detectedIngredients);
        } catch (error) {
          console.error('Detection error:', error);
          resolve([]);
        }
      };
      img.onerror = () => {
        console.error('Image load error');
        resolve([]);
      };
      img.src = imageSource;
    });
  }, [session, labels]);

  const handleScan = async () => {
    console.log('Scan button clicked');
    console.log('Camera state:', cameraState);
    console.log('Session ready:', !!session);
    
    if (cameraState !== 'available') {
      console.log('Camera not available, trying to start...');
      await startCamera();
      return;
    }

    setIsScanning(true);
    
    try {
      const capturedImage = captureImage();
      console.log('Captured image:', !!capturedImage);
      
      if (!capturedImage) {
        console.log('Failed to capture image');
        setIsScanning(false);
        return;
      }
      
      setScannedImage(capturedImage);
      
      if (session) {
        const detectedIngredients = await performDetection(capturedImage);
        console.log('Detected ingredients:', detectedIngredients);
        setScannedIngredients(prev => [...prev, ...detectedIngredients]);
      } else {
        console.log('No session available, adding demo ingredient');
        // Add a demo ingredient if no model is loaded
        const demoIngredients = ['Tomato', 'Onion', 'Garlic', 'Carrot', 'Bell Pepper', 'Potato'];
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
            const detectedIngredients = await performDetection(e.target.result);
            setScannedIngredients(prev => [...prev, ...detectedIngredients]);
          } else {
            // Add demo ingredient if no model
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
    alert('Point your camera at ingredient labels to scan and identify them, or upload an image to analyze.');
  };

  const toggleIngredientStatus = (id) => {
    setScannedIngredients(prev => 
      prev.map(ingredient => {
        if (ingredient.id === id) {
          const currentStatus = ingredient.status;
          const newStatus = currentStatus === 'unchecked' ? 'checked' : 'unchecked';
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
      const newId = scannedIngredients.length > 0 
        ? Math.max(...scannedIngredients.map(i => i.id)) + 1 
        : 1;
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

  useEffect(() => {
    if (lastIngredientRef.current) {
      lastIngredientRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [scannedIngredients.length]);

  // Cleanup function
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

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
      
      {/* Overlay for camera states */}
      {cameraState === 'loading' && (
        <div className="no-camera-overlay">
          <div className="no-camera-content">
            <div className="spinner"></div>
            <p>Loading camera...</p>
          </div>
        </div>
      )}

      {cameraState === 'denied' && (
        <div className="no-camera-overlay">
          <div className="no-camera-content">
            <div className="camera-emoji">📷</div>
            <p>Camera not available</p>
            <p className="camera-subtitle">Please allow camera access or upload an image</p>
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
        </div>
      </div>

      {/* Scanning Overlay */}
      {isScanning && (
        <div className="scanning-overlay">
          <div className="scanning-content">
            <div className="spinner"></div>
            <p className="scanning-text">Analyzing ingredients...</p>
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="bottom-controls">
        <div className="controls-container">
          {/* Scan Ingredient Button */}
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

          {/* Upload Image Button */}
          <button 
            onClick={handleImageUpload}
            disabled={isScanning}
            className={`upload-button ${isScanning ? 'disabled' : ''}`}
          >
            <FontAwesomeIcon icon={faUpload} className="upload-icon" />
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            {/* Modal Header */}
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

            {/* Modal Content */}
            <div className="modal-content">
              {/* Left side - Ingredients list */}
              <div className="modal-left">
                {/* Add ingredient section */}
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

                {/* Selected ingredients badge */}
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
                  <span style={{
                    fontWeight: 'bold',
                    marginRight: '4px'
                  }}>
                    {scannedIngredients.filter(i => i.status === 'checked').length}
                  </span>
                  selected ingredients
                </div>

                {/* Ingredients list */}
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

                {/* Generate Recipe Button */}
                <button
                  onClick={generateRecipe}
                  disabled={scannedIngredients.filter(i => i.status === 'checked').length === 0}
                  className={`generate-recipe-button ${scannedIngredients.filter(i => i.status === 'checked').length === 0 ? 'disabled' : ''}`}
                >
                  Generate Recipe
                </button>
              </div>

              {/* Right side - Image preview */}
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