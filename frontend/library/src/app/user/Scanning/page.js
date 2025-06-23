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
import './style.css';

const IngredientScanner = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const ingredientsListRef = useRef(null);
  const [cameraState, setCameraState] = useState('not-started');
  const [isScanning, setIsScanning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false); // New state for help modal
  const [capturedImage, setCapturedImage] = useState(null);
  const [scannedIngredients, setScannedIngredients] = useState([
    { id: 1, name: 'Tomatoes', selected: true },
    { id: 2, name: 'Onions', selected: false },
    { id: 3, name: 'Garlic', selected: true },
    { id: 4, name: 'Bell Peppers', selected: true },
    { id: 5, name: 'Mushrooms', selected: false },
  ]);
  const [newIngredient, setNewIngredient] = useState('');
  const newIngredientRef = useRef(null);

  const startCamera = useCallback(async () => {
    setCameraState('loading');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
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
      
      const imageDataUrl = canvas.toDataURL('image/jpeg');
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

  const handleScan = () => {
    setIsScanning(true);
    captureImage();
    
    setTimeout(() => {
      setIsScanning(false);
      setShowModal(true);
    }, 2000);
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

  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
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
        <h1 className="title">Ingredient Scanner</h1>
        <div className="header-right">
          <button className="help-button" onClick={() => setShowHelpModal(true)}>
            <FontAwesomeIcon icon={faQuestionCircle} className="icon" />
          </button>
        </div>
      </div>

      <div className="camera-feed">
        <video ref={videoRef} autoPlay playsInline />
        
        {isScanning && (
          <div className="scanning-overlay">
            <div className="scanning-content">
              <div className="spinner"></div>
              <p className="scanning-text">Processing image...</p>
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
              <h2>Scanned Ingredients</h2>
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
                  {scannedIngredients.map(ingredient => (
                    <div 
                      key={ingredient.id} 
                      className="ingredient-item"
                      ref={ingredient.id === Math.max(...scannedIngredients.map(i => i.id), 0) ? newIngredientRef : null}
                    >
                      <div className="ingredient-content">
                        <div className="ingredient-info">
                          <span className="ingredient-name">{ingredient.name}</span>
                          <span className="ingredient-subtitle">Lorem ipsum dolor sit amet</span>
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
                  ))}
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

                <button onClick={generateRecipe} className="generate-recipe-button">
                  Generate Recipe
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
                <li>Point the ingredients at the camera.</li>
                <li>Ensure good lighting and a clear view of the ingredients.</li>
                <li>Press the "Scan Ingredient" button to capture the image in real-time.</li>
                <li>Alternatively, upload an image by clicking the upload button and selecting a photo from your device.</li>
                <li>Review and select the detected ingredients in the modal that appears.</li>
                <li>Add or remove ingredients as needed, then click "Generate Recipe" to proceed.</li>
              </ol>

              <h3>Tips</h3>
              <ul>
                <li>Place ingredients on a contrasting background for better detection.</li>
                <li>Take photos in well-lit areas to improve accuracy.</li>
                <li>Use close-up shots for smaller items like spices or herbs.</li>
                <li>Manually add ingredients if the scanner misses any.</li>
              </ul>

              <h3>Troubleshooting</h3>
              <ul>
                <li>If the camera doesn’t work, ensure permissions are granted in your browser settings.</li>
                <li>If ingredients aren’t detected, try adjusting the angle or lighting, or upload a clearer image.</li>
                <li>If the modal doesn’t appear, refresh the page or check your internet connection.</li>
                <li>Contact support if issues persist after trying the above steps.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IngredientScanner;