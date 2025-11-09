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
import { pantryAPI } from '../utils/pantryAPI';
import { recipesAPI } from '../utils/recipesAPI';

// Use your existing env variable name
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

const IngredientScanner = () => {
  // ✅ FIXED: Check for mobile in useEffect to avoid SSR error
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    }
  }, []);
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
  const [availableIngredients, setAvailableIngredients] = useState([]); // Cache of all ingredients from database
  const smoothedDetectionsRef = useRef([]);
  const captureResolutionRef = useRef({ width: 0, height: 0 });
  
  // 🆕 State for saving to pantry and generating recipes
  const [isSavingToPantry, setIsSavingToPantry] = useState(false);
  const [showRecipesModal, setShowRecipesModal] = useState(false);
  const [filteredRecipes, setFilteredRecipes] = useState([]);

  const handleGoBack = () => {
    window.history.back();
  };
  
  // 🆕 Get count of selected ingredients
  const getSelectedCount = () => {
    return scannedIngredients.filter(ing => ing.selected).length;
  };
  
  // 🆕 Generate Recipe - Navigate to recipe page with filtered recipes
  const generateRecipe = async () => {
    try {
      setIsSavingToPantry(true);
      
      // Get only SELECTED ingredients that matched the database
      const selectedIngredients = scannedIngredients.filter(
        ing => ing.selected && ing.db_matched && ing.ingredient_id
      );
      
      if (selectedIngredients.length === 0) {
        alert('Please select at least one ingredient that is in the database!');
        setIsSavingToPantry(false);
        return;
      }
      
      console.log('🍳 Generating recipes with selected ingredients:', selectedIngredients);
      
      // Get filtered recipes based on these ingredients
      const ingredientIds = selectedIngredients.map(ing => ing.ingredient_id);
      const result = await recipesAPI.getFilteredRecipes({
        scannedIngredients: ingredientIds,
        limit: 50
      });
      
      console.log('✅ Filtered recipes:', result);
      
      if (result.recipes && result.recipes.length > 0) {
        // Navigate to recipe page with ingredient IDs as query parameter
        const ingredientIdsParam = ingredientIds.join(',');
        window.location.href = `/user/recipe?ingredients=${ingredientIdsParam}`;
      } else {
        alert('⚠️ No recipes found matching your ingredients. Try different ingredients!');
        setIsSavingToPantry(false);
      }
      
    } catch (error) {
      console.error('❌ Error generating recipes:', error);
      alert(`Failed to generate recipes: ${error.message}. Please try again.`);
      setIsSavingToPantry(false);
    }
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
        
        // Check if we're using a front camera (laptop) - front cameras are often mirrored
        const videoTrack = stream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        const isFrontCamera = settings.facingMode === 'user' || 
                             (settings.facingMode === undefined && !isMobile);
        
        // Apply mirroring to video display for front cameras (like a mirror)
        // But we'll capture the non-mirrored image for backend
        if (isFrontCamera && videoRef.current) {
          videoRef.current.style.transform = 'scaleX(-1)';
          console.log('🪞 Front camera detected - applying mirror transform to video display');
        }
        
        setCameraState('available');
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setCameraState('denied');
    }
  }, [isMobile]);

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

  // Draw bounding boxes on captured/static image
  const drawBoundingBoxes = useCallback(() => {
    if (!bboxCanvasRef.current || !imageRef.current || detections.length === 0) return;

    const canvas = bboxCanvasRef.current;
    const img = imageRef.current;
    const ctx = canvas.getContext('2d');

    // Get natural (original) and displayed dimensions
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    const displayedWidth = img.width;
    const displayedHeight = img.height;
    
    // Set canvas internal dimensions to match displayed size
    canvas.width = displayedWidth;
    canvas.height = displayedHeight;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate scale factor (bbox coords are in natural dimensions)
    const scaleX = displayedWidth / naturalWidth;
    const scaleY = displayedHeight / naturalHeight;

    // Filter by confidence > 75%
    const highConfidenceDetections = detections.filter(det => det.confidence >= 0.75);

    console.log('📸 Static image bbox:', {
      natural: `${naturalWidth}x${naturalHeight}`,
      displayed: `${displayedWidth}x${displayedHeight}`,
      scale: `${scaleX.toFixed(3)}x${scaleY.toFixed(3)}`,
      detections: highConfidenceDetections.length
    });

    highConfidenceDetections.forEach((det) => {
      // Bbox coordinates are in natural dimensions
      const [x1, y1, x2, y2] = det.bbox;
      
      // Scale to displayed dimensions
      const scaledX1 = x1 * scaleX;
      const scaledY1 = y1 * scaleY;
      const scaledX2 = x2 * scaleX;
      const scaledY2 = y2 * scaleY;
      
      const width = scaledX2 - scaledX1;
      const height = scaledY2 - scaledY1;
      const radius = 12;

      // Draw rounded rectangle stroke
      ctx.strokeStyle = '#4CAF50';
      ctx.lineWidth = 4;
      drawRoundedRect(ctx, scaledX1, scaledY1, width, height, radius);
      ctx.stroke();

      // Draw label
      const label = `${det.class_name.charAt(0).toUpperCase() + det.class_name.slice(1)} (${(det.confidence * 100).toFixed(0)}%)`;
      ctx.font = 'bold 18px Arial';
      const textWidth = ctx.measureText(label).width;
      const labelHeight = 28;
      const labelPadding = 12;
      const labelX = scaledX1;
      const labelY = Math.max(labelHeight + 6, scaledY1 - labelHeight - 6);
      const labelRadius = 6;
      
      ctx.fillStyle = '#4CAF50';
      drawRoundedRect(ctx, labelX, labelY, textWidth + labelPadding * 2, labelHeight, labelRadius);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(label, labelX + labelPadding, labelY + labelHeight - 8);
    });
  }, [detections]);

  // Redraw boxes when image loads, detections change, or window resizes
  useEffect(() => {
    if (imageRef.current && imageRef.current.complete) {
      drawBoundingBoxes();
    }
    
    // Redraw on window resize to handle modal/container size changes
    const handleResize = () => {
      if (imageRef.current && imageRef.current.complete) {
        drawBoundingBoxes();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [detections, drawBoundingBoxes]);

  // Draw live bounding boxes on video feed
  const drawLiveBoxes = useCallback(() => {
    if (!liveCanvasRef.current || !videoRef.current) return;

    const canvas = liveCanvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');

    // Get displayed dimensions of video element
    const videoRect = video.getBoundingClientRect();
    const displayWidth = Math.floor(videoRect.width);
    const displayHeight = Math.floor(videoRect.height);
    
    // Check if video is mirrored (front camera)
    const isVideoMirrored = video.style.transform === 'scaleX(-1)';
    
    if (displayWidth === 0 || displayHeight === 0) return;

    // Set canvas internal dimensions to match displayed dimensions
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Use smoothed detections for stable display
    const detectionsToDraw = liveDetections.length > 0 ? liveDetections : smoothedDetectionsRef.current;
    
    // Filter by confidence > 75%
    const highConfidenceDetections = detectionsToDraw.filter(det => det.confidence >= 0.75);

    if (highConfidenceDetections.length === 0) return;

    // 🎯 NORMALIZED COORDINATES - Simple percentage-based positioning!
    // Backend now returns bbox_normalized (0-1 range) for easy scaling
    
    highConfidenceDetections.forEach((det, idx) => {
      // Use normalized coordinates if available, fallback to pixel coordinates
      const bboxNorm = det.bbox_normalized || det.bbox;
      const isNormalized = !!det.bbox_normalized;
      
      let scaledX1, scaledY1, scaledX2, scaledY2;
      
      if (isNormalized) {
        // Simple multiplication by display dimensions
        let [x1_norm, y1_norm, x2_norm, y2_norm] = bboxNorm;
        
        // If video is mirrored but backend image is not, flip X coordinates
        if (isVideoMirrored) {
          // Flip horizontally: x' = 1 - x
          const tempX1 = x1_norm;
          const tempX2 = x2_norm;
          x1_norm = 1 - tempX2; // Swap and flip
          x2_norm = 1 - tempX1;
        }
        
        scaledX1 = x1_norm * displayWidth;
        scaledY1 = y1_norm * displayHeight;
        scaledX2 = x2_norm * displayWidth;
        scaledY2 = y2_norm * displayHeight;
        
        if (idx === 0) {
          console.log('✅ Normalized Bbox:', det.class_name, 
            `norm=[${(x1_norm*100).toFixed(0)}%,${(y1_norm*100).toFixed(0)}%]`,
            `→ display=[${scaledX1.toFixed(0)},${scaledY1.toFixed(0)}]`
          );
        }
      } else {
        // Fallback: scale from captured dimensions
        const capturedWidth = captureResolutionRef.current.width;
        const capturedHeight = captureResolutionRef.current.height;
        if (!capturedWidth || !capturedHeight) return;
        
        let [x1, y1, x2, y2] = bboxNorm;
        
        // If video is mirrored but backend image is not, flip X coordinates
        if (isVideoMirrored) {
          // Flip horizontally: x' = width - x
          const tempX1 = x1;
          const tempX2 = x2;
          x1 = capturedWidth - tempX2; // Swap and flip
          x2 = capturedWidth - tempX1;
        }
        
        const scaleX = displayWidth / capturedWidth;
        const scaleY = displayHeight / capturedHeight;
        scaledX1 = x1 * scaleX;
        scaledY1 = y1 * scaleY;
        scaledX2 = x2 * scaleX;
        scaledY2 = y2 * scaleY;
      }
      
      const width = scaledX2 - scaledX1;
      const height = scaledY2 - scaledY1;
      
      // Skip if completely outside visible area
      if (scaledX2 < 0 || scaledY2 < 0 || scaledX1 > displayWidth || scaledY1 > displayHeight) {
        return;
      }
      
      const radius = 15;

      // Draw thicker, more visible bounding box
      ctx.strokeStyle = '#00FF00'; // Bright green
      ctx.lineWidth = 5; // Thicker line
      drawRoundedRect(ctx, scaledX1, scaledY1, width, height, radius);
      ctx.stroke();
      
      // Add semi-transparent fill to make bbox more visible
      ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
      drawRoundedRect(ctx, scaledX1, scaledY1, width, height, radius);
      ctx.fill();

      // Draw label with better visibility
      const label = `${det.class_name.charAt(0).toUpperCase() + det.class_name.slice(1)} (${(det.confidence * 100).toFixed(0)}%)`;
      ctx.font = 'bold 20px Arial';
      const textWidth = ctx.measureText(label).width;
      const labelHeight = 32;
      const labelPadding = 14;
      const labelX = Math.max(5, scaledX1);
      const labelY = Math.max(labelHeight + 8, scaledY1 - labelHeight - 8);
      const labelRadius = 8;
      
      // Label background
      ctx.fillStyle = '#00FF00';
      drawRoundedRect(ctx, labelX, labelY, textWidth + labelPadding * 2, labelHeight, labelRadius);
      ctx.fill();

      // Label text
      ctx.fillStyle = '#000000'; // Black text for better contrast
      ctx.fillText(label, labelX + labelPadding, labelY + labelHeight - 10);
    });
  }, [liveDetections]);

  // 🌟 DYNAMIC CAPTURE - Works on ANY screen size/orientation!
  // Captures exactly what's visible, matching display aspect ratio
  const captureFrameForLiveDetection = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      // Get actual display dimensions
      const videoRect = video.getBoundingClientRect();
      const displayWidth = Math.floor(videoRect.width);
      const displayHeight = Math.floor(videoRect.height);
      
      // Calculate capture size maintaining display aspect ratio
      const maxCaptureDimension = isMobile ? 320 : 480;
      const displayAspect = displayWidth / displayHeight;
      
      let captureWidth, captureHeight;
      const isLandscape = displayWidth > displayHeight;
      
      if (isLandscape) {
        // Landscape - width is longer
        captureWidth = maxCaptureDimension;
        captureHeight = Math.round(captureWidth / displayAspect);
      } else {
        // Portrait - height is longer  
        captureHeight = maxCaptureDimension;
        captureWidth = Math.round(captureHeight * displayAspect);
      }
      
      canvas.width = captureWidth;
      canvas.height = captureHeight;
      
      // Store for bbox scaling
      captureResolutionRef.current = { width: captureWidth, height: captureHeight };
      
      console.log('🎯 ORIENTATION:', isLandscape ? 'LANDSCAPE' : 'PORTRAIT', {
        display: `${displayWidth}×${displayHeight}`,
        capture: `${captureWidth}×${captureHeight}`,
        aspectMatch: (displayWidth/displayHeight).toFixed(3) === (captureWidth/captureHeight).toFixed(3) ? '✅' : '❌'
      });
      
      // Calculate visible portion of video (object-fit: cover)
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      const videoAspect = videoWidth / videoHeight;
      
      let srcX = 0, srcY = 0, srcW = videoWidth, srcH = videoHeight;
      
      if (videoAspect > displayAspect) {
        // Video wider - crop sides to match display aspect
        srcH = videoHeight;
        srcW = videoHeight * displayAspect;
        srcX = (videoWidth - srcW) / 2;
      } else {
        // Video taller - crop top/bottom to match display aspect
        srcW = videoWidth;
        srcH = videoWidth / displayAspect;
        srcY = (videoHeight - srcH) / 2;
      }
      
      // Capture only what's visible on screen
      context.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, captureWidth, captureHeight);
      
      return canvas.toDataURL('image/jpeg', 0.5);
    }
    return null;
  };

  // Live detection loop (optimized)
  useEffect(() => {
    if (cameraState === 'available' && !showModal) {
      liveDetectionInterval.current = setInterval(async () => {
        // 🚀 OPTIMIZATION: Skip if previous detection still processing
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
          // Silent error handling for live detection
          console.log('Live detection error (will retry):', error.message);
          // On error, fade out existing detections
          const faded = smoothDetections([]);
          setLiveDetections(faded);
        } finally {
          setIsLiveDetecting(false);
        }
      }, 200); // 🚀 OPTIMIZATION: 200ms = 5 FPS (balanced speed/responsiveness)

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

  // Ensure canvas stays synchronized with video display dimensions
  useEffect(() => {
    if (!videoRef.current || !liveCanvasRef.current) return;
    
    const video = videoRef.current;
    
    const updateCanvasSize = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        // Canvas size is handled in drawLiveBoxes based on displayed dimensions
        drawLiveBoxes();
      }
    };
    
    // Update on video metadata loaded and resize events
    video.addEventListener('loadedmetadata', updateCanvasSize);
    video.addEventListener('resize', updateCanvasSize);
    window.addEventListener('resize', updateCanvasSize);
    
    // Initial update with a small delay to ensure video is ready
    const initialTimer = setTimeout(updateCanvasSize, 100);
    
    return () => {
      video.removeEventListener('loadedmetadata', updateCanvasSize);
      video.removeEventListener('resize', updateCanvasSize);
      window.removeEventListener('resize', updateCanvasSize);
      clearTimeout(initialTimer);
    };
  }, [cameraState, drawLiveBoxes]);

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

  // Search for ingredient in database (case-insensitive, fuzzy matching)
  const searchIngredientInDatabase = (ingredientName) => {
    if (!availableIngredients || availableIngredients.length === 0) {
      return null;
    }

    const searchName = ingredientName.trim().toLowerCase();
    
    // First try exact match (case-insensitive)
    let match = availableIngredients.find(
      ing => ing.name.toLowerCase() === searchName
    );
    
    if (match) {
      return { id: match.id, name: match.name, matched: true };
    }
    
    // Then try fuzzy match (contains)
    match = availableIngredients.find(
      ing => ing.name.toLowerCase().includes(searchName) || searchName.includes(ing.name.toLowerCase())
    );
    
    if (match) {
      return { id: match.id, name: match.name, matched: true };
    }
    
    return { id: null, name: ingredientName.trim(), matched: false };
  };

  const addIngredient = async () => {
    if (newIngredient.trim()) {
      const ingredientName = newIngredient.trim();
      
      // Search for ingredient in database
      const searchResult = searchIngredientInDatabase(ingredientName);
      
      const newId = Math.max(...scannedIngredients.map(i => i.id), 0) + 1;
      setScannedIngredients(prev => [
        ...prev,
        { 
          id: newId, 
          ingredient_id: searchResult?.id || null,
          name: searchResult?.name || ingredientName, 
          quantity: 1,
          selected: true,
          db_matched: searchResult?.matched || false
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

  // Fetch available ingredients from database on component mount
  useEffect(() => {
    const fetchAvailableIngredients = async () => {
      try {
        const response = await pantryAPI.getAvailableIngredients();
        if (response.success && response.ingredients) {
          setAvailableIngredients(response.ingredients);
        }
      } catch (error) {
        console.error('Error fetching available ingredients:', error);
        // Continue without ingredients cache - search will just return false
      }
    };
    
    fetchAvailableIngredients();
  }, []);

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
                              {ingredient.confidence && `Confidence: ${(ingredient.confidence * 100).toFixed(1)}% • `}
                              {ingredient.db_matched ? (
                                <span style={{color: '#4CAF50'}}>✓ In Database</span>
                              ) : (
                                <span style={{color: '#ff9800'}}>⚠ Not in Database</span>
                              )}
                            </span>
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
                  disabled={getSelectedCount() === 0 || isSavingToPantry}
                  style={{
                    background: isSavingToPantry ? '#9e9e9e' : '#4CAF50',
                    cursor: isSavingToPantry ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSavingToPantry ? (
                    <>⏳ Saving to Pantry & Finding Recipes...</>
                  ) : (
                    <>🍳 Generate Recipe ({getSelectedCount()} ingredients)</>
                  )}
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