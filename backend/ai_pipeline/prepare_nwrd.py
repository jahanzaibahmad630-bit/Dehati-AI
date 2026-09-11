import os
import sys
import shutil
import zipfile

# Ensure utf-8 output on Windows consoles
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

zip_path = r"C:\Users\Dell\Downloads\Compressed\NWRD.zip"
raw_dest = r"c:\Dehati AI\backend\ai_pipeline\data\raw\NWRD"
train_dest = r"c:\Dehati AI\backend\ai_pipeline\data\crop_disease\train\wheat_yellow_rust"
val_dest = r"c:\Dehati AI\backend\ai_pipeline\data\crop_disease\val\wheat_yellow_rust"

print(f"Checking zip: {zip_path}")
if not os.path.exists(zip_path):
    print("Error: Zip file not found!")
    sys.exit(1)

os.makedirs(raw_dest, exist_ok=True)
os.makedirs(train_dest, exist_ok=True)
os.makedirs(val_dest, exist_ok=True)

print("Extracting NWRD dataset (580MB)...")
with zipfile.ZipFile(zip_path, 'r') as z:
    z.extractall(raw_dest)
print("Extraction complete.")

train_src = os.path.join(raw_dest, "train", "images")
test_src = os.path.join(raw_dest, "test", "images")

train_count = 0
if os.path.exists(train_src):
    for f in os.listdir(train_src):
        if f.lower().endswith(('.jpg', '.jpeg', '.png')):
            shutil.copy2(os.path.join(train_src, f), os.path.join(train_dest, f))
            train_count += 1

val_count = 0
if os.path.exists(test_src):
    for f in os.listdir(test_src):
        if f.lower().endswith(('.jpg', '.jpeg', '.png')):
            shutil.copy2(os.path.join(test_src, f), os.path.join(val_dest, f))
            val_count += 1

print(f"Successfully prepared NWRD:")
print(f"   Train images: {train_count} -> {train_dest}")
print(f"   Val images:   {val_count} -> {val_dest}")
