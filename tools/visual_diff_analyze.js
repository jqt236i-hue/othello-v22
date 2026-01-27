const fs = require('fs');
const PNG = require('pngjs').PNG;

function loadPNG(path) {
  return new Promise((res, rej) => {
    fs.createReadStream(path)
      .pipe(new PNG())
      .on('parsed', function () { res(this); })
      .on('error', rej);
  });
}

(async () => {
  const diffPath = 'artifacts/visual_presentation/breeding_diff.png';
  const baselinePath = 'artifacts/visual_presentation/breeding_baseline.png';
  const attemptPath = 'artifacts/visual_presentation/breeding_sequence_attempt_1.png';

  try {
    const diff = await loadPNG(diffPath);
    const w = diff.width, h = diff.height;
    let minX = w, minY = h, maxX = 0, maxY = 0, nonZero = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (w * y + x) << 2;
        const a = diff.data[idx+3];
        const r = diff.data[idx];
        const g = diff.data[idx+1];
        const b = diff.data[idx+2];
        const isDiff = a !== 0 && (r !== 0 || g !== 0 || b !== 0);
        if (isDiff) {
          nonZero++;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (nonZero === 0) {
      console.log('No diff pixels found.');
      return;
    }
    console.log('Non-zero diff pixels:', nonZero);
    console.log('Bounding box:', {minX, minY, maxX, maxY, width: maxX-minX+1, height: maxY-minY+1});

    // Save a small crop of the attempt and baseline for inspection
    const crop = (png, x0, y0, x1, y1) => {
      const w = x1 - x0 + 1, h = y1 - y0 + 1;
      const out = new PNG({width: w, height: h});
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const srcIdx = ((png.width * (y + y0)) + (x + x0)) << 2;
          const dstIdx = ((w * y) + x) << 2;
          out.data[dstIdx] = png.data[srcIdx];
          out.data[dstIdx+1] = png.data[srcIdx+1];
          out.data[dstIdx+2] = png.data[srcIdx+2];
          out.data[dstIdx+3] = png.data[srcIdx+3];
        }
      }
      return out;
    };

    const PNG2 = PNG;
    const baseline = await loadPNG(baselinePath);
    const attempt = await loadPNG(attemptPath);

    const pad = 8;
    const x0 = Math.max(0, minX - pad);
    const y0 = Math.max(0, minY - pad);
    const x1 = Math.min(diff.width-1, maxX + pad);
    const y1 = Math.min(diff.height-1, maxY + pad);

    const bCrop = crop(baseline, x0, y0, x1, y1);
    const aCrop = crop(attempt, x0, y0, x1, y1);

    bCrop.pack().pipe(fs.createWriteStream('artifacts/visual_presentation/breeding_diff_crop_baseline.png'));
    aCrop.pack().pipe(fs.createWriteStream('artifacts/visual_presentation/breeding_diff_crop_attempt.png'));
    console.log('Cropped baseline and attempt saved to artifacts/visual_presentation/*.png');

  } catch (e) {
    console.error('Error analyzing diff:', e);
  }
})();
