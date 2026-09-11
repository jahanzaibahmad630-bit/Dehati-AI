import os
import sys
import zipfile
import json

# Force UTF-8 on Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

zip_path = r"C:\Users\Dell\Downloads\Compressed\Wheat-Disease.v3i.yolov8.zip"
target_base = r"c:\Dehati AI\backend\ai_pipeline\data\crop_disease"
class_names_path = r"c:\Dehati AI\backend\ai_pipeline\class_names.json"

print(f"Reading Roboflow wheat dataset: {zip_path}")
if not os.path.exists(zip_path):
    print("Error: Zip file not found!")
    sys.exit(1)

CLASS_MAP = {
    "Black-Rust": "wheat_black_rust",
    "Brown-Rust": "wheat_brown_rust",
    "Healthy-Wheat": "wheat_healthy",
    "Yellow-Rust": "wheat_yellow_rust"
}

train_added = 0
val_added = 0

with zipfile.ZipFile(zip_path, 'r') as z:
    for item in z.namelist():
        if not item.lower().endswith(('.jpg', '.jpeg', '.png')):
            continue

        parts = item.split('/')
        if len(parts) < 3 or 'images' not in parts[1].lower():
            continue

        split_raw = parts[0].lower() # 'train', 'valid', 'test'
        filename = parts[2]
        prefix = filename.split('_')[0]

        if prefix not in CLASS_MAP:
            continue

        class_folder = CLASS_MAP[prefix]
        target_split = 'train' if split_raw == 'train' else 'val'

        dest_dir = os.path.join(target_base, target_split, class_folder)
        os.makedirs(dest_dir, exist_ok=True)
        dest_file = os.path.join(dest_dir, f"rf_{filename}")

        if not os.path.exists(dest_file):
            with open(dest_file, 'wb') as f:
                f.write(z.read(item))

            if target_split == 'train':
                train_added += 1
            else:
                val_added += 1

print(f"Successfully integrated Roboflow Wheat dataset:")
print(f"   • Train images added: {train_added}")
print(f"   • Val images added:   {val_added}")

# Summary of updated dataset
train_dir = os.path.join(target_base, "train")
all_classes = sorted([d for d in os.listdir(train_dir) if os.path.isdir(os.path.join(train_dir, d))])
val_dir = os.path.join(target_base, "val")

print(f"\n🌾 Combined Dataset Status:")
print(f"   • Total Disease Classes: {len(all_classes)}")

total_train = 0
total_val = 0
wheat_stats = {}

for c in all_classes:
    t_cnt = len(os.listdir(os.path.join(train_dir, c))) if os.path.exists(os.path.join(train_dir, c)) else 0
    v_cnt = len(os.listdir(os.path.join(val_dir, c))) if os.path.exists(os.path.join(val_dir, c)) else 0
    total_train += t_cnt
    total_val += v_cnt
    if 'wheat' in c:
        wheat_stats[c] = (t_cnt, v_cnt)

print(f"   • Total Train Samples:   {total_train}")
print(f"   • Total Val Samples:     {total_val}")
print(f"\n🔍 Wheat Sub-Classes Detailed Breakdown:")
for k, (t, v) in wheat_stats.items():
    print(f"   • {k}: {t} train | {v} val")

# Update class_names.json
with open(class_names_path, 'w', encoding='utf-8') as f:
    json.dump(all_classes, f, indent=2)
print(f"\n✅ Synced class_names.json with all {len(all_classes)} active classes.")
