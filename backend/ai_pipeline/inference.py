"""
Inference script with 3-tier confidence thresholding + Multimodal Fallback.
Supports both PyTorch (.pth) and ONNX (.onnx) backends.
"""

import os
import sys
import json
import base64
import io
from typing import Dict, Any
from PIL import Image

import torch
import torch.nn.functional as F
from torchvision import transforms

from models.resnet_cbam import ResNet50_CBAM

# ============================================================
# CONFIGURATION & THRESHOLDS
# ============================================================
CONFIDENCE_THRESHOLD = 0.70       # >= 70%: Trust local model output
FALLBACK_THRESHOLD   = 0.50       # 50% - 70%: Trigger Gemini/Claude Vision second opinion
# < 50%: Honest uncertainty prompt for photo recapture

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

PREPROCESS = transforms.Compose([
    transforms.Resize((256, 256)),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    ),
])


class DiseaseDetector:
    def __init__(
        self,
        model_path: str = "./checkpoints/best_model.pth",
        onnx_path: str = "../models/resnet50_cbam.onnx",
        class_names_path: str = "./class_names.json",
        agronomy_db_path: str = "../lib/agronomyDatabase.json"
    ):
        # 1. Load class list
        if os.path.exists(class_names_path):
            with open(class_names_path, "r", encoding="utf-8") as f:
                self.class_names = json.load(f)
        else:
            self.class_names = [f"Disease_{i}" for i in range(306)]

        self.num_classes = len(self.class_names)
        self.onnx_session = None
        self.pytorch_model = None

        # 2. Try loading ONNX session first (much faster, tiny memory)
        if os.path.exists(onnx_path):
            try:
                import onnxruntime as ort
                self.onnx_session = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
                print(f"✅ [DiseaseDetector] Loaded ONNX Runtime: {onnx_path}")
            except Exception as e:
                print(f"⚠️ ONNX load failed ({e}). Falling back to PyTorch.")

        # 3. Fallback to PyTorch model if ONNX unavailable
        if self.onnx_session is None and os.path.exists(model_path):
            try:
                self.pytorch_model = ResNet50_CBAM(
                    num_classes=self.num_classes,
                    pretrained=False,
                    freeze_backbone=False
                ).to(DEVICE)
                ckpt = torch.load(model_path, map_location=DEVICE)
                state_dict = ckpt.get("model_state_dict", ckpt)
                self.pytorch_model.load_state_dict(state_dict)
                self.pytorch_model.eval()
                print(f"✅ [DiseaseDetector] Loaded PyTorch Checkpoint: {model_path}")
            except Exception as e:
                print(f"⚠️ PyTorch load error: {e}")

        # 4. Load Agronomy Database for DRAP treatments
        self.agronomy_db = {}
        if os.path.exists(agronomy_db_path):
            try:
                with open(agronomy_db_path, "r", encoding="utf-8") as f:
                    self.agronomy_db = json.load(f)
            except Exception:
                pass

    def predict_local(self, image: Image.Image):
        """Runs inference via ONNX or PyTorch."""
        image_rgb = image.convert("RGB")
        tensor = PREPROCESS(image_rgb).unsqueeze(0)

        if self.onnx_session:
            np_input = tensor.numpy()
            outputs = self.onnx_session.run(None, {"image": np_input})
            logits = torch.from_numpy(outputs[0])
            probs = F.softmax(logits, dim=1)[0]
        elif self.pytorch_model:
            with torch.no_grad():
                logits = self.pytorch_model(tensor.to(DEVICE))
                probs = F.softmax(logits, dim=1)[0].cpu()
        else:
            # Mock / stub fallback when no weights exist yet
            return self.class_names[0], 0.40, [(self.class_names[0], 0.40)]

        top3_probs, top3_idx = torch.topk(probs, k=min(3, self.num_classes))
        top3 = [
            (self.class_names[idx.item()], prob.item())
            for prob, idx in zip(top3_probs, top3_idx)
        ]

        top_class = top3[0][0]
        top_conf  = top3[0][1]
        return top_class, top_conf, top3

    def predict_with_multimodal_vision(self, image: Image.Image) -> Dict[str, Any]:
        """Calls Gemini or Claude Vision for second opinion when confidence is borderline."""
        # 1. Try Gemini Vision if API key exists
        gemini_key = os.environ.get("GEMINI_API_KEY")
        if gemini_key:
            try:
                from google import genai
                client = genai.Client(api_key=gemini_key)
                buffer = io.BytesIO()
                image.save(buffer, format="JPEG")
                img_bytes = buffer.getvalue()

                prompt = (
                    "Identify the plant disease in this image for Punjab, Pakistan. "
                    "Respond with: 1) Disease Name (Urdu & English), 2) Severity, "
                    "3) Recommended DRAP pesticides and dosages per 20L spray tank."
                )
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=[prompt, genai.types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg")]
                )
                return {"success": True, "source": "gemini_vision", "text": response.text}
            except Exception as e:
                print(f"⚠️ Gemini Vision error: {e}")

        # 2. Try Claude Vision
        claude_key = os.environ.get("CLAUDE_API_KEY") or os.environ.get("ANTHROPIC_API_KEY")
        if claude_key:
            try:
                import anthropic
                client = anthropic.Anthropic(api_key=claude_key)
                buffer = io.BytesIO()
                image.save(buffer, format="JPEG")
                img_b64 = base64.b64encode(buffer.getvalue()).decode()

                msg = client.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=600,
                    messages=[{
                        "role": "user",
                        "content": [
                            {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": img_b64}},
                            {"type": "text", "text": "Identify the crop disease for a Pakistani farmer. Provide verified medicine and dosage."}
                        ]
                    }]
                )
                return {"success": True, "source": "claude_vision", "text": msg.content[0].text}
            except Exception as e:
                print(f"⚠️ Claude Vision error: {e}")

        return {"success": False, "text": "کلاؤڈ وژن سروس دستیاب نہیں ہے۔"}

    def _get_prescription(self, disease_name: str) -> Dict[str, Any]:
        """Look up DRAP medicine and dosage from local agronomy database."""
        clean = disease_name.lower().replace(" ", "_")
        for key, val in self.agronomy_db.items():
            if key == clean or clean in key or key in clean:
                return val
        return {
            "treatment": "بیماری کی ابتدائی علامات پر فوری مقامی زرعی افسر سے مشورہ کریں اور تجویز کردہ پھپھوندی کش سپرے کریں۔",
            "medicines": []
        }

    def diagnose(self, image: Image.Image) -> Dict[str, Any]:
        """
        Main 3-tier diagnostic pipeline:
          >= 70%: ResNet-50 + CBAM high confidence
          50% - 70%: Cloud Vision second opinion
          < 50%: Honest photo retake advice
        """
        top_disease, confidence, top3 = self.predict_local(image)
        top3_formatted = [(name, round(score * 100, 1)) for name, score in top3]

        # Case 1: High Confidence
        if confidence >= CONFIDENCE_THRESHOLD:
            prescription = self._get_prescription(top_disease)
            return {
                "status": "success",
                "tier": "tier_1_high_confidence",
                "disease": top_disease,
                "confidence": round(confidence * 100, 1),
                "source": "resnet50_cbam",
                "model_attribution": "ResNet-50 + CBAM Attention",
                "top3": top3_formatted,
                "prescription": prescription
            }

        # Case 2: Borderline / Medium Confidence -> Trigger Second Opinion
        if confidence >= FALLBACK_THRESHOLD:
            vision_res = self.predict_with_multimodal_vision(image)
            return {
                "status": "success",
                "tier": "tier_2_hybrid_ensemble",
                "disease": top_disease,
                "confidence": round(confidence * 100, 1),
                "source": "resnet50_cbam + " + vision_res.get("source", "vision_fallback"),
                "model_attribution": "ResNet-50 + Multimodal AI Ensemble",
                "top3": top3_formatted,
                "second_opinion": vision_res.get("text", "")
            }

        # Case 3: Low Confidence -> Honest Recapture
        return {
            "status": "uncertain",
            "tier": "tier_3_recapture",
            "disease": None,
            "confidence": round(confidence * 100, 1),
            "source": "resnet50_cbam",
            "message_ur": "معذرت! یہ تصویر واضح نہیں ہے۔ برائے مہربانی پتے کی دھوپ میں قریب سے واضح تصویر دوبارہ لیں۔",
            "message_roman": "Tasveer saaf nahi hai. Baraye meharbani roshni mein patte ki qareeb se saaf tasveer lein.",
            "top3": top3_formatted
        }


# ============================================================
# CLI TEST RUNNER
# ============================================================
if __name__ == "__main__":
    if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
        detector = DiseaseDetector()
        img = Image.open(sys.argv[1])
        res = detector.diagnose(img)
        print(json.dumps(res, indent=2, ensure_ascii=False))
    else:
        print("Usage: python inference.py <path_to_leaf_image>")
