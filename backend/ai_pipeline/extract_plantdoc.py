import os
import sys
import subprocess
import re

# Fix UTF-8 console encoding on Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

repo_dir = r"E:\DehatiAI_Datasets\data\raw\PlantDoc"
output_base = r"c:\Dehati AI\backend\ai_pipeline\data\crop_disease"

print(f"Reading git tree from {repo_dir}...")
try:
    files = subprocess.check_output(
        ["git", "-C", repo_dir, "ls-tree", "-r", "--name-only", "HEAD"],
        text=True,
        encoding="utf-8",
        errors="replace"
    ).splitlines()
except Exception as e:
    print(f"Error reading git tree: {e}")
    sys.exit(1)

print(f"Found {len(files)} files in repository.")

def sanitize_filename(filename):
    # Replace Windows illegal chars < > : " / \ | ? * and query params
    clean = re.sub(r'[\<\>\:\"\/\\\|\?\*\&\%]', '_', filename)
    clean = clean.split('?')[0]  # Remove trailing query if any
    return clean

def normalize_class_name(folder_name):
    # E.g. "Potato leaf early blight" -> "potato_early_blight"
    name = folder_name.lower().replace(" leaf", "").replace("leaf", "").strip()
    name = re.sub(r'[^a-z0-9]+', '_', name).strip('_')
    return name

train_count = 0
val_count = 0
skipped = 0

print("Extracting and sanitizing images from git packfile...")

for idx, file_path in enumerate(files):
    if not file_path.lower().endswith(('.jpg', '.jpeg', '.png')):
        continue

    parts = file_path.split('/')
    if len(parts) < 3:
        continue

    split_type = parts[0].lower() # 'train' or 'test'
    raw_class = parts[1]
    raw_filename = parts[2]

    # Map 'test' to 'val'
    target_split = 'val' if split_type == 'test' else 'train'
    class_clean = normalize_class_name(raw_class)
    filename_clean = sanitize_filename(raw_filename)

    target_dir = os.path.join(output_base, target_split, class_clean)
    os.makedirs(target_dir, exist_ok=True)
    target_file = os.path.join(target_dir, filename_clean)

    if os.path.exists(target_file):
        continue

    # Extract binary blob using git show
    try:
        blob = subprocess.check_output(
            ["git", "-C", repo_dir, "show", f"HEAD:{file_path}"]
        )
        with open(target_file, "wb") as f:
            f.write(blob)

        if target_split == 'train':
            train_count += 1
        else:
            val_count += 1

        if (train_count + val_count) % 250 == 0:
            print(f"   Processed {train_count + val_count} images...")
    except Exception as err:
        skipped += 1

print(f"\nExtraction Complete!")
print(f"   Train images extracted: {train_count}")
print(f"   Val images extracted:   {val_count}")
print(f"   Skipped / Errors:       {skipped}")

# Summary of classes in dataset
train_dir = os.path.join(output_base, "train")
all_classes = sorted([d for d in os.listdir(train_dir) if os.path.isdir(os.path.join(train_dir, d))])
print(f"\nTotal Dataset Classes ({len(all_classes)}):")
for c in all_classes:
    cnt = len(os.listdir(os.path.join(train_dir, c)))
    print(f"   • {c}: {cnt} images")
