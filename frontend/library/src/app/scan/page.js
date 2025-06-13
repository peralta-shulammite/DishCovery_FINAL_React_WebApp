'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import * as ort from 'onnxruntime-web';
import './style.css';

const IngredientScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [stream, setStream] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelSession, setModelSession] = useState(null);
  const [modelError, setModelError] = useState(null);
  const [modelLoadingProgress, setModelLoadingProgress] = useState('Initializing...');
  const [analysisResults, setAnalysisResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Load the ONNX model with multiple fallback strategies
  useEffect(() => {
    const loadModel = async () => {
      try {
        console.log('Loading ONNX model...');
        setModelLoadingProgress('Configuring ONNX Runtime...');
        
        // Quick test: First check if model file exists
        try {
          const response = await fetch('/assets/model.onnx', { method: 'HEAD' });
          if (!response.ok) {
            throw new Error(`Model file not accessible: ${response.status}`);
          }
          console.log('Model file found, proceeding with loading...');
        } catch (error) {
          throw new Error(`Model file check failed: ${error.message}. Make sure model.onnx is in /public/assets/`);
        }
        
        // Strategy 1: Try with CDN paths and basic configuration
        try {
          // Set WASM paths to CDN
          ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.1/dist/';
          ort.env.wasm.numThreads = 1;
          ort.env.wasm.simd = false; // Disable SIMD for compatibility
          ort.env.debug = false; // Disable debug logs
          
          setModelLoadingProgress('Loading model with CDN WASM...');
          
          const session = await ort.InferenceSession.create('/assets/model.onnx', {
            executionProviders: ['wasm'],
            graphOptimizationLevel: 'basic',
            enableCpuMemArena: false,
            enableMemPattern: false,
            executionMode: 'sequential'
          });
          
          setModelSession(session);
          setModelLoaded(true);
          setModelError(null);
          setModelLoadingProgress('Model loaded successfully!');
          
          console.log('✅ Model loaded successfully with CDN WASM');
          console.log('Input names:', session.inputNames);
          console.log('Output names:', session.outputNames);
          
          // Log input/output details for debugging
          session.inputNames.forEach(name => {
            const input = session.inputMetadata[name];
            console.log(`Input ${name}:`, input);
          });
          
          session.outputNames.forEach(name => {
            const output = session.outputMetadata[name];
            console.log(`Output ${name}:`, output);
          });
          
          return; // Success, exit function
          
        } catch (error) {
          console.warn('❌ CDN WASM loading failed:', error.message);
          setModelLoadingProgress('Trying with local WASM files...');
        }
        
        // Strategy 2: Try with local WASM files
        try {
          ort.env.wasm.wasmPaths = '/';
          ort.env.wasm.numThreads = 1;
          ort.env.wasm.simd = false;
          ort.env.debug = false;
          
          const session = await ort.InferenceSession.create('/assets/model.onnx', {
            executionProviders: ['wasm'],
            graphOptimizationLevel: 'disabled',
            enableCpuMemArena: false,
            enableMemPattern: false
          });
          
          setModelSession(session);
          setModelLoaded(true);
          setModelError(null);
          setModelLoadingProgress('Model loaded with local WASM!');
          
          console.log('✅ Model loaded with local WASM files');
          return;
          
        } catch (error) {
          console.warn('❌ Local WASM loading failed:', error.message);
          setModelLoadingProgress('Trying JavaScript fallback...');
        }
        
        // Strategy 3: Try CPU/JS execution provider
        try {
          // Clear WASM config for JS fallback
          delete ort.env.wasm.wasmPaths;
          
          const session = await ort.InferenceSession.create('/assets/model.onnx', {
            executionProviders: ['cpu'],
            graphOptimizationLevel: 'disabled'
          });
          
          setModelSession(session);
          setModelLoaded(true);
          setModelError(null);
          setModelLoadingProgress('Model loaded in CPU/JS mode!');
          
          console.log('✅ Model loaded with CPU/JS execution');
          console.warn('⚠️ Running in CPU mode - may be slower');
          return;
          
        } catch (error) {
          console.warn('❌ CPU execution failed:', error.message);
          throw new Error(`All loading strategies failed. Last error: ${error.message}`);
        }
        
      } catch (error) {
        console.error('💥 Model loading completely failed:', error);
        setModelError(error.message);
        setModelLoaded(false);
        setModelLoadingProgress('All loading attempts failed');
        
        // Show user-friendly error messages
        let userMessage = error.message;
        if (error.message.includes('Failed to fetch') || error.message.includes('not accessible')) {
          userMessage = 'Model file not found. Ensure model.onnx is in /public/assets/ folder.';
        } else if (error.message.includes('wasm') || error.message.includes('WASM')) {
          userMessage = 'WebAssembly loading failed. Try refreshing the page or use a different browser.';
        } else if (error.message.includes('Invalid model')) {
          userMessage = 'Model file is corrupted or invalid. Please check the .onnx file.';
        }
        
        setModelError(userMessage);
      }
    };

    // Add a small delay to let the component mount properly
    const timer = setTimeout(loadModel, 500);
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

  // Preprocess image for the model
  const preprocessImage = (imageElement, targetWidth = 224, targetHeight = 224) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    // Draw and resize image
    ctx.drawImage(imageElement, 0, 0, targetWidth, targetHeight);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const data = imageData.data;
    
    // Convert to float32 array and normalize
    // Using channel-first format: [batch, channels, height, width]
    const input = new Float32Array(1 * 3 * targetHeight * targetWidth);
    
    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        const pixelIndex = (y * targetWidth + x) * 4;
        const outputIndex = y * targetWidth + x;
        
        // Normalize to [0, 1] and arrange in CHW format
        input[outputIndex] = data[pixelIndex] / 255.0;     // Red channel
        input[targetHeight * targetWidth + outputIndex] = data[pixelIndex + 1] / 255.0; // Green channel
        input[2 * targetHeight * targetWidth + outputIndex] = data[pixelIndex + 2] / 255.0; // Blue channel
      }
    }
    
    return input;
  };

  // Alternative preprocessing for different input formats
  const preprocessImageHWC = (imageElement, targetWidth = 224, targetHeight = 224) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    ctx.drawImage(imageElement, 0, 0, targetWidth, targetHeight);
    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const data = imageData.data;
    
    // HWC format: [height, width, channels]
    const input = new Float32Array(targetHeight * targetWidth * 3);
    let inputIndex = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      input[inputIndex++] = data[i] / 255.0;     // Red
      input[inputIndex++] = data[i + 1] / 255.0; // Green
      input[inputIndex++] = data[i + 2] / 255.0; // Blue
    }
    
    return input;
  };

  // Analyze image with the actual ONNX model
  const analyzeImage = async (imageDataUrl) => {
    if (!modelLoaded || !modelSession) {
      alert('Model is not loaded yet. Please wait and try again.');
      return;
    }

    try {
      setIsAnalyzing(true);
      console.log('Starting image analysis with ONNX model...');
      
      // Create image element from data URL
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageDataUrl;
      });
      
      // Get model input information
      const inputName = modelSession.inputNames[0];
      const inputMeta = modelSession.inputMetadata[inputName];
      
      console.log('Input metadata:', inputMeta);
      
      // Determine input dimensions from model metadata
      const inputShape = inputMeta.dims;
      console.log('Expected input shape:', inputShape);
      
      let preprocessedData;
      let tensorShape;
      
      // Handle different input shapes
      if (inputShape.length === 4) {
        // 4D tensor: [batch, channels, height, width] or [batch, height, width, channels]
        const [dim0, dim1, dim2, dim3] = inputShape;
        
        if (dim1 === 3 || dim1 === 1) {
          // NCHW format
          tensorShape = inputShape;
          preprocessedData = preprocessImage(img, dim3, dim2);
        } else if (dim3 === 3 || dim3 === 1) {
          // NHWC format
          tensorShape = inputShape;
          preprocessedData = preprocessImageHWC(img, dim2, dim1);
        } else {
          throw new Error(`Unsupported input shape: [${inputShape.join(', ')}]`);
        }
      } else if (inputShape.length === 3) {
        // 3D tensor: [channels, height, width] or [height, width, channels]
        const [dim0, dim1, dim2] = inputShape;
        
        if (dim0 === 3 || dim0 === 1) {
          // CHW format
          tensorShape = [1, ...inputShape]; // Add batch dimension
          preprocessedData = preprocessImage(img, dim2, dim1);
        } else if (dim2 === 3 || dim2 === 1) {
          // HWC format
          tensorShape = [1, ...inputShape]; // Add batch dimension
          preprocessedData = preprocessImageHWC(img, dim1, dim0);
        } else {
          throw new Error(`Unsupported input shape: [${inputShape.join(', ')}]`);
        }
      } else {
        throw new Error(`Unsupported input dimensionality: ${inputShape.length}D`);
      }
      
      // Create tensor with correct shape
      const inputTensor = new ort.Tensor('float32', preprocessedData, tensorShape);
      
      console.log('Input tensor shape:', inputTensor.dims);
      console.log('Input tensor data length:', inputTensor.data.length);
      
      // Run inference
      const feeds = { [inputName]: inputTensor };
      const results = await modelSession.run(feeds);
      
      console.log('Raw model output:', results);
      
      // Process results based on your model's output format
      const outputName = modelSession.outputNames[0];
      const outputTensor = results[outputName];
      const outputData = outputTensor.data;
      
      console.log('Output data:', outputData);
      console.log('Output shape:', outputTensor.dims);
      
      // Convert model output to ingredient predictions
      const predictions = processModelOutput(outputData, outputTensor.dims);
      
      setAnalysisResults(predictions);
      console.log('Analysis complete:', predictions);
      
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Analysis failed: ' + error.message);
      
      // Provide debugging info
      const debugResults = [
        { ingredient: `Error: ${error.message}`, confidence: 0.0, percentage: '0.0' },
        { ingredient: 'Model Status: ' + (modelLoaded ? 'Loaded' : 'Not Loaded'), confidence: 0.5, percentage: '50.0' },
        { ingredient: 'Falling back to mock data', confidence: 0.8, percentage: '80.0' }
      ];
      setAnalysisResults(debugResults);
      
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Process model output into ingredient predictions
  const processModelOutput = (outputData, outputShape) => {
    console.log('Processing model output...');
    console.log('Output shape:', outputShape);
    console.log('Output data sample:', Array.from(outputData).slice(0, 20));
    
    // Handle different output formats
    if (outputShape.length === 2 && outputShape[0] === 1) {
      // Classification output: [1, num_classes]
      const numClasses = outputShape[1];
      const classProbs = Array.from(outputData);
      
      // Common ingredient classes (customize based on your model)
      const ingredientClasses = [
        'Wheat Flour', 'Sugar', 'Salt', 'Milk', 'Eggs', 'Butter', 'Vanilla Extract',
        'Baking Powder', 'Cocoa Powder', 'Vegetable Oil', 'Water', 'Corn Syrup',
        'Artificial Flavoring', 'Preservatives', 'Vitamins', 'Minerals', 'Starch',
        'Glucose', 'Fructose', 'Maltodextrin', 'Soy Lecithin', 'Natural Flavors',
        'Citric Acid', 'Sodium Bicarbonate', 'Calcium Carbonate'
      ];
      
      // Apply softmax to get probabilities
      const maxLogit = Math.max(...classProbs);
      const expProbs = classProbs.map(x => Math.exp(x - maxLogit));
      const sumExp = expProbs.reduce((sum, x) => sum + x, 0);
      const softmaxProbs = expProbs.map(x => x / sumExp);
      
      // Create predictions
      const predictions = softmaxProbs.map((prob, index) => ({
        ingredient: ingredientClasses[index] || `Class_${index}`,
        confidence: prob,
        percentage: (prob * 100).toFixed(1)
      }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5)
      .filter(pred => pred.confidence > 0.01);
      
      return predictions;
    } 
    else if (outputShape.length === 1) {
      // Single output vector
      const dataArray = Array.from(outputData);
      const maxVal = Math.max(...dataArray);
      const minVal = Math.min(...dataArray);
      
      return [
        { ingredient: `Output Length: ${dataArray.length}`, confidence: 0.9, percentage: '90.0' },
        { ingredient: `Max Value: ${maxVal.toFixed(4)}`, confidence: 0.8, percentage: '80.0' },
        { ingredient: `Min Value: ${minVal.toFixed(4)}`, confidence: 0.7, percentage: '70.0' },
        { ingredient: `Mean Value: ${(dataArray.reduce((a, b) => a + b, 0) / dataArray.length).toFixed(4)}`, confidence: 0.6, percentage: '60.0' }
      ];
    }
    
    // Default case - show debug info
    return [
      { ingredient: `Shape: [${outputShape.join(', ')}]`, confidence: 0.9, percentage: '90.0' },
      { ingredient: `Data Points: ${outputData.length}`, confidence: 0.8, percentage: '80.0' },
      { ingredient: `Type: ${typeof outputData[0]}`, confidence: 0.7, percentage: '70.0' },
      { ingredient: 'Need Custom Processing', confidence: 0.6, percentage: '60.0' }
    ];
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
        <div className="status-indicators">
          <span className={`status-dot ${modelLoaded ? 'status-ready' : 'status-loading'}`}>
            {modelLoaded ? '●' : '○'} Model
          </span>
          {modelError && (
            <span className="status-error" title={modelError}>⚠️ Error</span>
          )}
        </div>
        <button className="help-btn" onClick={() => alert(`Camera is always on\nScan: Toggle scanning overlay\nCamera: Take photo & analyze\n\nModel Status: ${modelLoaded ? 'Ready' : modelLoadingProgress}\n${modelError ? '\nError: ' + modelError : ''}`)}>
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
              {!modelLoaded && (
                <p className="model-status">{modelLoadingProgress}</p>
              )}
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
                <p>{isAnalyzing ? 'Analyzing ingredients with AI model...' : 'Processing image...'}</p>
              </div>
            )}
            
            {/* Results overlay */}
            {analysisResults && !isAnalyzing && (
              <div className="results-overlay-fullscreen">
                <div className="results-content">
                  <h3>Analysis Results</h3>
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
              disabled={!cameraReady}
              title={!modelLoaded ? `Model loading: ${modelLoadingProgress}` : 'Take photo and analyze'}
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
                alert('Results logged to console!');
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