from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import onnxruntime as ort
from PIL import Image
import numpy as np
import io
import logging
import gc
import os
from typing import Optional, List, Dict
from datetime import datetime

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Gemini AI
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    genai = None

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

session = None
class_names = {}
model_loading = False
model_load_error = None
gemini_model = None
gemini_enabled = False
startup_time = None
gpu_active = False
device_name = "CPU"

@asynccontextmanager
async def lifespan(app: FastAPI):
    global session, class_names, model_loading, model_load_error, gemini_model, gemini_enabled, startup_time, gpu_active, device_name
    startup_time = datetime.now().isoformat()
    logger.info(f"Starting DishCovery ONNX Detection API at {startup_time}")
    model_loading = True
    
    try:
        # Initialize ONNX Runtime with DirectML
        logger.info("=" * 60)
        logger.info("Initializing ONNX Runtime with DirectML...")
        
        providers = ort.get_available_providers()
        logger.info(f"Available providers: {providers}")
        
        # Try DirectML first, fallback to CPU
        if 'DmlExecutionProvider' in providers:
            try:
                session = ort.InferenceSession("best.onnx", providers=['DmlExecutionProvider'])
                active_provider = session.get_providers()[0]
                if active_provider == 'DmlExecutionProvider':
                    gpu_active = True
                    device_name = "AMD RX 580 (DirectML)"
                    logger.info("✅ DirectML GPU ACTIVATED!")
                    logger.info(f"Device: {device_name}")
                    logger.info("=" * 60)
                else:
                    raise Exception("DmlExecutionProvider not active")
            except Exception as e:
                logger.warning(f"DirectML initialization failed: {e}")
                logger.info("Falling back to CPU...")
                session = ort.InferenceSession("best.onnx", providers=['CPUExecutionProvider'])
                gpu_active = False
                device_name = "CPU"
        else:
            logger.warning("DmlExecutionProvider not available")
            logger.info("Using CPU mode")
            session = ort.InferenceSession("best.onnx", providers=['CPUExecutionProvider'])
            gpu_active = False
            device_name = "CPU"
        
        logger.info(f"Model loaded successfully!")
        logger.info(f"Active provider: {session.get_providers()[0]}")
        logger.info(f"GPU Active: {gpu_active}")
        
        # Load class names from model metadata or file
        try:
            metadata = session.get_modelmeta()
            if metadata.custom_metadata_map:
                import json
                names_str = metadata.custom_metadata_map.get('names', '{}')
                class_names = json.loads(names_str)
                logger.info(f"Loaded {len(class_names)} classes from model metadata")
        except:
            # Fallback: hardcoded class names
            class_names = {
                0: 'Bay-Leaf', 1: 'Beef', 2: 'BitterGourd', 3: 'BottleGourd', 4: 'Broccoli',
                5: 'Cabbage', 6: 'Carrots', 7: 'Cauliflower', 8: 'Chicken', 9: 'Egg',
                10: 'Eggplant', 11: 'Galunggong', 12: 'Garlic', 13: 'Ginger', 14: 'Milkfish',
                15: 'Onion', 16: 'Papaya', 17: 'Pechay', 18: 'Pork', 19: 'Potato',
                20: 'Pumpkin', 21: 'Sayote', 22: 'StringBeans', 23: 'Tilapia', 24: 'Tomato',
                25: 'WaterSpinach', 26: 'Calamansi', 27: 'Almond', 28: 'Apple', 29: 'Asparagus',
                30: 'Avocado', 31: 'Banana', 32: 'Beans', 33: 'Beet', 34: 'Bell Pepper',
                35: 'Blackberry', 36: 'Blueberry', 37: 'Brussels Sprouts', 38: 'Celery',
                39: 'Cherry', 40: 'Corn', 41: 'Cucumber', 42: 'Grape', 43: 'Green Bean',
                44: 'Green Onion', 45: 'Hot Pepper', 46: 'Kiwi', 47: 'Lemon', 48: 'Lettuce',
                49: 'Lime', 50: 'Mandarin', 51: 'Mushroom', 52: 'Orange', 53: 'Pattypan Squash',
                54: 'Pea', 55: 'Peach', 56: 'Pear', 57: 'Pineapple', 58: 'Radish',
                59: 'Raspberry', 60: 'Strawberry', 61: 'Vegetable Marrow', 62: 'Watermelon'
            }
            logger.info(f"Using fallback class names: {len(class_names)} classes")
        
        # Initialize Gemini
        if GEMINI_AVAILABLE:
            gemini_api_key = os.getenv("GEMINI_API_KEY")
            if gemini_api_key:
                try:
                    genai.configure(api_key=gemini_api_key)
                    gemini_model = genai.GenerativeModel("gemini-2.5-flash")
                    gemini_enabled = True
                    logger.info("Gemini AI initialized")
                except Exception as e:
                    logger.warning(f"Gemini init failed: {e}")
        
        gc.collect()
        
    except Exception as e:
        logger.error(f"Failed to load model: {str(e)}")
        model_load_error = str(e)
        raise
    finally:
        model_loading = False
    
    logger.info(f"API startup complete")
    yield
    
    logger.info(f"Shutting down...")

app = FastAPI(title="DishCovery ONNX Detection API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def preprocess(image: Image.Image, input_size=640):
    """Preprocess image for YOLO ONNX model"""
    # Resize
    img_resized = image.resize((input_size, input_size))
    
    # Convert to numpy array
    img_data = np.array(img_resized).astype(np.float32)
    
    # Normalize to [0, 1]
    img_data = img_data / 255.0
    
    # Transpose to CHW format (channels, height, width)
    img_data = np.transpose(img_data, (2, 0, 1))
    
    # Add batch dimension
    img_data = np.expand_dims(img_data, axis=0)
    
    return img_data

def postprocess(output, conf_threshold=0.70, iou_threshold=0.45, orig_size=(640, 640), input_size=640):
    """Postprocess YOLO ONNX output"""
    detections = []
    
    # Handle different output formats
    if isinstance(output, list):
        output = output[0]
    
    # Output shape: [1, num_predictions, 85] or [1, 85, num_predictions]
    if output.shape[2] > output.shape[1]:
        output = np.transpose(output, (0, 2, 1))
    
    predictions = output[0]
    
    scale_x = orig_size[0] / input_size
    scale_y = orig_size[1] / input_size
    
    for pred in predictions:
        confidence = pred[4]
        
        if confidence < conf_threshold:
            continue
        
        # Get class scores
        class_scores = pred[5:]
        class_id = int(np.argmax(class_scores))
        class_conf = class_scores[class_id]
        
        if class_conf < conf_threshold:
            continue
        
        # Get bbox (center_x, center_y, width, height)
        cx, cy, w, h = pred[0:4]
        
        # Convert to corner coordinates
        x1 = int((cx - w/2) * scale_x)
        y1 = int((cy - h/2) * scale_y)
        x2 = int((cx + w/2) * scale_x)
        y2 = int((cy + h/2) * scale_y)
        
        detections.append({
            "bbox": [x1, y1, x2, y2],
            "bbox_normalized": [
                x1 / orig_size[0],
                y1 / orig_size[1],
                x2 / orig_size[0],
                y2 / orig_size[1]
            ],
            "confidence": round(float(confidence * class_conf), 3),
            "class_id": class_id,
            "class_name": class_names.get(class_id, f"class_{class_id}")
        })
    
    return detections

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "DishCovery ONNX Detection API",
        "device": device_name,
        "gpu_active": gpu_active,
        "model_loaded": session is not None,
        "gemini_enabled": gemini_enabled,
        "classes": len(class_names)
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy" if session else "unhealthy",
        "device": device_name,
        "gpu_active": gpu_active,
        "provider": session.get_providers()[0] if session else None,
        "classes": len(class_names)
    }

async def generate_ai_summary(detections: List[Dict]) -> Optional[str]:
    if not gemini_enabled or not detections:
        return None
    
    try:
        ingredients = [f"{det['class_name']} ({det['confidence']*100:.1f}%)" for det in detections]
        prompt = f"""Brief cooking summary (2-3 sentences):
Detected: {', '.join(ingredients)}
Suggest a dish and mention combinations."""
        
        response = gemini_model.generate_content(prompt)
        return response.text.strip()
    except:
        return None

@app.post("/scan")
@app.post("/detect")
async def detect(file: UploadFile = File(...)):
    if model_loading:
        raise HTTPException(503, "Model loading...")
    
    if session is None:
        raise HTTPException(503, f"Model not loaded: {model_load_error}")
    
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert('RGB')
        orig_w, orig_h = image.size
        
        is_live = file.filename and 'live-frame' in file.filename
        
        if not is_live:
            logger.info(f"Image: {orig_w}x{orig_h}")
        
        # Preprocess
        input_data = preprocess(image, input_size=640)
        
        # Run inference
        input_name = session.get_inputs()[0].name
        outputs = session.run(None, {input_name: input_data})
        
        # Postprocess
        detections = postprocess(outputs, orig_size=(orig_w, orig_h))
        
        if not is_live:
            logger.info(f"Detected {len(detections)} ingredients")
        
        # AI summary
        ai_summary = None
        if gemini_enabled and not is_live and detections:
            ai_summary = await generate_ai_summary(detections)
        
        response = {
            "success": True,
            "device": device_name,
            "gpu_active": gpu_active,
            "num_detections": len(detections),
            "detections": detections,
            "class_names": class_names
        }
        
        if ai_summary:
            response["ai_summary"] = ai_summary
        
        return JSONResponse(response)
        
    except Exception as e:
        logger.error(f"Detection error: {str(e)}")
        raise HTTPException(500, f"Detection failed: {str(e)}")
    finally:
        gc.collect()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)