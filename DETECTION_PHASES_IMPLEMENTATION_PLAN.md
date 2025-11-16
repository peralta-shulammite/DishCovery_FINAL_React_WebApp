# 🚀 Dishcovery Detection System - 3 Phase Implementation Plan

## Overview

This document outlines the complete implementation plan for upgrading the ingredient detection system through 3 phases:

- **Phase 1**: GPU + YOLOv8m (Performance Upgrade)
- **Phase 2**: Google Vision Pro API (Enhanced Detection)
- **Phase 3**: Reformer Transformer (Advanced Processing)

---

## 📋 PHASE 1: GPU + YOLOv8m

### Use Case: Laptop as Model Server

**Important**: This implementation is designed for running the detection API as a **local server on your laptop** with GPU support. The laptop will serve as the model inference server that other applications/devices can connect to.

### Current State

- ✅ Using CPU only (`device = "cpu"`)
- ✅ Generic YOLO model (`best.pt`)
- ✅ Forced CPU via `CUDA_VISIBLE_DEVICES = -1`
- ✅ Currently deployed on Render (cloud)

### Laptop Server Setup Requirements

#### Your Hardware Specifications (ASUS TUF Gaming F15)

- **Laptop Model**: ASUS TUF Gaming F15 FX506LI
- **CPU**: Intel Core i5-10300H @ 2.50GHz
- **RAM**: 32GB (✅ Excellent for server operations!)
- **GPU**: NVIDIA GTX 1650 Ti (4GB VRAM) + Intel Integrated GPU
- **Storage**: 1.14 TB available (✅ Plenty of space)

#### Hardware Analysis for YOLOv8m on GTX 1650 Ti

- ✅ **GTX 1650 Ti (4GB VRAM)**: Good for YOLOv8m inference
  - YOLOv8m model size: ~50-80MB
  - Inference buffers: ~200-500MB
  - Total VRAM usage: ~300-600MB (fits comfortably in 4GB)
- ✅ **32GB RAM**: Excellent - can handle multiple models/phases simultaneously
- ⚠️ **4GB VRAM**: Need memory optimization (use FP16/mixed precision - REQUIRED)
- ⚠️ **Laptop GPU**: Monitor thermal throttling during continuous server use
- ⚠️ **Multiple GPUs**: Must ensure using NVIDIA GPU, not Intel integrated

#### Hardware Requirements

- **GPU**: NVIDIA GPU with CUDA support (✅ GTX 1650 Ti - Compatible)
- **RAM**: Minimum 8GB, recommended 16GB+ (✅ 32GB - Excellent!)
- **Storage**: Space for model files (~100-500MB per model) (✅ 1.14TB - Plenty)
- **Network**: Stable internet for API requests

#### Software Requirements

- **CUDA Toolkit**: For GPU support (version 11.8 or 12.1)
- **cuDNN**: CUDA Deep Neural Network library
- **Python 3.11+**: For FastAPI server
- **PyTorch with CUDA**: GPU-enabled PyTorch installation

#### Network Configuration

- **Local IP**: Server accessible on local network (e.g., `192.168.1.100:8000`)
- **Port**: Default 8000 (configurable via `PORT` env variable)
- **Firewall**: Allow incoming connections on server port
- **Access**: Other devices on same network can connect

### Implementation Changes

#### 1. GPU Detection & Auto-Fallback

```python
# Auto-detect GPU availability (ASUS TUF F15 - GTX 1650 Ti)
# Force NVIDIA GPU, not Intel integrated
os.environ['CUDA_VISIBLE_DEVICES'] = '0'  # Use NVIDIA GPU

if torch.cuda.is_available():
    device = "cuda:0"  # Use NVIDIA GPU
    gpu_name = torch.cuda.get_device_name(0)
    gpu_memory = torch.cuda.get_device_properties(0).total_memory / 1024**3
    gpu_memory_gb = gpu_memory

    logger.info(f"🚀 GPU detected: {gpu_name} ({gpu_memory_gb:.2f} GB VRAM)")
    logger.info(f"📍 ASUS TUF F15 - GTX 1650 Ti Server Mode")

    # Warn if VRAM is low and enable FP16
    if gpu_memory_gb < 6:
        logger.warning(f"⚠️ Low VRAM ({gpu_memory_gb:.2f}GB) - Using FP16 precision")
        use_fp16 = True
    else:
        use_fp16 = False
        logger.info("✅ Sufficient VRAM - FP16 optional")
else:
    device = "cpu"
    logger.info("⚠️ No GPU available, using CPU")
    logger.warning("💡 GTX 1650 Ti should be available - check CUDA installation")
    use_fp16 = False
```

**Environment Variable Override:**

- `FORCE_CPU=true` → Force CPU even if GPU available (for testing)
- `CUDA_DEVICE=0` → Specify GPU device number (if multiple GPUs)
- `SERVER_HOST=0.0.0.0` → Allow connections from other devices on network
- `SERVER_PORT=8000` → Server port (default 8000)

#### 2. YOLOv8m Model Upgrade

- Load `yolov8m.pt` (medium size) instead of `best.pt`
- Better accuracy than YOLOv8n (nano)
- Slower than YOLOv8n but more accurate
- Can still use custom trained model if it's YOLOv8m-based

#### 3. Memory Management (GTX 1650 Ti - 4GB VRAM Specific)

**Critical for GTX 1650 Ti:**

- **GPU Memory**: 4GB VRAM is sufficient but requires optimization
  - YOLOv8m model: ~50-80MB
  - Inference buffers: ~200-500MB per image
  - Total usage: ~300-600MB (comfortably fits in 4GB)
  - **Use FP16 (Mixed Precision) - REQUIRED** to reduce memory by ~50%
- **System RAM**: 32GB is excellent - can cache multiple models/phases
- **Memory Cleanup**: Clear GPU cache after each detection to prevent OOM errors
- **Batch Size**: Use `batch_size=1` for GTX 1650 Ti (single image processing)
- **Mixed Precision (FP16)**: **MANDATORY** for GTX 1650 Ti
  - Reduces memory usage by ~50% (from ~600MB to ~300MB)
  - Faster inference (20-30% speedup)
  - Minimal accuracy loss (<1%)
  - Enables running larger models if needed
- **Memory Pooling**: Avoid fragmentation for continuous server operation
- **Thermal Management**:
  - GTX 1650 Ti throttles at 83°C
  - Monitor with `nvidia-smi -l 1`
  - Target: Keep below 80°C
  - Ensure good ventilation (laptop cooling pad recommended)
- **GPU Selection**: Force NVIDIA GPU (not Intel integrated)
  ```python
  # Ensure using NVIDIA GPU, not Intel integrated
  os.environ['CUDA_VISIBLE_DEVICES'] = '0'  # Use first NVIDIA GPU
  ```

#### 4. Code Changes in `detect_api.py`

- Modify `load_model()` function (line 31-66)
- Update device detection logic (line 36-37)
- Add GPU memory management
- Update requirements.txt for GPU PyTorch

#### 5. Requirements Updates (GTX 1650 Ti - CUDA 11.8 Recommended)

```txt
# For GTX 1650 Ti - CUDA 11.8 or 12.1 compatible
torch>=2.5.1  # Install CUDA version (not CPU-only)
torchvision>=0.20.1  # Install CUDA version

# Install command for CUDA 11.8 (recommended for GTX 1650 Ti)
# pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

# Or CUDA 12.1 (if you have newer CUDA toolkit)
# pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
```

**GTX 1650 Ti CUDA Compatibility:**

- ✅ CUDA 11.8 (Recommended - most stable for GTX 1650 Ti)
- ✅ CUDA 12.1 (If you have newer drivers installed)
- Check your CUDA version: Run `nvidia-smi` (shows CUDA version in top right)
- GTX 1650 Ti supports both CUDA 11.x and 12.x

#### 6. Server Configuration for Laptop

```python
# detect_api.py - Server startup
if __name__ == "__main__":
    import uvicorn
    host = os.getenv("SERVER_HOST", "0.0.0.0")  # Allow network access
    port = int(os.getenv("SERVER_PORT", 8000))
    uvicorn.run(
        app,
        host=host,
        port=port,
        timeout_keep_alive=300  # Keep connections alive
    )
```

#### 7. Network Access Setup

- **Local Network**: Accessible via `http://[LAPTOP_IP]:8000`
- **Find Laptop IP**: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
- **Backend Connection**: Update `YOLO_API_URL` in backend to laptop IP
- **Example**: `YOLO_API_URL=http://192.168.1.100:8000/detect`

#### 8. Laptop Server Benefits

- ✅ **No Cloud Costs**: Run inference locally
- ✅ **Low Latency**: Direct network connection
- ✅ **Privacy**: Data stays on your network
- ✅ **Full Control**: Customize model and settings
- ✅ **Offline Capable**: Works without internet (except Phase 2)

---

## 🔍 PHASE 2: Google Vision Pro API

### Architecture Strategy

**Hybrid Approach**: YOLO as primary, Google Vision as fallback/enhancement

### Implementation Details

#### 1. New Service Module

Create `yolo-backend/google_vision_service.py`:

- Google Cloud Vision API client setup
- Authentication via API key
- Environment variable: `GOOGLE_VISION_API_KEY`

#### 2. Integration Strategy

**Option A: Fallback Mode** (Recommended)

- Run YOLO first
- If no detections or low confidence → call Google Vision
- Merge results

**Option B: Parallel Mode**

- Run both YOLO and Google Vision simultaneously
- Merge and deduplicate results
- Faster but more expensive

**Option C: Confidence-Based**

- If YOLO confidence < threshold (e.g., 0.7) → use Google Vision
- Otherwise use YOLO only

#### 3. API Endpoint Changes

- Add query parameter: `?use_google_vision=true`
- New endpoint: `/detect/google` for direct Google Vision
- Automatic fallback based on detection quality

#### 4. Response Format

```json
{
  "success": true,
  "detection_source": "yolo" | "google_vision" | "hybrid",
  "detections": [...],
  "sources": {
    "yolo": {...},
    "google_vision": {...}
  }
}
```

#### 5. Google Vision Features

- **Object Detection**: Detect ingredients as objects
- **Label Detection**: Food categories and labels
- **Text Detection**: Extract text from labels/packaging
- **Product Search**: Match to known products

#### 6. Cost Management

- Rate limiting to control API calls
- Cache common detections
- Usage tracking and monitoring
- Configurable daily/monthly limits

#### 7. Dependencies

```txt
google-cloud-vision>=3.0.0
```

---

## 🤖 PHASE 3: Reformer Transformer

### Purpose

- Sequence processing of detected ingredients
- Text-based ingredient recognition/classification
- Context understanding (e.g., "chicken breast" vs "chicken thigh")
- Post-processing refinement

### Implementation Strategy

#### 1. Model Selection

**Option A: Vision-Language Model**

- CLIP + Reformer hybrid
- Understands both images and text
- Better for ingredient recognition

**Option B: Pure Reformer for Text**

- Hugging Face `google/reformer-*` models
- Process ingredient name sequences
- Text classification and refinement

**Option C: Custom Fine-tuned Model**

- Fine-tune Reformer on ingredient dataset
- Better accuracy for specific use case

#### 2. Use Cases

**Use Case A: Post-Processing Refinement**

```
YOLO Detections → Ingredient Names (text) → Reformer Processing → Refined Results
```

- Input: List of detected ingredient names
- Output: Validated, corrected, and refined ingredient names
- Example: "chiken" → "chicken", "tomatoe" → "tomato"

**Use Case B: Text-Based Detection**

```
Image → OCR (Text Extraction) → Reformer Classification → Ingredient Detection
```

- Extract text from image (labels, packaging, signs)
- Reformer classifies if text is an ingredient
- Useful for packaged goods

**Use Case C: Context Understanding**

```
Ingredient Sequences → Reformer Context Analysis → Validated Ingredients
```

- Example: ["chicken", "breast"] → "chicken breast"
- Understand ingredient combinations
- Validate ingredient relationships

#### 3. Architecture

Create `yolo-backend/reformer_service.py`:

- Load pre-trained Reformer model
- Text tokenization and encoding
- Sequence processing pipeline
- Result formatting

#### 4. Integration Flow

```
Image Upload
    ↓
[Phase 1] YOLOv8m (GPU) → Primary Detection
    ↓
[Phase 2] Google Vision Pro → Fallback/Enhancement (if needed)
    ↓
[Phase 3] Reformer Transformer → Post-processing & Refinement
    ↓
Final Results → Frontend
```

#### 5. Dependencies

```txt
transformers>=4.30.0
tokenizers>=0.13.0
sentencepiece>=0.1.99
```

#### 6. Memory Considerations

- Reformer is memory-efficient but still has overhead
- Load on-demand or lazy loading
- GPU support if available
- Model quantization for smaller memory footprint

---

## 🏗️ OVERALL ARCHITECTURE

### Detection Pipeline Flow

```
┌─────────────────┐
│  Image Upload   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Phase 1: YOLO  │ ← GPU + YOLOv8m (Primary)
│   (GPU Mode)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Phase 2: Google │ ← Fallback/Enhancement
│  Vision Pro API │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Phase 3:        │ ← Post-processing
│  Reformer       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Final Results  │
└─────────────────┘
```

### Configuration System

#### Environment Variables

```bash
# Phase 1: GPU + YOLOv8m
FORCE_CPU=false              # Force CPU even if GPU available
CUDA_DEVICE=0                # GPU device number
YOLO_MODEL_PATH=best.pt      # Model file path
YOLO_MODEL_TYPE=yolov8m      # Model type

# Phase 2: Google Vision
GOOGLE_VISION_API_KEY=xxx    # API key
ENABLE_GOOGLE_VISION=true    # Enable/disable
GOOGLE_VISION_FALLBACK=true  # Use as fallback
GOOGLE_VISION_CONFIDENCE_THRESHOLD=0.7

# Phase 3: Reformer
ENABLE_REFORMER=true         # Enable/disable
REFORMER_MODEL_PATH=xxx      # Model path or HuggingFace ID
REFORMER_USE_GPU=true        # Use GPU for Reformer

# General
DETECTION_PHASE=all          # 1, 2, 3, or "all"
```

#### Feature Flags

- `ENABLE_GOOGLE_VISION`: Toggle Google Vision integration
- `ENABLE_REFORMER`: Toggle Reformer processing
- `DETECTION_PHASE`: Control which phases to use

### API Endpoints

#### Main Endpoints

- `POST /detect` - Main endpoint (uses configured phases)
- `POST /scan` - Alias for /detect (frontend compatibility)

#### Phase-Specific Endpoints

- `POST /detect/yolo` - YOLO only
- `POST /detect/google` - Google Vision only
- `POST /detect/reformer` - Reformer processing only
- `POST /detect/hybrid` - All phases combined

#### Health & Status

- `GET /health` - Service health check
- `GET /status` - Phase status and configuration
- `GET /phases` - List available phases and their status

### Response Format

#### Standard Response

```json
{
  "success": true,
  "phase": "all",
  "device": "cuda:0",
  "num_detections": 5,
  "detections": [
    {
      "bbox": [x1, y1, x2, y2],
      "bbox_normalized": [0.1, 0.2, 0.3, 0.4],
      "confidence": 0.95,
      "class_id": 0,
      "class_name": "chicken",
      "source": "yolo",
      "refined_by": "reformer"
    }
  ],
  "sources": {
    "yolo": {
      "detections": 5,
      "avg_confidence": 0.89
    },
    "google_vision": {
      "detections": 3,
      "used": false
    },
    "reformer": {
      "refined": 2,
      "corrected": 1
    }
  },
  "processing_time": {
    "yolo": 0.15,
    "google_vision": 0.0,
    "reformer": 0.05,
    "total": 0.20
  }
}
```

---

## 📦 IMPLEMENTATION ORDER

### Step 1: Phase 1 (GPU + YOLOv8m)

**Priority: HIGH**

- Foundation for all other phases
- Performance improvement
- Relatively straightforward

**Tasks:**

1. Update `detect_api.py` with GPU detection
2. Modify model loading to use YOLOv8m
3. Add GPU memory management
4. Update requirements.txt
5. Test on GPU and CPU environments

### Step 2: Phase 2 (Google Vision Pro)

**Priority: MEDIUM**

- External API integration
- Straightforward implementation
- Requires API key setup

**Tasks:**

1. Create `google_vision_service.py`
2. Add API key configuration
3. Implement fallback logic
4. Add response merging
5. Add cost tracking
6. Test integration

### Step 3: Phase 3 (Reformer Transformer)

**Priority: MEDIUM-HIGH**

- Most complex implementation
- Requires model setup
- Advanced processing

**Tasks:**

1. Create `reformer_service.py`
2. Select and load model
3. Implement text processing pipeline
4. Add sequence processing
5. Integrate with detection flow
6. Test and optimize

---

## 🧪 TESTING STRATEGY

### Unit Tests

- Test each phase independently
- Mock external APIs (Google Vision)
- Test GPU and CPU fallback

### Integration Tests

- Test combined phase flow
- Test fallback scenarios
- Test error handling

### Performance Tests

- Benchmark each phase
- Measure latency
- Memory usage monitoring
- GPU utilization

### Cost Tests

- Track Google Vision API usage
- Monitor API call frequency
- Test rate limiting

---

## 📊 MONITORING & METRICS

### Key Metrics

- Detection accuracy per phase
- Processing time per phase
- GPU utilization
- API costs (Google Vision)
- Memory usage
- Error rates

### Logging

- Phase selection and execution
- Performance metrics
- Error tracking
- Cost tracking

---

## 🔒 SECURITY CONSIDERATIONS

### API Keys

- Store in environment variables
- Never commit to git
- Use secure key management

### Rate Limiting

- Implement for Google Vision API
- Prevent abuse
- Cost control

### Error Handling

- Graceful degradation
- Fallback mechanisms
- User-friendly error messages

---

## 📝 NOTES

- All phases should be backward compatible
- Frontend should work with any phase configuration
- Environment-based configuration for flexibility
- Comprehensive logging for debugging
- Cost monitoring for Google Vision API

---

## 🚀 DEPLOYMENT

### Development

- Test each phase locally
- Use environment variables for configuration
- Mock external services for testing

### Laptop Server Deployment

#### Setup Steps (ASUS TUF F15 - GTX 1650 Ti)

1. **Check GPU & CUDA**

   ```bash
   # Check if NVIDIA GPU is detected
   nvidia-smi

   # Should show:
   # - GTX 1650 Ti
   # - CUDA Version: 11.8 or 12.x (in top right)
   # - Driver Version
   # - GPU Memory: 4096 MiB
   ```

2. **Install CUDA Toolkit (if not installed)**

   - Download CUDA 11.8 from NVIDIA website (recommended for GTX 1650 Ti)
   - GTX 1650 Ti supports CUDA 11.8 and 12.1
   - Install CUDA Toolkit matching your driver version
   - Verify installation: `nvcc --version`

3. **Install PyTorch with CUDA**

   ```bash
   # For CUDA 11.8 (recommended for GTX 1650 Ti)
   pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

   # Or for CUDA 12.1 (if you have newer CUDA)
   # pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121

   # Verify installation
   python -c "import torch; print('CUDA Available:', torch.cuda.is_available()); print('GPU:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'None')"
   # Should output: CUDA Available: True and GPU: NVIDIA GeForce GTX 1650 Ti
   ```

4. **Install Dependencies**

   ```bash
   cd yolo-backend
   pip install -r requirements.txt
   ```

5. **Configure Network**

   ```bash
   # Find your laptop IP address
   ipconfig  # Windows
   # or
   ifconfig  # Mac/Linux

   # Update backend .env file
   YOLO_API_URL=http://[YOUR_LAPTOP_IP]:8000/detect
   ```

6. **Start Server**

   ```bash
   cd yolo-backend
   python detect_api.py
   # Server will run on http://0.0.0.0:8000
   ```

7. **Test Connection**
   ```bash
   # From another device on same network
   curl http://[LAPTOP_IP]:8000/health
   ```

#### Laptop Server Considerations

- **Always-On**: Keep laptop running for server availability
- **Power Management**: Disable sleep mode when server is running
- **Network Stability**: Use wired connection if possible
- **Firewall**: Allow port 8000 in Windows Firewall
- **GPU Temperature**: Monitor GPU temp, laptops can throttle
- **Battery**: Keep plugged in for consistent performance

#### Performance Optimization for ASUS TUF F15 (GTX 1650 Ti)

**NVIDIA Control Panel Settings:**

1. Open NVIDIA Control Panel → Manage 3D Settings → Global Settings
2. Set "Preferred graphics processor" to "High-performance NVIDIA processor"
3. Power management mode: "Prefer maximum performance"
4. Texture filtering - Quality: "Performance" (for faster inference)
5. Vertical sync: "Off" (for lower latency)

**Windows Power Settings:**

- Power Plan: "High Performance" or "Ultimate Performance"
- Disable "Turn off display" when plugged in
- Disable "Put computer to sleep" when plugged in
- USB selective suspend: Disabled
- PCI Express → Link State Power Management: Off

**ASUS TUF Specific (Armoury Crate):**

- Use "Turbo Mode" or "Performance Mode"
- Enable "GPU Mode" to use dedicated GPU only (disable Optimus)
- Fan mode: "Performance" or "Turbo" for better cooling
- Monitor GPU temperature in Armoury Crate

**Cooling (Critical for GTX 1650 Ti):**

- **Laptop cooling pad highly recommended** for server use
- Ensure good ventilation (elevate laptop, don't block vents)
- Monitor temperature: `nvidia-smi -l 1` (updates every second)
- Target: Keep GPU temp below 80°C (throttles at 83°C)
- If temp > 80°C: Add cooling pad or reduce server load

**Background Apps:**

- Close games, browsers with GPU acceleration
- Disable Windows Game Mode (can interfere with server)
- Close NVIDIA GeForce Experience overlay
- Free up GPU memory for YOLO model
- Close other GPU-intensive applications

#### Monitoring ASUS TUF F15 Server (GTX 1650 Ti)

**GPU Monitoring:**

```bash
# Continuous monitoring (updates every 1 second)
nvidia-smi -l 1

# Watch for:
# - GPU Utilization: Should be 80-100% during inference
# - Memory Usage: Should be < 2GB for YOLOv8m (with FP16)
# - Temperature: Keep below 80°C (throttles at 83°C) ⚠️ CRITICAL
# - Power: GTX 1650 Ti uses ~50-75W under load
# - Fan Speed: Should increase with temperature
```

**Key Metrics to Watch:**

- **GPU Temp**: ⚠️ **CRITICAL** - GTX 1650 Ti throttles at 83°C
  - Normal: 60-75°C during inference
  - Warning: 75-80°C (add cooling)
  - Throttling: > 83°C (performance drops)
- **VRAM Usage**: Should be ~500MB-1.5GB for YOLOv8m (with FP16)
  - Model: ~50-80MB
  - Buffers: ~200-500MB
  - Total: ~300-600MB (comfortable in 4GB)
- **GPU Utilization**: Should spike to 90-100% during detection
- **Power Draw**: ~50-75W is normal for GTX 1650 Ti under load
- **Memory Clock & GPU Clock**: Should be at max during inference

**Server Logs:**

- Check FastAPI logs for errors
- Monitor detection latency (should be < 200ms with GPU)
- Watch for OOM (Out of Memory) errors
- Monitor request queue if handling multiple requests

**Network:**

- Monitor connection stability
- Test from other devices on network
- Check firewall rules (Windows Firewall)
- Monitor latency: `ping [LAPTOP_IP]`

**Temperature Alerts:**

- If GPU temp > 80°C: Slow down requests or add cooling
- If throttling occurs: Reduce batch size or add delays between requests
- Use laptop cooling pad if temperature consistently high
- Consider reducing server load during hot weather

### Production (Cloud Alternative)

- Enable phases gradually
- Monitor performance and costs
- Have rollback plan ready
- Set up alerts for errors

---

**Last Updated**: [Current Date]
**Status**: Planning Phase
**Next Steps**: Begin Phase 1 implementation
