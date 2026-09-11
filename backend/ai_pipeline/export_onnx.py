"""
DehatiAI - ONNX Model Exporter for ResNet-50 + CBAM
Converts trained PyTorch .pth weights to production-ready ONNX format
for ultra-low latency (<50ms) and minimal RAM footprint in Node.js / Railway.
"""

import os
import sys
import json
import argparse
import torch

from models.resnet_cbam import ResNet50_CBAM


def export_to_onnx(
    checkpoint_path: str,
    output_onnx_path: str,
    num_classes: int = 306,
    opset_version: int = 14
):
    print(f"🚀 Initializing ResNet50_CBAM (num_classes={num_classes})...")
    model = ResNet50_CBAM(
        num_classes=num_classes,
        pretrained=False,
        freeze_backbone=False
    )

    if os.path.exists(checkpoint_path):
        print(f"📥 Loading weights from: {checkpoint_path}")
        checkpoint = torch.load(checkpoint_path, map_location="cpu")
        if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
            model.load_state_dict(checkpoint["model_state_dict"])
            print(f"✅ Loaded checkpoint with validation accuracy: {checkpoint.get('val_acc', 'N/A')}%")
        elif isinstance(checkpoint, dict):
            model.load_state_dict(checkpoint)
            print("✅ Loaded state dict directly.")
        else:
            model = checkpoint
    else:
        print(f"⚠️ Checkpoint not found at {checkpoint_path}. Exporting randomly initialized architecture for validation.")

    model.eval()

    # Create dummy input: Batch size 1, 3 color channels, 224x224 image
    dummy_input = torch.randn(1, 3, 224, 224, requires_grad=False)

    os.makedirs(os.path.dirname(os.path.abspath(output_onnx_path)), exist_ok=True)

    print(f"🔄 Exporting to ONNX: {output_onnx_path} (opset={opset_version})...")
    torch.onnx.export(
        model,
        dummy_input,
        output_onnx_path,
        export_params=True,
        opset_version=opset_version,
        do_constant_folding=True,
        input_names=["image"],
        output_names=["logits"],
        dynamic_axes={
            "image": {0: "batch_size"},
            "logits": {0: "batch_size"}
        }
    )

    print(f"✅ Export successful! ONNX model saved to: {output_onnx_path}")
    file_size_mb = os.path.getsize(output_onnx_path) / (1024 * 1024)
    print(f"📦 ONNX Model Size: {file_size_mb:.2f} MB")

    # Optional validation with onnxruntime if installed
    try:
        import onnxruntime as ort
        import numpy as np

        print("🧪 Testing ONNX inference with ONNX Runtime...")
        session = ort.InferenceSession(output_onnx_path, providers=["CPUExecutionProvider"])
        test_input = np.random.randn(1, 3, 224, 224).astype(np.float32)
        outputs = session.run(None, {"image": test_input})
        logits = outputs[0]
        print(f"✅ Output logits shape: {logits.shape} (Expected: (1, {num_classes}))")
    except ImportError:
        print("💡 onnxruntime not installed in this environment. Skipping runtime validation.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export ResNet50_CBAM to ONNX")
    parser.add_argument("--checkpoint", type=str, default="./checkpoints/best_model.pth", help="Path to .pth checkpoint")
    parser.add_argument("--output", type=str, default="../models/resnet50_cbam.onnx", help="Path to output .onnx file")
    parser.add_argument("--classes", type=int, default=306, help="Number of output classes")
    parser.add_argument("--opset", type=int, default=14, help="ONNX opset version")

    args = parser.parse_args()
    export_to_onnx(
        checkpoint_path=args.checkpoint,
        output_onnx_path=args.output,
        num_classes=args.classes,
        opset_version=args.opset
    )
