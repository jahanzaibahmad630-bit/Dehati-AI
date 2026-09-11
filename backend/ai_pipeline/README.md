# 🌾 DehatiAI — ResNet-50 + CBAM Agricultural Disease Detection Pipeline

This directory contains the production-grade deep learning pipeline designed to achieve **85%+ real-world accuracy in Pakistani field conditions**.

---

## 📁 Directory Structure
```
backend/ai_pipeline/
├── models/
│   ├── __init__.py
│   ├── cbam.py              # Channel & Spatial Attention Module (ECCV 2018)
│   └── resnet_cbam.py       # ResNet-50 Backbone + CBAM on layer4 + Agricultural Head
├── train.py                 # Training script with Pakistani field augmentations & weighted loss
├── export_onnx.py           # ONNX exporter for ultra-fast, zero-overhead Node.js inference
├── inference.py             # 3-tier confidence gating inference engine + Multimodal Fallback
├── class_names.json         # 306 Pakistani agricultural disease classes index
├── requirements.txt         # PyTorch & ONNX dependencies
└── README.md
```

---

## ⚡ Architectural Highlights

1. **CBAM (Convolutional Block Attention Module)**:
   - **Channel Attention**: Discovers *which* pathological symptoms (fungal spots, necrosis) are key.
   - **Spatial Attention**: Focuses *where* lesions are, filtering out background soil, shadows, and water.
2. **Field-Condition Augmentation**:
   - Simulates shaky hand motion blur (`GaussianBlur`), harsh Punjab noon sun (`ColorJitter`), and leaf occlusion (`RandomErasing`).
3. **Severe Class Imbalance Mitigation**:
   - `WeightedRandomSampler` guarantees balanced representation across dominant and rare crop diseases.
   - `CrossEntropyLoss(label_smoothing=0.1)` suppresses overconfidence on noisy mobile photos.
4. **3-Tier Confidence Gating**:
   - **$\ge 70\%$**: Trusted local prediction served immediately.
   - **$50\% - 70\%$**: Triggers Gemini / Claude Vision second opinion.
   - **$< 50\%$**: Transparently guides the farmer to recapture a cleaner, well-lit photo.

---

## 🚀 Quickstart Guide

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Prepare Dataset
Organize your dataset inside `backend/ai_pipeline/data/crop_disease/`:
```
data/crop_disease/
├── train/
│   ├── wheat_yellow_rust/
│   │   ├── img1.jpg
│   │   └── ...
│   ├── rice_sheath_blight/
│   └── ...
└── val/
    ├── wheat_yellow_rust/
    └── ...
```

### 3. Run Training
```bash
python train.py --epochs 30 --batch_size 32 --lr 0.0001
```
*The script automatically evaluates validation accuracy, saves `checkpoints/best_model.pth`, and exports the model to `backend/models/resnet50_cbam.onnx`.*

### 4. Export to ONNX Manually
```bash
python export_onnx.py --checkpoint ./checkpoints/best_model.pth --output ../models/resnet50_cbam.onnx
```

### 5. Run Standalone Inference
```bash
python inference.py path/to/leaf_photo.jpg
```
