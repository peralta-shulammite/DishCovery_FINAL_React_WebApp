from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from ultralytics import YOLO
from PIL import Image
import io
import torch
import logging
import gc
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Dishcovery YOLO Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = None
device = None
model_loading = False
model_load_error = None

@app.on_event("startup")
async def load_model():
    global model, device, model_loading, model_load_error
    model_loading = True
    try:
        # Force CPU usage for Render free tier
        device = "cpu"
        os.environ['CUDA_VISIBLE_DEVICES'] = '-1'
        logger.info(f"🔧 Using device: {device}")
        
        logger.info("📦 Loading YOLOv8 model...")
        
        # Check if model file exists
        if not os.path.exists("best.pt"):
            raise FileNotFoundError("Model file 'best.pt' not found. Please upload your trained model.")
        
        # Load model with CPU
        model = YOLO("best.pt")
        model.to(device)
        
        # Run a dummy prediction to warm up the model
        logger.info("🔥 Warming up model...")
        dummy_img = Image.new('RGB', (224, 224), color='white')
        _ = model.predict(dummy_img, conf=0.25, verbose=False)
        
        logger.info(f"✅ Model loaded successfully! Classes: {len(model.names)}")
        logger.info(f"📋 Available classes: {model.names}")
        
        # Force garbage collection to free memory
        gc.collect()
        
    except Exception as e:
        logger.error(f"❌ Failed to load model: {str(e)}")
        model_load_error = str(e)
        raise
    finally:
        model_loading = False

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "Dishcovery YOLO Detection API",
        "device": device,
        "model_loaded": model is not None,
        "model_loading": model_loading,
        "model_error": model_load_error
    }

@app.get("/health")
@app.head("/health")  
async def health_check():
    # Return 200 even if model is loading to prevent Render from killing the service
    if model_loading:
        return JSONResponse(
            status_code=200,
            content={
                "status": "loading",
                "message": "Model is being loaded, please wait...",
                "device": device
            }
        )
    
    if model_load_error:
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "message": model_load_error,
                "device": device
            }
        )
    
    return {
        "status": "healthy" if model is not None else "unhealthy",
        "device": device,
        "cuda_available": torch.cuda.is_available(),
        "model_loaded": model is not None,
        "classes": len(model.names) if model else 0
    }

def resize_image(image, max_size=224):
    """Resize image to fit within max_size while maintaining aspect ratio"""
    width, height = image.size
    
    if width <= max_size and height <= max_size:
        return image
    
    if width > height:
        new_width = max_size
        new_height = int((max_size / width) * height)
    else:
        new_height = max_size
        new_width = int((max_size / height) * width)
    
    logger.info(f"🔄 Resizing from {width}x{height} to {new_width}x{new_height}")
    return image.resize((new_width, new_height), Image.LANCZOS)

@app.post("/scan")
async def scan_ingredients(file: UploadFile = File(...)):
    """Scan endpoint - alias for detect endpoint used by frontend"""
    # Detect if this is a live frame (filename hint)
    is_live = file.filename and 'live-frame' in file.filename
    return await detect_ingredients(file, is_live=is_live)

@app.post("/detect")
async def detect_ingredients(file: UploadFile = File(...), is_live: bool = False):
    # Check if model is still loading
    if model_loading:
        raise HTTPException(
            status_code=503, 
            detail="Model is still loading. Please wait a moment and try again."
        )
    
    if model is None:
        error_msg = model_load_error or "Model not loaded"
        raise HTTPException(status_code=503, detail=f"Model not available: {error_msg}")
    
    try:
        # Read and process image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Store original dimensions
        original_width, original_height = image.size
        
        # 🚀 OPTIMIZATION: Skip verbose logging for live frames
        if not is_live:
            logger.info(f"🖼️ Original image: {original_width}x{original_height}, mode: {image.mode}")
        
        # 🚀 OPTIMIZATION: Skip resizing for already-small live frames (faster!)
        if original_width <= 224 or original_height <= 224:
            resized_image = image
            resized_width, resized_height = original_width, original_height
        else:
            resized_image = resize_image(image, max_size=224)
            resized_width, resized_height = resized_image.size
            
        if not is_live:
            logger.info(f"✅ Resized image: {resized_width}x{resized_height}")
        
        # Calculate scale factors to convert bbox back to original size
        scale_x = original_width / resized_width
        scale_y = original_height / resized_height
        
        # Run detection with lower confidence threshold
        results = model.predict(
            resized_image, 
            conf=0.75,  # Lower threshold to detect more
            iou=0.45, 
            verbose=False,
            device=device
        )
        
        detections = []
        if len(results) > 0 and results[0].boxes is not None:
            boxes = results[0].boxes
            for i in range(len(boxes)):
                box = boxes.xyxy[i].tolist()
                conf = float(boxes.conf[i])
                cls = int(boxes.cls[i])
                
                # Scale pixel coordinates back to original image size
                pixel_box = [
                    box[0] * scale_x,  # x1
                    box[1] * scale_y,  # y1
                    box[2] * scale_x,  # x2
                    box[3] * scale_y   # y2
                ]
                
                # Return NORMALIZED coordinates (0-1 range) based on ORIGINAL image
                # This makes frontend scaling super simple: just multiply by display dimensions!
                normalized_box = [
                    pixel_box[0] / original_width,   # x1_normalized
                    pixel_box[1] / original_height,  # y1_normalized
                    pixel_box[2] / original_width,   # x2_normalized
                    pixel_box[3] / original_height   # y2_normalized
                ]
                
                detections.append({
                    "bbox": pixel_box,  # Pixel coords relative to captured frame
                    "bbox_normalized": normalized_box,  # Normalized (0-1) coords
                    "confidence": round(conf, 3),
                    "class_id": cls,
                    "class_name": model.names[cls]
                })
        
        # 🚀 OPTIMIZATION: Skip logging for live frames
        if not is_live:
            logger.info(f"✅ Detected {len(detections)} ingredients")
        
        # Force garbage collection after detection
        gc.collect()
        
        return JSONResponse({
            "success": True,
            "device": device,
            "num_detections": len(detections),
            "detections": detections,
            "class_names": model.names,
            "image_dimensions": {
                "original": {"width": original_width, "height": original_height},
                "resized": {"width": resized_width, "height": resized_height}
            }
        })
        
    except Exception as e:
        logger.error(f"❌ Detection error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)