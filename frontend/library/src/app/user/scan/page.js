'use client';

import React, { useRef, useEffect, useState } from 'react';
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

const IngredientScanner = () => {
  const [stream, setStream] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraState, setCameraState] = useState('loading');
  const [showModal, setShowModal] = useState(false);
  const [scannedImage, setScannedImage] = useState(null);
  const [scannedIngredients, setScannedIngredients] = useState([]);
  const [newIngredient, setNewIngredient] = useState('');
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastIngredientRef = useRef(null);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    setCameraState('loading');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      setCameraState('available');
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.log('Camera access denied or not available');
      setCameraState('denied');
    }
  };

  const captureImage = () => {
    if (videoRef.current && cameraState === 'available') {
      const canvas = document.createElement('canvas');
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      return canvas.toDataURL('image/jpeg');
    }
    return null;
  };

  const simulateIngredientDetection = () => {
    const mockDetectedIngredients = [
      { name: 'Detected Ingredient 1', description: 'Identified from camera scan' },
      { name: 'Detected Ingredient 2', description: 'Found in scanned image' },
      { name: 'Detected Ingredient 3', description: 'Recognized ingredient' }
    ];
    const numIngredients = Math.floor(Math.random() * 3) + 1;
    const selectedIngredients = mockDetectedIngredients
      .sort(() => 0.5 - Math.random())
      .slice(0, numIngredients);
    return selectedIngredients.map((ingredient, index) => ({
      id: Date.now() + index,
      name: ingredient.name,
      description: ingredient.description,
      status: 'unchecked'
    }));
  };

  const handleScan = () => {
    setIsScanning(true);
    const capturedImage = captureImage();
    setTimeout(() => {
      setIsScanning(false);
      setScannedImage(capturedImage);
      const detectedIngredients = simulateIngredientDetection();
      setScannedIngredients(prev => [...prev, ...detectedIngredients]);
      setShowModal(true);
    }, 2000);
  };

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setScannedImage(e.target.result);
        setIsScanning(true);
        setTimeout(() => {
          setIsScanning(false);
          const detectedIngredients = simulateIngredientDetection();
          setScannedIngredients(prev => [...prev, ...detectedIngredients]);
          setShowModal(true);
        }, 2000);
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

  // This is the function for the modal's input/button
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

  return (
    <div className="scanner-container">
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
            disabled={isScanning || cameraState !== 'available'}
            className={`scan-button ${(isScanning || cameraState !== 'available') ? 'disabled' : ''}`}
          >
            <FontAwesomeIcon icon={faExpand} className="scan-icon" />
            <span>Scan Ingredient</span>
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

                {/* Move the badge here */}
                <div className="selected-count-badge">
                  {scannedIngredients.filter(i => i.status === 'checked').length} selected ingredients
                </div>

                {/* Ingredients list */}
                <div className="ingredients-list">
                  {scannedIngredients.length === 0 ? (
                    <div className="empty-ingredients">
                      <p>No ingredients added yet.</p>
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