"""
DehatiAI — Fast Boosted Fine-Tuning Script
Loads best_model.pth checkpoint, applies unweighted label-smoothed loss,
unfreezes layer3 and layer4, and boosts validation accuracy.
"""

import os
import sys
import json
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, WeightedRandomSampler
from torchvision import datasets, transforms
from torch.optim.lr_scheduler import CosineAnnealingWarmRestarts
from tqdm import tqdm

from models.resnet_cbam import ResNet50_CBAM

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CHECKPOINT_PATH = os.path.join(SCRIPT_DIR, "checkpoints", "best_model.pth")
ONNX_EXPORT_PATH = os.path.join(SCRIPT_DIR, "..", "models", "resnet50_cbam.onnx")
DATA_DIR = os.path.join(SCRIPT_DIR, "data", "crop_disease")

def get_transforms():
    train_tf = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.RandomResizedCrop(224, scale=(0.75, 1.0)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomVerticalFlip(p=0.3),
        transforms.RandomRotation(degrees=20),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    val_tf = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    return train_tf, val_tf

def main():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"🌾 [DehatiAI] Starting Boosted Fine-Tuning on: {device.upper()}")

    train_dir = os.path.join(DATA_DIR, "train")
    val_dir = os.path.join(DATA_DIR, "val")

    train_tf, val_tf = get_transforms()
    train_ds = datasets.ImageFolder(train_dir, transform=train_tf)
    val_ds = datasets.ImageFolder(val_dir, transform=val_tf)

    num_classes = len(train_ds.classes)
    print(f"📊 Dataset: {len(train_ds)} train | {len(val_ds)} val | {num_classes} classes")

    # WeightedRandomSampler balances class exposure per mini-batch
    targets = [s[1] for s in train_ds.samples]
    counts = torch.clamp(torch.bincount(torch.tensor(targets)), min=1)
    sample_weights = (1.0 / counts.float())[targets]
    sampler = WeightedRandomSampler(sample_weights, num_samples=len(sample_weights), replacement=True)

    batch_size = 32
    train_loader = DataLoader(train_ds, batch_size=batch_size, sampler=sampler, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=0)

    # Initialize model
    model = ResNet50_CBAM(num_classes=num_classes, pretrained=False)

    if os.path.exists(CHECKPOINT_PATH):
        print(f"📦 Loading pre-existing checkpoint from: {CHECKPOINT_PATH}")
        ckpt = torch.load(CHECKPOINT_PATH, map_location="cpu")
        model.load_state_dict(ckpt["model_state_dict"])
        best_acc = ckpt.get("val_acc", 0.0)
        print(f"   Baseline validation accuracy: {best_acc:.2f}%")
    else:
        best_acc = 0.0

    # Deep unfreeze: Layer 4 + Layer 3 top blocks + CBAM + Classifier
    model._freeze_backbone(unfreeze_last_n=2)
    model = model.to(device)

    # Unweighted loss (since sampler already balances batches) + label smoothing
    criterion = nn.CrossEntropyLoss(label_smoothing=0.08)

    l3_params = [p for p in model.layer3.parameters() if p.requires_grad]
    optimizer = optim.AdamW([
        {"params": l3_params, "lr": 2e-5},
        {"params": model.layer4.parameters(), "lr": 5e-5},
        {"params": model.cbam.parameters(), "lr": 1.5e-4},
        {"params": model.classifier.parameters(), "lr": 1.5e-4},
    ], weight_decay=1e-4)

    scheduler = CosineAnnealingWarmRestarts(optimizer, T_0=3, T_mult=2, eta_min=1e-6)

    EPOCHS = 3
    for epoch in range(1, EPOCHS + 1):
        model.train()
        r_loss, correct, total = 0.0, 0, 0
        pbar = tqdm(train_loader, desc=f"Epoch {epoch:02d}/{EPOCHS} [Train]")
        for imgs, labels in pbar:
            imgs, labels = imgs.to(device), labels.to(device)
            optimizer.zero_grad()
            out = model(imgs)
            loss = criterion(out, labels)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()

            r_loss += loss.item() * imgs.size(0)
            _, pred = out.max(1)
            correct += pred.eq(labels).sum().item()
            total += labels.size(0)
            pbar.set_postfix({"loss": f"{r_loss/max(total, 1):.4f}", "acc": f"{100.*correct/max(total, 1):.1f}%"})

        # Validation
        model.eval()
        v_correct, v_top3, v_total = 0, 0, 0
        with torch.no_grad():
            for imgs, labels in val_loader:
                imgs, labels = imgs.to(device), labels.to(device)
                out = model(imgs)
                _, pred_top3 = out.topk(3, 1, True, True)
                for i in range(len(labels)):
                    lbl = labels[i].item()
                    if pred_top3[i, 0] == lbl:
                        v_correct += 1
                    if lbl in pred_top3[i, :3]:
                        v_top3 += 1
                    v_total += 1

        val_acc = 100.0 * v_correct / max(v_total, 1)
        val_top3 = 100.0 * v_top3 / max(v_total, 1)
        scheduler.step()

        print(f"\n📊 Epoch {epoch:02d} Summary: Train Acc: {100.*correct/total:.1f}% | Val Top-1: {val_acc:.2f}% | Val Top-3: {val_top3:.2f}%")

        if val_acc > best_acc:
            best_acc = val_acc
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "val_acc": best_acc,
                "num_classes": num_classes,
                "class_names": train_ds.classes
            }, CHECKPOINT_PATH)
            print(f"   💾 Checkpoint updated with new best accuracy: {val_acc:.2f}%")

            # Export to ONNX
            try:
                from export_onnx import export_to_onnx
                export_to_onnx(CHECKPOINT_PATH, ONNX_EXPORT_PATH, num_classes)
                print(f"   📦 ONNX model re-exported successfully!")
            except Exception as e:
                print(f"   ⚠️ ONNX export failed: {e}")

    print(f"\n🏆 Boosted fine-tuning complete! Best Top-1 Accuracy: {best_acc:.2f}%")

if __name__ == "__main__":
    main()
