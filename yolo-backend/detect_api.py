from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from ultralytics import YOLO
from PIL import Image
import io
import torch
import logging
import gc
import os
from typing import Optional, List, Dict
from datetime import datetime

# Optional Gemini AI import - won't break if package is not installed
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    genai = None

# Configure logging with timestamps
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

model = None
device = None
model_loading = False
model_load_error = None
gemini_model = None
gemini_enabled = False
startup_time = None  # Track when the service started

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global model, device, model_loading, model_load_error, gemini_model, gemini_enabled, startup_time
    startup_time = datetime.now().isoformat()
    logger.info(f"Starting Dishcovery YOLO Detection API at {startup_time}")
    model_loading = True
    try:
        # Auto-detect device: use GPU if available, otherwise CPU
        if torch.cuda.is_available():
            device = "cuda"
            logger.info(f"Using device: {device} (GPU: {torch.cuda.get_device_name(0)})")
            logger.info(f"CUDA Version: {torch.version.cuda}")
        else:
            device = "cpu"
            os.environ['CUDA_VISIBLE_DEVICES'] = '-1'
            logger.info(f"Using device: {device} (CPU mode - no GPU detected)")
        
        logger.info("Loading YOLOv8 model...")
        
        # Check if model file exists
        if not os.path.exists("best.pt"):
            raise FileNotFoundError("Model file 'best.pt' not found. Please upload your trained model.")
        
        # Load model
        model = YOLO("best.pt")
        model.to(device)
        
        # Warm up model
        logger.info("Warming up model...")
        dummy_img = Image.new('RGB', (224, 224), color='white')
        _ = model.predict(dummy_img, conf=0.25, verbose=False)
        
        logger.info(f"Model loaded successfully! Classes: {len(model.names)}")
        logger.info(f"Available classes: {model.names}")
        
        # Initialize Gemini AI
        if not GEMINI_AVAILABLE:
            logger.info("google-generativeai package not installed - AI summaries disabled")
            logger.info("To enable: pip install google-generativeai")
            gemini_enabled = False
        else:
            gemini_api_key = os.getenv("GEMINI_API_KEY")
            gemini_model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
            if gemini_api_key:
                try:
                    logger.info("Initializing Gemini AI...")
                    genai.configure(api_key=gemini_api_key)
                    gemini_model = genai.GenerativeModel(gemini_model_name)
                    gemini_enabled = True
                    logger.info(f"Gemini AI initialized successfully! (model: {gemini_model_name})")
                except Exception as e:
                    logger.warning(f"Failed to initialize Gemini AI: {str(e)}")
                    logger.warning("Detection summaries will not use AI enhancement")
                    gemini_enabled = False
            else:
                logger.info("GEMINI_API_KEY not set - AI summaries disabled")
                gemini_enabled = False
        
        gc.collect()
        
    except Exception as e:
        logger.error(f"Failed to load model: {str(e)}")
        model_load_error = str(e)
        raise
    finally:
        model_loading = False
    
    logger.info(f"API startup complete at {datetime.now().isoformat()}")
    yield
    
    # Shutdown
    shutdown_time = datetime.now().isoformat()
    uptime = ""
    if startup_time:
        start_dt = datetime.fromisoformat(startup_time)
        uptime_seconds = (datetime.now() - start_dt).total_seconds()
        uptime = f" (uptime: {uptime_seconds:.1f}s)"
    logger.info(f"Shutting down at {shutdown_time}{uptime}")

app = FastAPI(title="Dishcovery YOLO Detection API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    uptime_seconds = None
    if startup_time:
        start_dt = datetime.fromisoformat(startup_time)
        uptime_seconds = (datetime.now() - start_dt).total_seconds()
    
    return {
        "status": "online",
        "service": "Dishcovery YOLO Detection API",
        "timestamp": datetime.now().isoformat(),
        "startup_time": startup_time,
        "uptime_seconds": uptime_seconds,
        "device": device,
        "model_loaded": model is not None,
        "model_loading": model_loading,
        "model_error": model_load_error,
        "gemini_enabled": gemini_enabled
    }

@app.get("/ping")
@app.head("/ping")
async def ping():
    uptime_seconds = None
    if startup_time:
        start_dt = datetime.fromisoformat(startup_time)
        uptime_seconds = (datetime.now() - start_dt).total_seconds()
    
    return {
        "status": "pong",
        "timestamp": datetime.now().isoformat(),
        "uptime_seconds": uptime_seconds,
        "service": "Dishcovery YOLO Detection API"
    }

@app.get("/health")
@app.head("/health")  
async def health_check():
    current_time = datetime.now().isoformat()
    uptime_seconds = None
    if startup_time:
        start_dt = datetime.fromisoformat(startup_time)
        uptime_seconds = (datetime.now() - start_dt).total_seconds()
    
    if model_loading:
        return JSONResponse(
            status_code=200,
            content={
                "status": "loading",
                "timestamp": current_time,
                "startup_time": startup_time,
                "uptime_seconds": uptime_seconds,
                "message": "Model is being loaded, please wait...",
                "device": device
            }
        )
    
    if model_load_error:
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "timestamp": current_time,
                "startup_time": startup_time,
                "uptime_seconds": uptime_seconds,
                "message": model_load_error,
                "device": device
            }
        )
    
    return {
        "status": "healthy" if model is not None else "unhealthy",
        "timestamp": current_time,
        "startup_time": startup_time,
        "uptime_seconds": uptime_seconds,
        "device": device,
        "cuda_available": torch.cuda.is_available(),
        "model_loaded": model is not None,
        "classes": len(model.names) if model else 0,
        "gemini_enabled": gemini_enabled
    }

def resize_image(image, max_size=224):
    width, height = image.size
    
    if width <= max_size and height <= max_size:
        return image
    
    if width > height:
        new_width = max_size
        new_height = int((max_size / width) * height)
    else:
        new_height = max_size
        new_width = int((max_size / height) * width)
    
    logger.info(f"Resizing from {width}x{height} to {new_width}x{new_height}")
    return image.resize((new_width, new_height), Image.LANCZOS)

async def generate_ai_summary(detections: List[Dict]) -> Optional[str]:
    if not GEMINI_AVAILABLE or not gemini_enabled or not gemini_model:
        return None
    
    try:
        if not detections:
            return None
        
        ingredients = [f"{det['class_name']} ({det['confidence']*100:.1f}%)" for det in detections]
        ingredient_list = ", ".join(ingredients)
        
        prompt = f"""You are a helpful cooking assistant. Based on the following detected ingredients from an image, provide a brief, friendly summary (2-3 sentences) that:
1. Lists the main ingredients detected
2. Suggests what dish could be made with these ingredients
3. Mentions any interesting combinations
Detected ingredients: {ingredient_list}
Provide a concise, natural summary in a friendly tone:"""
        
        response = gemini_model.generate_content(prompt)
        summary = response.text.strip()
        logger.info("Generated AI summary using Gemini")
        return summary
        
    except Exception as e:
        logger.warning(f"Failed to generate AI summary: {str(e)}")
        return None

@app.post("/scan")
async def scan_ingredients(file: UploadFile = File(...)):
    is_live = file.filename and 'live-frame' in file.filename
    return await detect_ingredients(file, is_live=is_live)

@app.post("/detect")
async def detect_ingredients(file: UploadFile = File(...), is_live: bool = False):
    if model_loading:
        raise HTTPException(status_code=503, detail="Model is still loading. Please wait a moment and try again.")
    
    if model is None:
        error_msg = model_load_error or "Model not loaded"
        raise HTTPException(status_code=503, detail=f"Model not available: {error_msg}")
    
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        original_width, original_height = image.size
        
        if not is_live:
            logger.info(f"Original image: {original_width}x{original_height}, mode: {image.mode}")
        
        if original_width <= 224 or original_height <= 224:
            resized_image = image
            resized_width, resized_height = original_width, original_height
        else:
            resized_image = resize_image(image, max_size=224)
            resized_width, resized_height = resized_image.size
            
        if not is_live:
            logger.info(f"Resized image: {resized_width}x{resized_height}")
        
        scale_x = original_width / resized_width
        scale_y = original_height / resized_height
        
        results = model.predict(
            resized_image, 
            conf=0.70,
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
                
                pixel_box = [
                    box[0] * scale_x,
                    box[1] * scale_y,
                    box[2] * scale_x,
                    box[3] * scale_y
                ]
                
                normalized_box = [
                    pixel_box[0] / original_width,
                    pixel_box[1] / original_height,
                    pixel_box[2] / original_width,
                    pixel_box[3] / original_height
                ]
                
                detections.append({
                    "bbox": pixel_box,
                    "bbox_normalized": normalized_box,
                    "confidence": round(conf, 3),
                    "class_id": cls,
                    "class_name": model.names[cls]
                })
        
        if not is_live:
            logger.info(f"Detected {len(detections)} ingredients")
        
        ai_summary = None
        if gemini_enabled and not is_live and len(detections) > 0:
            ai_summary = await generate_ai_summary(detections)
        
        response_data = {
            "success": True,
            "device": device,
            "num_detections": len(detections),
            "detections": detections,
            "class_names": model.names,
            "image_dimensions": {
                "original": {"width": original_width, "height": original_height},
                "resized": {"width": resized_width, "height": resized_height}
            }
        }
        
        if ai_summary:
            response_data["ai_summary"] = ai_summary
            response_data["gemini_enabled"] = True
        
        return JSONResponse(response_data)
        
    except Exception as e:
        logger.error(f"Detection error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")
    
    finally:
        # FREE GPU MEMORY AFTER EVERY REQUEST!
        if device == "cuda":
            torch.cuda.empty_cache()
            logger.info("Cleared GPU cache")
        
        gc.collect()
        logger.info("Garbage collection completed")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)