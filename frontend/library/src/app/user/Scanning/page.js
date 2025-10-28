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
import './style.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const IngredientScanner = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const bboxCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const ingredientsListRef = useRef(null);
  const newIngredientRef = useRef(null);
  const imageRef = useRef(null);
  
  const [cameraState, setCameraState] = useState('not-started');
  const [isScanning, setIsScanning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [scannedIngredients, setScannedIngredients] = useState([]);
  const [detections, setDetections] = useState([]);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [newIngredient, setNewIngredient] = useState('');
  const [backendError, setBackendError] = useState(null);

  const handleGoBack = () => {
    window.history.back();
  };

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
      return imageDataUrl;
    }
    return null;
  };

  // Draw bounding boxes on canvas
  const drawBoundingBoxes = useCallback(() => {
    if (!bboxCanvasRef.current || !imageRef.current || detections.length === 0) return;

    const canvas = bboxCanvasRef.current;
    const img = imageRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    detections.forEach((det) => {
      const [x1, y1, x2, y2] = det.bbox;
      const width = x2 - x1;
      const height = y2 - y1;

      // Draw box
      ctx.strokeStyle = det.db_matched ? '#4CAF50' : '#FF9800';
      ctx.lineWidth = 3;
      ctx.strokeRect(x1, y1, width, height);

      // Draw label background
      const label = `${det.class_name} ${(det.confidence * 100).toFixed(0)}%`;
      ctx.font = '14px Arial';
      const textWidth = ctx.measureText(label).width;
      
      ctx.fillStyle = det.db_matched ? '#4CAF50' : '#FF9800';
      ctx.fillRect(x1, y1 - 20, textWidth + 10, 20);

      // Draw label text
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(label, x1 + 5, y1 - 5);
    });
  }, [detections]);

  // Redraw boxes when image loads or detections change
  useEffect(() => {
    if (imageRef.current && imageRef.current.complete) {
      drawBoundingBoxes();
    }
  }, [detections, drawBoundingBoxes]);

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
        setBackendError(null);
        
        try {
          const result = await detectIngredientsBackend(file);
          setDetections(result.detections);
          
          // Group by ingredient name and count quantity
          const grouped = {};
          result.detections.forEach((det) => {
            const name = capitalizeWords(det.class_name);
            if (grouped[name]) {
              grouped[name].quantity += 1;
              grouped[name].confidence = Math.max(grouped[name].confidence, det.confidence);
            } else {
              grouped[name] = {
                ingredient_id: det.ingredient_id,
                name: name,
                quantity: 1,
                selected: true,
                confidence: det.confidence,
                db_matched: det.db_matched,
                original_detection: det.original_detection
              };
            }
          });
          
          const ingredients = Object.values(grouped).map((item, idx) => ({
            ...item,
            id: idx + 1
          }));
          
          setScannedIngredients(ingredients);
        } catch (error) {
          console.error('Error processing uploaded image:', error);
          setBackendError(error.message);
          setScannedIngredients([]);
          setDetections([]);
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
    setBackendError(null);
    
    const imageDataUrl = captureImage();
    
    if (!imageDataUrl) {
      setIsScanning(false);
      setBackendError("Failed to capture image");
      return;
    }

    try {
      const blob = await (await fetch(imageDataUrl)).blob();
      const result = await detectIngredientsBackend(blob);
      setDetections(result.detections);
      
      // Group by ingredient name and count quantity
      const grouped = {};
      result.detections.forEach((det) => {
        const name = capitalizeWords(det.class_name);
        if (grouped[name]) {
          grouped[name].quantity += 1;
          grouped[name].confidence = Math.max(grouped[name].confidence, det.confidence);
        } else {
          grouped[name] = {
            ingredient_id: det.ingredient_id,
            name: name,
            quantity: 1,
            selected: true,
            confidence: det.confidence,
            db_matched: det.db_matched,
            original_detection: det.original_detection
          };
        }
      });
      
      const ingredients = Object.values(grouped).map((item, idx) => ({
        ...item,
        id: idx + 1
      }));
      
      setScannedIngredients(ingredients);
      setShowModal(true);
      
    } catch (error) {
      console.error('Detection error:', error);
      setBackendError(error.message);
      setScannedIngredients([]);
      setDetections([]);
    } finally {
      setIsScanning(false);
    }
  };

  async function detectIngredientsBackend(imageBlob) {
    try {
      const formData = new FormData();
      formData.append('image', imageBlob, 'ingredient-scan.jpg');

      console.log('📤 Sending image to backend for detection...');

      const response = await fetch(`${API_BASE_URL}/api/scan`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Detection response:', data);

      if (!data.success) {
        throw new Error(data.error || 'Detection failed');
      }

      return {
        detections: data.detections || [],
        matched: data.matched_ingredients || [],
        unmatched: data.unmatched_ingredients || []
      };
    } catch (error) {
      console.error('❌ Detection error:', error);
      throw error;
    }
  }

  function capitalizeWords(str) {
    return str.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  const toggleIngredientSelection = (id) => {
    setScannedIngredients(prev => 
      prev.map(ing => ing.id === id ? { ...ing, selected: !ing.selected } : ing)
    );
  };

  const updateQuantity = (id, quantity) => {
    setScannedIngredients(prev =>
      prev.map(ing => ing.id === id ? { ...ing, quantity: Math.max(1, quantity) } : ing)
    );
  };

  const deleteIngredient = (id) => {
    setScannedIngredients(prev => prev.filter(ing => ing.id !== id));
  };

  const addIngredient = () => {
    if (newIngredient.trim()) {
      const newId = scannedIngredients.length > 0 
        ? Math.max(...scannedIngredients.map(i => i.id)) + 1 
        : 1;
      
      setScannedIngredients(prev => [...prev, {
        id: newId,
        ingredient_id: null,
        name: capitalizeWords(newIngredient.trim()),
        quantity: 1,
        selected: true,
        confidence: null,
        db_matched: false,
        original_detection: newIngredient.trim()
      }]);
      setNewIngredient('');
      
      setTimeout(() => {
        if (ingredientsListRef.current) {
          ingredientsListRef.current.scrollTop = ingredientsListRef.current.scrollHeight;
        }
      }, 100);
    }
  };

  const getSelectedCount = () => {
    return scannedIngredients.filter(ing => ing.selected).length;
  };

  const generateRecipe = () => {
    const selected = scannedIngredients
      .filter(ing => ing.selected)
      .map(ing => ({
        ingredient_id: ing.ingredient_id,
        name: ing.name,
        quantity: ing.quantity
      }));
    
    console.log('Selected ingredients for recipe:', selected);
    localStorage.setItem('selectedIngredients', JSON.stringify(selected));
    window.location.href = '/recipe';
  };

  const closeModal = () => {
    setShowModal(false);
    setCapturedImage(null);
    setScannedIngredients([]);
    setDetections([]);
    setBackendError(null);
  };

  const closeHelpModal = () => {
    setShowHelpModal(false);
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]);

  return (
    <div className="scanner-container">
      <div className="scanner-header">
        <button onClick={handleGoBack} className="back-button">
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <h1>Ingredient Scanner</h1>
        <button onClick={() => setShowHelpModal(true)} className="help-button">
          <FontAwesomeIcon icon={faQuestionCircle} />
        </button>
      </div>

      <div className="camera-container">
        {cameraState === 'loading' && (
          <div className="camera-message">
            <p>Starting camera...</p>
          </div>
        )}
        
        {cameraState === 'denied' && (
          <div className="camera-message error">
            <FontAwesomeIcon icon={faExclamationTriangle} size="3x" />
            <p>Camera access denied</p>
            <p className="camera-message-sub">Please enable camera permissions in your browser settings</p>
          </div>
        )}

        {cameraState === 'available' && (
          <>
            <video ref={videoRef} autoPlay playsInline className="camera-feed" />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div className="camera-overlay">
              <div className="scan-frame"></div>
            </div>
          </>
        )}
      </div>

      <div className="scanner-actions">
        <button 
          onClick={handleImageUpload}
          className="upload-button"
        >
          <FontAwesomeIcon icon={faUpload} />
          <span>Upload Image</span>
        </button>
        
        <button 
          onClick={handleScan}
          disabled={cameraState !== 'available' || isScanning}
          className="scan-button"
        >
          <FontAwesomeIcon icon={faSearch} spin={isScanning} />
          <span>{isScanning ? 'Scanning...' : 'Scan Ingredient'}</span>
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
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
                <div className="image-container-bbox">
                  {capturedImage ? (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img 
                        ref={imageRef}
                        src={capturedImage} 
                        alt="Captured ingredients"
                        onLoad={drawBoundingBoxes}
                        style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
                      />
                      <canvas 
                        ref={bboxCanvasRef}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          pointerEvents: 'none'
                        }}
                      />
                    </div>
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

                {backendError && (
                  <div style={{
                    background: '#ffebee',
                    color: '#c62828',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    fontSize: '0.9rem'
                  }}>
                    ⚠️ {backendError}
                  </div>
                )}

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
                            <span className="ingredient-subtitle">
                              Quantity: {ingredient.quantity} • {ingredient.confidence && `Confidence: ${(ingredient.confidence * 100).toFixed(1)}% • `}
                              {ingredient.db_matched ? (
                                <span style={{color: '#4CAF50'}}>✓ In Database</span>
                              ) : (
                                <span style={{color: '#ff9800'}}>⚠ Not in Database</span>
                              )}
                            </span>
                          </div>
                          <div className="ingredient-actions">
                            <input
                              type="number"
                              min="1"
                              value={ingredient.quantity}
                              onChange={(e) => updateQuantity(ingredient.id, parseInt(e.target.value) || 1)}
                              className="quantity-input"
                              style={{
                                width: '60px',
                                padding: '0.4rem',
                                border: '1px solid #ddd',
                                borderRadius: '6px',
                                fontSize: '0.9rem',
                                marginRight: '0.5rem'
                              }}
                            />
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
    </div>
  );
};

export default IngredientScanner;