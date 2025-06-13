'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import './style.css';

const IngredientScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [stream, setStream] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelSession, setModelSession] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);



  // Simulate model loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setModelLoaded(true);
      console.log('Model loaded successfully (simulated)');
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  // Start camera immediately when component loads
  useEffect(() => {
    startCamera();
    
    // Cleanup on unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Simulate image analysis
  const analyzeImage = async (imageDataUrl) => {
    if (!modelLoaded) {
      alert('Model is not loaded yet. Please wait and try again.');
      return;
    }

    try {
      setIsAnalyzing(true);
      console.log('Starting image analysis...');
      
      // Simulate analysis delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock results
      const mockResults = [
        { ingredient: 'Wheat', confidence: 0.85, percentage: '85.0' },
        { ingredient: 'Sugar', confidence: 0.72, percentage: '72.0' },
        { ingredient: 'Milk', confidence: 0.68, percentage: '68.0' },
        { ingredient: 'Salt', confidence: 0.45, percentage: '45.0' },
        { ingredient: 'Vanilla', confidence: 0.32, percentage: '32.0' }
      ];
      
      setAnalysisResults(mockResults);
      console.log('Analysis complete:', mockResults);
      
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Analysis failed: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Start camera function
  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }

      console.log('Starting camera...');
      
      const constraintOptions = [
        {
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        },
        {
          video: { 
            facingMode: 'environment'
          }
        },
        {
          video: true
        }
      ];

      let mediaStream = null;
      let lastError = null;

      for (let i = 0; i < constraintOptions.length; i++) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia(constraintOptions[i]);
          break;
        } catch (error) {
          lastError = error;
          continue;
        }
      }

      if (!mediaStream) {
        throw lastError || new Error('All camera constraint options failed');
      }
      
      setStream(mediaStream);
      setCameraReady(true);
      setCameraError(null);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        const handleVideoLoad = () => {
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                setCameraReady(true);
              })
              .catch(error => {
                console.error('Error playing video:', error);
              });
          }
        };

        videoRef.current.onloadedmetadata = handleVideoLoad;
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      setCameraError(error.message);
      setCameraReady(false);
      
      let errorMessage = 'Camera failed to start: ';
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Permission denied. Please allow camera access.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera found.';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Camera is in use by another app.';
      } else {
        errorMessage += error.message;
      }
      
      setCameraError(errorMessage);
    }
  };

  // Toggle scanning overlay
  const toggleScanning = () => {
    if (!cameraReady) {
      alert('Camera is not ready yet. Please wait or check permissions.');
      return;
    }
    
    setIsScanning(!isScanning);
    setCapturedImage(null);
    setAnalysisResults(null);
  };

  // Capture single image
  const captureImage = async () => {
    if (!cameraReady || !stream) {
      alert('Camera is not ready. Please wait for camera to load.');
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (video && canvas && video.videoWidth > 0 && video.videoHeight > 0) {
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        context.drawImage(video, 0, 0);
        const imageDataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(imageDataUrl);
        setIsScanning(false);
        setAnalysisResults(null);
        
        // Automatically start analysis
        if (modelLoaded) {
          analyzeImage(imageDataUrl);
        }
        
      } else {
        alert('Camera not ready for capture. Please try again.');
      }
    } catch (error) {
      console.error('Error capturing image:', error);
      alert('Failed to capture image: ' + error.message);
    }
  };

  return (
    <div className="scanner-container">
      {/* Header overlay */}
      <header className="header-overlay">
        <h1 className="title">Ingredient Scanner</h1>
        <button className="help-btn" onClick={() => alert('Camera is always on\nScan: Toggle scanning overlay\nCamera: Take photo & analyze')}>
          ?
        </button>
      </header>

      {/* Full screen camera view */}
      <div className="camera-fullscreen">
        {/* Show error if camera failed */}
        {cameraError && !cameraReady && (
          <div className="camera-error-fullscreen">
            <div className="error-content">
              <div className="error-icon">
                <FontAwesomeIcon icon={faExclamationTriangle} />
              </div>
              <p>{cameraError}</p>
              <button className="retry-btn" onClick={startCamera}>
                Retry Camera
              </button>
            </div>
          </div>
        )}

        {/* Show loading if camera is starting */}
        {!cameraReady && !cameraError && (
          <div className="camera-loading-fullscreen">
            <div className="loading-content">
              <div className="loading-spinner"></div>
              <p>Starting camera...</p>
            </div>
          </div>
        )}

        {/* Camera is ALWAYS visible when ready */}
        {cameraReady && !capturedImage && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="camera-video-fullscreen"
          />
        )}

        {/* Scanning overlay */}
        {cameraReady && !capturedImage && isScanning && (
          <div className="scanning-overlay-fullscreen">
            <div className="scan-frame"></div>
            <p className="scan-instruction">Position ingredient label within the frame</p>
          </div>
        )}

        {/* Show captured image */}
        {capturedImage && (
          <>
            <img src={capturedImage} alt="Captured ingredient" className="captured-image-fullscreen" />
            
            {/* Analysis overlay */}
            {(isAnalyzing || !analysisResults) && (
              <div className="analysis-overlay-fullscreen">
                <div className="analysis-spinner"></div>
                <p>{isAnalyzing ? 'Analyzing ingredients...' : 'Processing image...'}</p>
              </div>
            )}
            
            {/* Results overlay */}
            {analysisResults && !isAnalyzing && (
              <div className="results-overlay-fullscreen">
                <div className="results-content">
                  <h3>Detected Ingredients</h3>
                  <div className="ingredients-list">
                    {analysisResults.map((result, index) => (
                      <div key={index} className="ingredient-item">
                        <span className="ingredient-name">{result.ingredient}</span>
                        <span className="ingredient-confidence">{result.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      {/* Bottom controls overlay */}
      <footer className="controls-overlay">
        {!capturedImage && (
          <>
            <button 
              className="scan-btn" 
              onClick={toggleScanning}
              disabled={!cameraReady}
            >
              {isScanning ? 'Stop Scanning' : 'Scan Ingredient'}
            </button>
            <button 
              className="camera-icon-btn" 
              onClick={captureImage}
              disabled={!cameraReady || !modelLoaded}
            >
              <FontAwesomeIcon icon={faCamera} />
            </button>
          </>
        )}

        {capturedImage && (
          <div className="result-controls">
            <button className="control-btn secondary" onClick={() => {
              setCapturedImage(null);
              setIsScanning(false);
              setAnalysisResults(null);
            }}>
              Retake
            </button>
            <button className="control-btn primary" onClick={() => {
              if (analysisResults) {
                console.log('Final results:', analysisResults);
                alert('Results saved! Check console for details.');
              }
              setCapturedImage(null);
              setIsScanning(false);
              setAnalysisResults(null);
            }}>
              {analysisResults ? 'Save Results' : 'Analyze'}
            </button>
          </div>
        )}
      </footer>
    </div>
  );
};

export default IngredientScanner;