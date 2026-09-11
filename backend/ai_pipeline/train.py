"""
Training script for DehatiAI crop disease detection.
Handles severe class imbalance, Pakistani field-condition augmentation,
and progressive fine-tuning of ResNet-50 + CBAM.
"""

import os
import sys
import json
import argparse
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, WeightedRandomSampler
from torchvision import datasets, transforms
from torch.optim.lr_scheduler import CosineAnnealingWarmRestarts
from tqdm import tqdm

from models.resnet_cbam import ResNet50_CBAM

os.environ['TORCH_HOME'] = r'E:\torch_cache'

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# ============================================================
# CONFIGURATION
# ============================================================
DEFAULT_CONFIG = {
    "data_dir": os.path.join(SCRIPT_DIR, "data", "crop_disease"),
    "num_classes": 32,
    "batch_size": 16,
    "epochs": 15,
    "learning_rate": 1e-4,
    "weight_decay": 1e-4,
    "dropout": 0.4,
    "unfreeze_last_n": 2,
    "num_workers": 0 if os.name == 'nt' else 2,
    "device": "cuda" if torch.cuda.is_available() else "cpu",
    "save_path": os.path.join(SCRIPT_DIR, "checkpoints", "best_model.pth"),
    "class_names_path": os.path.join(SCRIPT_DIR, "class_names.json"),
    "onnx_export_path": os.path.join(SCRIPT_DIR, "..", "models", "resnet50_cbam.onnx")
}


# ============================================================
# FIELD-CONDITION DATA AUGMENTATION
# Simulates Pakistani agricultural conditions: harsh noon sun,
# motion blur from budget smartphones, leaf occlusions, dust
# ============================================================
def get_train_transforms():
    return transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.RandomResizedCrop(224, scale=(0.7, 1.0)),

        # Geometric variation: angles, slight shear
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomVerticalFlip(p=0.3),
        transforms.RandomRotation(degrees=30),
        transforms.RandomAffine(degrees=0, translate=(0.08, 0.08), shear=8, scale=(0.95, 1.05)),

        # Environmental lighting: bright sun, cloudy, shaded
        transforms.ColorJitter(brightness=0.35, contrast=0.35, saturation=0.3, hue=0.08),
        transforms.RandomGrayscale(p=0.05),

        # Camera blur from shaky hands in the field
        transforms.GaussianBlur(kernel_size=5, sigma=(0.1, 1.8)),

        # Tensor conversion & random occlusion (overlapping leaves, water drops)
        transforms.ToTensor(),
        transforms.RandomErasing(p=0.2, scale=(0.02, 0.12), value='random'),

        # ImageNet standardization
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        ),
    ])


def get_val_transforms():
    return transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        ),
    ])


# ============================================================
# CLASS IMBALANCE HANDLING
# ============================================================
def get_weighted_sampler(dataset):
    """
    Creates a WeightedRandomSampler that oversamples minority disease classes
    while preventing over-representation of dominant classes like Wheat Yellow Rust.
    """
    targets = [s[1] for s in dataset.samples]
    class_counts = torch.bincount(torch.tensor(targets))
    # Replace zeros with 1 to avoid division by zero
    class_counts = torch.clamp(class_counts, min=1)
    class_weights = 1.0 / class_counts.float()
    sample_weights = class_weights[targets]

    return WeightedRandomSampler(
        weights=sample_weights,
        num_samples=len(sample_weights),
        replacement=True
    )


# ============================================================
# TRAINING & VALIDATION LOOPS
# ============================================================
def train_one_epoch(model, loader, criterion, optimizer, device, epoch):
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0

    pbar = tqdm(loader, desc=f"Epoch {epoch:02d} [Train]")
    for images, labels in pbar:
        images, labels = images.to(device, non_blocking=True), labels.to(device, non_blocking=True)

        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()

        # Gradient clipping prevents gradient explosion during early fine-tuning
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)

        optimizer.step()

        running_loss += loss.item() * images.size(0)
        _, predicted = outputs.max(1)
        correct += predicted.eq(labels).sum().item()
        total += labels.size(0)

        pbar.set_postfix({
            "loss": f"{running_loss/max(total, 1):.4f}",
            "acc": f"{100.*correct/max(total, 1):.2f}%"
        })

    return running_loss / max(total, 1), 100. * correct / max(total, 1)


@torch.no_grad()
def validate(model, loader, criterion, device, epoch):
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0

    pbar = tqdm(loader, desc=f"Epoch {epoch:02d} [Val]  ")
    for images, labels in pbar:
        images, labels = images.to(device, non_blocking=True), labels.to(device, non_blocking=True)

        outputs = model(images)
        loss = criterion(outputs, labels)

        running_loss += loss.item() * images.size(0)
        _, predicted = outputs.max(1)
        correct += predicted.eq(labels).sum().item()
        total += labels.size(0)

        pbar.set_postfix({
            "loss": f"{running_loss/max(total, 1):.4f}",
            "acc": f"{100.*correct/max(total, 1):.2f}%"
        })

    return running_loss / max(total, 1), 100. * correct / max(total, 1)


def main():
    parser = argparse.ArgumentParser(description="Train ResNet-50 + CBAM on Agricultural Diseases")
    parser.add_argument("--data_dir", type=str, default=DEFAULT_CONFIG["data_dir"])
    parser.add_argument("--batch_size", type=int, default=DEFAULT_CONFIG["batch_size"])
    parser.add_argument("--epochs", type=int, default=DEFAULT_CONFIG["epochs"])
    parser.add_argument("--lr", type=float, default=DEFAULT_CONFIG["learning_rate"])
    parser.add_argument("--classes", type=int, default=DEFAULT_CONFIG["num_classes"])
    args = parser.parse_args()

    config = {**DEFAULT_CONFIG, "data_dir": args.data_dir, "batch_size": args.batch_size, "epochs": args.epochs, "learning_rate": args.lr, "num_classes": args.classes}
    device = config["device"]
    print(f"\n🌾 [DehatiAI] Starting ResNet-50 + CBAM Training on: {device.upper()}")

    train_path = os.path.join(config["data_dir"], "train")
    val_path   = os.path.join(config["data_dir"], "val")

    if not os.path.isdir(train_path):
        print(f"❌ Error: Training directory not found at '{train_path}'.")
        print("💡 Place your training dataset in: data/crop_disease/train/<class_folders>/")
        sys.exit(1)

    # Load dataset
    train_dataset = datasets.ImageFolder(train_path, transform=get_train_transforms())
    val_dataset   = datasets.ImageFolder(val_path, transform=get_val_transforms()) if os.path.isdir(val_path) else None

    actual_classes = len(train_dataset.classes)
    print(f"📊 Dataset: {len(train_dataset)} train samples | {actual_classes} classes found")

    # Sync class names
    with open(config["class_names_path"], "w", encoding="utf-8") as f:
        json.dump(train_dataset.classes, f, indent=2, ensure_ascii=False)
    print(f"✅ Saved class index to: {config['class_names_path']}")

    sampler = get_weighted_sampler(train_dataset)
    train_loader = DataLoader(
        train_dataset, batch_size=config["batch_size"],
        sampler=sampler, num_workers=config["num_workers"],
        pin_memory=(device == "cuda")
    )

    val_loader = DataLoader(
        val_dataset, batch_size=config["batch_size"],
        shuffle=False, num_workers=config["num_workers"],
        pin_memory=(device == "cuda")
    ) if val_dataset else None

    # Instantiate model
    model = ResNet50_CBAM(
        num_classes=actual_classes,
        pretrained=True,
        dropout=config["dropout"],
        freeze_backbone=True,
        unfreeze_last_n=config["unfreeze_last_n"]
    ).to(device)

    # Class-weighted loss with label smoothing
    class_counts = torch.bincount(torch.tensor([s[1] for s in train_dataset.samples]))
    class_counts = torch.clamp(class_counts, min=1)
    class_weights = (1.0 / class_counts.float())
    class_weights = (class_weights / class_weights.sum() * len(class_counts)).to(device)

    criterion = nn.CrossEntropyLoss(weight=class_weights, label_smoothing=0.1)

    # Differentiated learning rates
    optimizer = optim.AdamW([
        {"params": model.layer4.parameters(), "lr": config["learning_rate"] * 0.1},
        {"params": model.cbam.parameters(), "lr": config["learning_rate"]},
        {"params": model.classifier.parameters(), "lr": config["learning_rate"]},
    ], weight_decay=config["weight_decay"])

    scheduler = CosineAnnealingWarmRestarts(optimizer, T_0=5, T_mult=2, eta_min=1e-6)

    best_acc = 0.0
    os.makedirs(os.path.dirname(os.path.abspath(config["save_path"])), exist_ok=True)

    for epoch in range(1, config["epochs"] + 1):
        train_loss, train_acc = train_one_epoch(model, train_loader, criterion, optimizer, device, epoch)
        if val_loader:
            val_loss, val_acc = validate(model, val_loader, criterion, device, epoch)
            metric_acc = val_acc
        else:
            metric_acc = train_acc
            val_loss, val_acc = 0.0, 0.0

        scheduler.step()

        print(f"\n📈 Epoch {epoch}/{config['epochs']} | Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.2f}%" + (f" | Val Acc: {val_acc:.2f}%" if val_loader else ""))

        if metric_acc > best_acc:
            best_acc = metric_acc
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "val_acc": best_acc,
                "num_classes": actual_classes,
                "class_names": train_dataset.classes
            }, config["save_path"])
            print(f"   💾 Checkpoint saved! ({metric_acc:.2f}%)")

    print(f"\n🏆 Training complete! Highest Accuracy: {best_acc:.2f}%")

    # Auto ONNX export
    try:
        from export_onnx import export_to_onnx
        print("\n📦 Automatically exporting best model to ONNX for backend deployment...")
        export_to_onnx(
            checkpoint_path=config["save_path"],
            output_onnx_path=config["onnx_export_path"],
            num_classes=actual_classes
        )
    except Exception as e:
        print(f"⚠️ ONNX auto-export skipped: {e}")


if __name__ == "__main__":
    main()
