'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuestion, faCamera, faExpand, faTimes, faPlus, faCheck, faTrash } from '@fortawesome/free-solid-svg-icons';
import './style.css';

const IngredientScanner = () => {
  const [stream, setStream] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraState, setCameraState] = useState('loading');
  const [showModal, setShowModal] = useState(false);
  const [scannedIngredients, setScannedIngredients] = useState([
    { id: 1, name: 'Tomatoes', description: 'Fresh red tomatoes', status: 'pending' },
    { id: 2, name: 'Onions', description: 'Yellow onions, organic', status: 'rejected' },
    { id: 3, name: 'Garlic', description: 'Fresh garlic cloves', status: 'pending' },
    { id: 4, name: 'Olive Oil', description: 'Extra virgin olive oil', status: 'approved' },
    { id: 5, name: 'Salt', description: 'Sea salt, fine grain', status: 'approved' },
    { id: 6, name: 'Black Pepper', description: 'Ground black pepper', status: 'approved' }
  ]);
  const [newIngredient, setNewIngredient] = useState('');
  const videoRef = useRef(null);

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

  const handleScan = () => {
    setIsScanning(true);
    // Simulate scanning process
    setTimeout(() => {
      setIsScanning(false);
      setShowModal(true);
    }, 2000);
  };

  const handleCameraCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      alert('Photo captured!');
    }
  };

  const handleHelp = () => {
    alert('Point your camera at ingredient labels to scan and identify them.');
  };

  const toggleIngredientStatus = (id) => {
    setScannedIngredients(prev => 
      prev.map(ingredient => {
        if (ingredient.id === id) {
          const currentStatus = ingredient.status;
          let newStatus;
          if (currentStatus === 'pending') newStatus = 'approved';
          else if (currentStatus === 'approved') newStatus = 'rejected';
          else newStatus = 'pending';
          return { ...ingredient, status: newStatus };
        }
        return ingredient;
      })
    );
  };

  const removeIngredient = (id) => {
    setScannedIngredients(prev => prev.filter(ingredient => ingredient.id !== id));
  };

  const addIngredient = () => {
    if (newIngredient.trim()) {
      const newId = Math.max(...scannedIngredients.map(i => i.id)) + 1;
      setScannedIngredients(prev => [...prev, {
        id: newId,
        name: newIngredient.trim(),
        description: `Added manually`,
        status: 'pending'
      }]);
      setNewIngredient('');
    }
  };

  const generateRecipe = () => {
    const approvedIngredients = scannedIngredients.filter(i => i.status === 'approved');
    alert(`Generating recipe with ${approvedIngredients.length} ingredients: ${approvedIngredients.map(i => i.name).join(', ')}`);
    setShowModal(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addIngredient();
    }
  };

  return (
    <div className="scanner-container">
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
            <p className="camera-subtitle">Please allow camera access</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="header">
        <div className="header-spacer"></div>
        <h1 className="title">Ingredient Scanner</h1>
        <div className="header-right">
          <button onClick={handleHelp} className="help-button">
            <FontAwesomeIcon icon={faQuestion} className="icon" />
          </button>
        </div>
      </div>

      {/* Scanning Overlay */}
      {isScanning && (
        <div className="scanning-overlay">
          <div className="scanning-content">
            <div className="spinner"></div>
            <p className="scanning-text">Scanning ingredient...</p>
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

          {/* Camera Button */}
          <button 
            onClick={handleCameraCapture} 
            disabled={cameraState !== 'available'}
            className={`camera-button ${cameraState !== 'available' ? 'disabled' : ''}`}
          >
            <FontAwesomeIcon icon={faCamera} className="camera-icon" />
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
                <p className="modal-subtitle">Select ingredients</p>
              </div>
              <div className="modal-header-right">
                <span className="selected-count">{scannedIngredients.filter(i => i.status === 'approved').length} selected ingredients</span>
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
              {/* Left side - Camera preview placeholder */}
              <div className="modal-left">
                <div className="camera-preview">
                  <FontAwesomeIcon icon={faCamera} className="camera-preview-icon" />
                </div>
              </div>

              {/* Right side - Ingredients list */}
              <div className="modal-right">
                {/* Add ingredient input */}
                <div className="add-ingredient-section">
                  <div className="add-ingredient-container">
                    <input
                      type="text"
                      value={newIngredient}
                      onChange={(e) => setNewIngredient(e.target.value)}
                      placeholder="Add ingredient"
                      className="add-ingredient-input"
                      onKeyPress={handleKeyPress}
                    />
                    <button
                      onClick={addIngredient}
                      className="add-ingredient-button"
                    >
                      <FontAwesomeIcon icon={faPlus} className="add-icon" />
                    </button>
                  </div>
                </div>

                {/* Ingredients list */}
                <div className="ingredients-list">
                  {scannedIngredients.map((ingredient) => (
                    <div 
                      key={ingredient.id} 
                      className={`ingredient-item ${ingredient.status}`}
                      onClick={() => toggleIngredientStatus(ingredient.id)}
                    >
                      <div className="ingredient-content">
                        <h4 className="ingredient-name">{ingredient.name}</h4>
                        <p className="ingredient-description">{ingredient.description}</p>
                        {ingredient.status === 'rejected' && (
                          <p className="ingredient-reason">Reason</p>
                        )}
                      </div>
                      <div className="ingredient-actions">
                        <div className="ingredient-status-icon">
                          {ingredient.status === 'approved' && <FontAwesomeIcon icon={faCheck} className="status-approved" />}
                          {ingredient.status === 'rejected' && <FontAwesomeIcon icon={faTimes} className="status-rejected" />}
                          {ingredient.status === 'pending' && <div className="status-pending"></div>}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeIngredient(ingredient.id);
                          }}
                          className="remove-ingredient-button"
                        >
                          <FontAwesomeIcon icon={faTrash} className="remove-icon" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Generate Recipe Button */}
                <button
                  onClick={generateRecipe}
                  disabled={scannedIngredients.filter(i => i.status === 'approved').length === 0}
                  className={`generate-recipe-button ${scannedIngredients.filter(i => i.status === 'approved').length === 0 ? 'disabled' : ''}`}
                >
                  Generate Recipe
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IngredientScanner;