    from fastapi import FastAPI, File, UploadFile, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import JSONResponse
    from ultralytics import YOLO
    from PIL import Image
    import io
    import torch
    import logging

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

    @app.on_event("startup")
    async def load_model():
        global model, device
        try:
            device = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info(f"🔧 Using device: {device}")
            
            logger.info("📦 Loading YOLOv8 model...")
            model = YOLO("best.pt")
            model.to(device)
            logger.info(f"✅ Model loaded successfully! Classes: {len(model.names)}")
            
        except Exception as e:
            logger.error(f"❌ Failed to load model: {str(e)}")
            raise

    @app.get("/")
    async def root():
        return {
            "status": "online",
            "service": "Dishcovery YOLO Detection API",
            "device": device,
            "model_loaded": model is not None
        }

    @app.get("/health")
    @app.head("/health")  
    async def health_check():
        return {
            "status": "healthy" if model is not None else "unhealthy",
            "device": device,
            "cuda_available": torch.cuda.is_available(),
            "model_loaded": model is not None
        }

    def resize_image(image, max_size=640):
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

    @app.post("/detect")
    async def detect_ingredients(file: UploadFile = File(...)):
        if model is None:
            raise HTTPException(status_code=503, detail="Model not loaded")
        
        try:
            contents = await file.read()
            image = Image.open(io.BytesIO(contents))
            
            logger.info(f"🖼️ Original image: {image.size}, mode: {image.mode}")
            
            # ✅ Resize to save memory
            image = resize_image(image, max_size=224)
            logger.info(f"✅ Resized image: {image.size}")
            
            # Run detection
            results = model.predict(image, conf=0.25, iou=0.45, verbose=False)
            
            detections = []
            if len(results) > 0 and results[0].boxes is not None:
                boxes = results[0].boxes
                for i in range(len(boxes)):
                    box = boxes.xyxy[i].tolist()
                    conf = float(boxes.conf[i])
                    cls = int(boxes.cls[i])
                    
                    detections.append({
                        "bbox": box,
                        "confidence": conf,
                        "class_id": cls,
                        "class_name": model.names[cls]
                    })
            
            logger.info(f"✅ Detected {len(detections)} ingredients")
            
            return JSONResponse({
                "success": True,
                "device": device,
                "num_detections": len(detections),
                "detections": detections,
                "class_names": model.names
            })
            
        except Exception as e:
            logger.error(f"❌ Detection error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")

    if __name__ == "__main__":
        import uvicorn
        uvicorn.run(app, host="0.0.0.0", port=8000)