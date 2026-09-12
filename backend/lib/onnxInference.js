/**
 * DehatiAI — ONNX Inference Engine for ResNet-50 + CBAM
 * Pure-JS decoding (JPEG/PNG) + ONNX Runtime Node (<50ms CPU latency)
 */

const fs = require('fs');
const path = require('path');
const jpeg = require('jpeg-js');
const { PNG } = require('pngjs');
const ort = require('onnxruntime-node');

const MODEL_PATH = path.join(__dirname, '../models/resnet50_cbam.onnx');
const CLASSES_PATH = path.join(__dirname, '../ai_pipeline/class_names.json');

let session = null;
let classNames = [];
let isReady = false;

// Initialize ONNX runtime session once on startup
async function initSession() {
  if (isReady && session) return true;
  try {
    if (!fs.existsSync(MODEL_PATH)) {
      console.warn('[ONNX] Model file not found at:', MODEL_PATH);
      return false;
    }
    if (fs.existsSync(CLASSES_PATH)) {
      classNames = JSON.parse(fs.readFileSync(CLASSES_PATH, 'utf8'));
    }

    session = await ort.InferenceSession.create(MODEL_PATH, {
      executionProviders: ['cpu'],
      graphOptimizationLevel: 'all'
    });

    isReady = true;
    console.log(`✅ [ONNX Engine] Loaded ResNet-50 + CBAM (${classNames.length} classes, <50ms CPU inference)`);
    return true;
  } catch (err) {
    console.error('[ONNX Engine] Init error:', err.message);
    isReady = false;
    return false;
  }
}

// Auto-initialize
initSession().catch(() => {});

/**
 * Decode image buffer (JPEG or PNG) to raw RGBA Uint8Array
 */
function decodeImage(buffer) {
  // Check JPEG magic bytes: FF D8 FF
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    const decoded = jpeg.decode(buffer, { useTArray: true });
    return { data: decoded.data, width: decoded.width, height: decoded.height };
  }

  // Check PNG magic bytes: 89 50 4E 47
  if (buffer.length > 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    const png = PNG.sync.read(buffer);
    return { data: png.data, width: png.width, height: png.height };
  }

  // Fallback attempt JPEG
  try {
    const decoded = jpeg.decode(buffer, { useTArray: true });
    return { data: decoded.data, width: decoded.width, height: decoded.height };
  } catch {
    throw new Error('Unsupported image format. Only JPEG and PNG are supported for local ONNX inference.');
  }
}

/**
 * Bilinear resize to 224x224 and ImageNet normalization
 * Output shape: NCHW (1, 3, 224, 224)
 */
function preprocessToTensor(buffer) {
  const { data, width: srcW, height: srcH } = decodeImage(buffer);
  const targetW = 224;
  const targetH = 224;

  const floatData = new Float32Array(3 * targetW * targetH);
  const mean = [0.485, 0.456, 0.406];
  const std = [0.229, 0.224, 0.225];

  for (let y = 0; y < targetH; y++) {
    const srcY = (y * (srcH - 1)) / (targetH - 1);
    const y0 = Math.floor(srcY);
    const y1 = Math.min(y0 + 1, srcH - 1);
    const dy = srcY - y0;

    for (let x = 0; x < targetW; x++) {
      const srcX = (x * (srcW - 1)) / (targetW - 1);
      const x0 = Math.floor(srcX);
      const x1 = Math.min(x0 + 1, srcW - 1);
      const dx = srcX - x0;

      const idx00 = (y0 * srcW + x0) * 4;
      const idx10 = (y0 * srcW + x1) * 4;
      const idx01 = (y1 * srcW + x0) * 4;
      const idx11 = (y1 * srcW + x1) * 4;

      for (let c = 0; c < 3; c++) {
        const v00 = data[idx00 + c];
        const v10 = data[idx10 + c];
        const v01 = data[idx01 + c];
        const v11 = data[idx11 + c];

        const val =
          (1 - dx) * (1 - dy) * v00 +
          dx * (1 - dy) * v10 +
          (1 - dx) * dy * v01 +
          dx * dy * v11;

        // ImageNet normalization
        floatData[c * targetW * targetH + y * targetW + x] = (val / 255.0 - mean[c]) / std[c];
      }
    }
  }

  return new ort.Tensor('float32', floatData, [1, 3, targetW, targetH]);
}

function softmax(logits) {
  const max = Math.max(...logits);
  const exp = logits.map(v => Math.exp(v - max));
  const sum = exp.reduce((a, b) => a + b, 0);
  return exp.map(v => v / sum);
}

/**
 * Classify a crop leaf image buffer or base64 string
 * @param {Buffer|string} imageBufferOrBase64
 * @returns {Promise<object>} Top predictions, confidence, and latency
 */
async function classifyImage(imageBufferOrBase64) {
  const t0 = Date.now();
  if (!isReady || !session) {
    const ok = await initSession();
    if (!ok) return { success: false, error: 'ONNX model not initialized' };
  }

  let buffer;
  if (Buffer.isBuffer(imageBufferOrBase64)) {
    buffer = imageBufferOrBase64;
  } else if (typeof imageBufferOrBase64 === 'string') {
    const cleanBase64 = imageBufferOrBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    buffer = Buffer.from(cleanBase64, 'base64');
  } else {
    return { success: false, error: 'Invalid image input format' };
  }

  try {
    const tensor = preprocessToTensor(buffer);
    const results = await session.run({ image: tensor });
    const logits = Array.from(results.logits.data);
    const probs = softmax(logits);

    const ranked = probs
      .map((prob, idx) => ({
        class_name: classNames[idx] || `class_${idx}`,
        confidence: Math.round(prob * 1000) / 10 // e.g. 87.4%
      }))
      .sort((a, b) => b.confidence - a.confidence);

    const latencyMs = Date.now() - t0;

    return {
      success: true,
      topMatch: ranked[0],
      candidates: ranked.slice(0, 3),
      allRanked: ranked,
      latencyMs,
      model: 'ResNet50-CBAM-ONNX'
    };
  } catch (err) {
    console.warn('[ONNX Engine] classifyImage error:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  initSession,
  classifyImage,
  get isModelReady() { return isReady; }
};
