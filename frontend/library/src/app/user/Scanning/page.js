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

// Use your existing env variable name
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const IngredientScanner = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const bboxCanvasRef = useRef(null);
  const liveCanvasRef = useRef(null);
  const imageRef = useRef(null);
  const fileInputRef = useRef(null);
  const ingredientsListRef = useRef(null);
  const newIngredientRef = useRef(null);
  const liveDetectionInterval = useRef(null);
  
  const [cameraState, setCameraState] = useState('not-started');
  const [isScanning, setIsScanning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [scannedIngredients, setScannedIngredients] = useState([]);
  const [detections, setDetections] = useState([]);
  const [liveDetections, setLiveDetections] = useState([]);
  const [isLiveDetecting, setIsLiveDetecting] = useState(false);
  const [newIngredient, setNewIngredient] = useState('');
  const [backendError, setBackendError] = useState(null);
  const smoothedDetectionsRef = useRef([]);

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

  // Helper function to draw rounded rectangle
  const drawRoundedRect = (ctx, x, y, width, height, radius) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  // Smooth detections using exponential moving average
  const smoothDetections = useCallback((newDetections) => {
    const confidenceThreshold = 0.75;
    const filtered = newDetections.filter(det => det.confidence >= confidenceThreshold);
    
    if (filtered.length === 0) {
      // If no high-confidence detections, gradually fade out existing ones
      smoothedDetectionsRef.current = smoothedDetectionsRef.current.map(det => ({
        ...det,
        confidence: det.confidence * 0.8
      })).filter(det => det.confidence > 0.1);
      return smoothedDetectionsRef.current;
    }

    // Match new detections with existing ones by position and class
    const matched = filtered.map(newDet => {
      const existing = smoothedDetectionsRef.current.find(existingDet => {
        const [x1, y1, x2, y2] = existingDet.bbox;
        const [nx1, ny1, nx2, ny2] = newDet.bbox;
        const centerX = (x1 + x2) / 2;
        const centerY = (y1 + y2) / 2;
        const newCenterX = (nx1 + nx2) / 2;
        const newCenterY = (ny1 + ny2) / 2;
        const distance = Math.sqrt(
          Math.pow(centerX - newCenterX, 2) + Math.pow(centerY - newCenterY, 2)
        );
        const maxDistance = Math.max(x2 - x1, y2 - y1) * 0.5;
        return existingDet.class_name === newDet.class_name && distance < maxDistance;
      });

      if (existing) {
        // Smooth the bbox using exponential moving average (alpha = 0.3 for stability)
        const alpha = 0.3;
        const [ex1, ey1, ex2, ey2] = existing.bbox;
        const [nx1, ny1, nx2, ny2] = newDet.bbox;
        const smoothedBbox = [
          ex1 * (1 - alpha) + nx1 * alpha,
          ey1 * (1 - alpha) + ny1 * alpha,
          ex2 * (1 - alpha) + nx2 * alpha,
          ey2 * (1 - alpha) + ny2 * alpha
        ];
        return {
          ...newDet,
          bbox: smoothedBbox,
          confidence: Math.max(existing.confidence * 0.9, newDet.confidence)
        };
      }
      return newDet;
    });

    smoothedDetectionsRef.current = matched;
    return matched;
  }, []);

  // Draw bounding boxes on canvas
  const drawBoundingBoxes = useCallback(() => {
    if (!bboxCanvasRef.current || !imageRef.current || detections.length === 0) return;

    const canvas = bboxCanvasRef.current;
    const img = imageRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Filter by confidence > 75%
    const highConfidenceDetections = detections.filter(det => det.confidence >= 0.75);

    highConfidenceDetections.forEach((det) => {
      const [x1, y1, x2, y2] = det.bbox;
      const width = x2 - x1;
      const height = y2 - y1;
      const radius = 8; // Rounded corner radius

      // Draw filled rounded rectangle with light green translucent fill
      ctx.fillStyle = 'rgba(76, 175, 80, 0.12)'; // #4CAF50 at ~12% opacity
      drawRoundedRect(ctx, x1, y1, width, height, radius);
      ctx.fill();

      // Draw rounded rectangle stroke
      ctx.strokeStyle = '#4CAF50'; // Medium green
      ctx.lineWidth = 3;
      drawRoundedRect(ctx, x1, y1, width, height, radius);
      ctx.stroke();

      // Draw label background (rounded rectangle)
      const label = `${det.class_name} ${(det.confidence * 100).toFixed(0)}%`;
      ctx.font = 'bold 14px Arial';
      const textWidth = ctx.measureText(label).width;
      const labelHeight = 22;
      const labelPadding = 8;
      const labelX = x1;
      const labelY = y1 - labelHeight - 4;
      const labelRadius = 6;
      
      ctx.fillStyle = '#4CAF50';
      drawRoundedRect(ctx, labelX, labelY, textWidth + labelPadding * 2, labelHeight, labelRadius);
      ctx.fill();

      // Draw label text
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(label, labelX + labelPadding, labelY + labelHeight - 6);
    });
  }, [detections]);

  // Redraw boxes when image loads or detections change
  useEffect(() => {
    if (imageRef.current && imageRef.current.complete) {
      drawBoundingBoxes();
    }
  }, [detections, drawBoundingBoxes]);

  // Draw live bounding boxes on video feed
  const drawLiveBoxes = useCallback(() => {
    if (!liveCanvasRef.current || !videoRef.current) return;

    const canvas = liveCanvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Use smoothed detections for stable display
    const detectionsToDraw = liveDetections.length > 0 ? liveDetections : smoothedDetectionsRef.current;
    
    // Filter by confidence > 75%
    const highConfidenceDetections = detectionsToDraw.filter(det => det.confidence >= 0.75);

    if (highConfidenceDetections.length === 0) return;

    highConfidenceDetections.forEach((det) => {
      const [x1, y1, x2, y2] = det.bbox;
      const width = x2 - x1;
      const height = y2 - y1;
      const radius = 8; // Rounded corner radius

      // Draw filled rounded rectangle with light green translucent fill
      ctx.fillStyle = 'rgba(76, 175, 80, 0.12)'; // #4CAF50 at ~12% opacity
      drawRoundedRect(ctx, x1, y1, width, height, radius);
      ctx.fill();

      // Draw rounded rectangle stroke
      ctx.strokeStyle = '#4CAF50'; // Medium green
      ctx.lineWidth = 3;
      drawRoundedRect(ctx, x1, y1, width, height, radius);
      ctx.stroke();

      // Draw label background (rounded rectangle)
      const label = `${det.class_name} ${(det.confidence * 100).toFixed(0)}%`;
      ctx.font = 'bold 16px Arial';
      const textWidth = ctx.measureText(label).width;
      const labelHeight = 24;
      const labelPadding = 10;
      const labelX = x1;
      const labelY = y1 - labelHeight - 4;
      const labelRadius = 6;
      
      ctx.fillStyle = '#4CAF50';
      drawRoundedRect(ctx, labelX, labelY, textWidth + labelPadding * 2, labelHeight, labelRadius);
      ctx.fill();

      // Draw label text
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(label, labelX + labelPadding, labelY + labelHeight - 6);
    });
  }, [liveDetections]);

  // Capture frame for live detection
  const captureFrameForLiveDetection = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      return canvas.toDataURL('image/jpeg', 0.7);
    }
    return null;
  };

  // Live detection loop
  useEffect(() => {
    if (cameraState === 'available' && !showModal) {
      liveDetectionInterval.current = setInterval(async () => {
        if (isLiveDetecting || isScanning) return;
        
        try {
          setIsLiveDetecting(true);
          const imageDataUrl = captureFrameForLiveDetection();
          if (imageDataUrl) {
            const blob = await (await fetch(imageDataUrl)).blob();
            const result = await detectIngredientsBackend(blob, true);
            const rawDetections = result.detections || [];
            
            // Apply smoothing to detections
            const smoothed = smoothDetections(rawDetections);
            setLiveDetections(smoothed);
          }
        } catch (error) {
          console.log('Live detection error (will retry):', error.message);
          // On error, fade out existing detections
          const faded = smoothDetections([]);
          setLiveDetections(faded);
        } finally {
          setIsLiveDetecting(false);
        }
      }, 150); // Detect at ~6.7 FPS (150ms interval) for smooth real-time detection

      return () => {
        if (liveDetectionInterval.current) {
          clearInterval(liveDetectionInterval.current);
        }
      };
    }
  }, [cameraState, showModal, isScanning, isLiveDetecting, smoothDetections]);

  // Draw live boxes when detections update
  useEffect(() => {
    if (cameraState === 'available') {
      drawLiveBoxes();
    }
  }, [liveDetections, cameraState, drawLiveBoxes]);

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
          setDetections(detections);
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
      setDetections(detections);
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

  async function detectIngredientsBackend(imageBlob, isLive = false) {
    try {
      const formData = new FormData();
      formData.append('image', imageBlob, isLive ? 'live-frame.jpg' : 'ingredient-scan.jpg');

      if (!isLive) {
        console.log('📤 Sending image to backend for detection...');
      }

      const response = await fetch(`${API_BASE_URL}/scan`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Detection failed');
      }

      const data = await response.json();
      if (!isLive) {
        console.log('✅ Detection results:', data);
      }

      if (!data.success) {
        throw new Error(data.error || 'Detection failed');
      }

      const detections = data.detections.map(det => ({
        class_name: det.ingredient_name || det.class_name,
        confidence: det.confidence,
        bbox: det.bbox,
        ingredient_id: det.ingredient_id,
        db_matched: det.db_matched,
        original_detection: det.original_detection
      }));

      return { detections };

    } catch (error) {
      if (!isLive) {
        console.error('❌ Backend detection error:', error);
      }
      throw error;
    }
  }

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

  const updateQuantity = (id, newQuantity) => {
    setScannedIngredients(prev => 
      prev.map(ingredient => 
        ingredient.id === id 
          ? { ...ingredient, quantity: Math.max(1, newQuantity) }
          : ingredient
      )
    );
  };

  const addIngredient = () => {
    if (newIngredient.trim()) {
      const newId = Math.max(...scannedIngredients.map(i => i.id), 0) + 1;
      setScannedIngredients(prev => [
        ...prev,
        { 
          id: newId, 
          ingredient_id: null,
          name: newIngredient.trim(), 
          quantity: 1,
          selected: true,
          db_matched: false
        }
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
    setScannedIngredients([]);
    setDetections([]);
    setBackendError(null);
    // Reset smoothed detections when modal closes
    smoothedDetectionsRef.current = [];
    setLiveDetections([]);
  };

  const closeHelpModal = () => {
    setShowHelpModal(false);
  };

  const generateRecipe = async () => {
    const selectedIngredients = scannedIngredients.filter(i => i.selected);
    
    if (selectedIngredients.length === 0) {
      alert('Please select at least one ingredient!');
      return;
    }

    console.log('🍳 Generating recipe and saving to pantry...');

    // ✅ AUTO-SAVE SCANNED INGREDIENTS TO PANTRY
    try {
      const token = localStorage.getItem('token');
      
      if (token) {
        console.log('💾 Saving scanned ingredients to pantry...');
        
        const response = await fetch(`${API_BASE_URL}/pantry/save-scanned-ingredients`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            scannedIngredients: selectedIngredients.map(ing => ({
              ingredient_id: ing.ingredient_id,
              name: ing.name,
              quantity: ing.quantity || 1,
              confidence: ing.confidence || 0,
              db_matched: ing.db_matched || false
            }))
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Saved ${result.savedCount} ingredients to pantry!`);
        } else {
          console.warn('⚠️ Failed to save to pantry, continuing anyway...');
        }
      }
    } catch (error) {
      console.error('❌ Error saving to pantry:', error);
      // Don't block recipe generation if pantry save fails
    }

    // Continue with recipe generation
    const ingredientIds = selectedIngredients
      .filter(ing => ing.ingredient_id !== null)
      .map(ing => ing.ingredient_id);
    
    const ingredientNames = selectedIngredients.map(ing => ing.name);
    
    const params = new URLSearchParams();
    if (ingredientIds.length > 0) {
      params.set('ids', ingredientIds.join(','));
    }
    params.set('ingredients', ingredientNames.join(','));
    
    window.location.href = `/user/recipe?${params.toString()}`;
  };

  const getSelectedCount = () => {
    return scannedIngredients.filter(i => i.selected).length;
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      if (liveDetectionInterval.current) {
        clearInterval(liveDetectionInterval.current);
      }
    };
  }, [startCamera]);

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
        <canvas ref={liveCanvasRef} className="live-bbox-canvas" />
        
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
              {isScanning ? 'Analyzing...' :
               cameraState === 'available' ? 'Scan Ingredient' : 
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
                                <span style={{color: '#4CAF50'}}>   <br />  ✓ In Database</span>
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