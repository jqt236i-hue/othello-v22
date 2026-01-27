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
  const base = 'artifacts/visual_presentation/breeding_baseline.png';
  const att = 'artifacts/visual_presentation/breeding_sequence_attempt_1.png';
  try {
    const a = await loadPNG(base);
    const b = await loadPNG(att);
    function stats(png) {
      const w = png.width, h = png.height;
      let r=0,g=0,bv=0,aSum=0,count=0;
      const hist = new Array(256).fill(0);
      for (let i=0;i<png.data.length;i+=4) {
        r += png.data[i]; g += png.data[i+1]; bv += png.data[i+2]; aSum += png.data[i+3]; count++;
        hist[png.data[i]]++;
      }
      return {avgR: r/count, avgG: g/count, avgB: bv/count, avgA: aSum/count, width: w, height: h};
    }
    console.log('Baseline stats:', stats(a));
    console.log('Attempt stats:', stats(b));
  } catch (e) { console.error(e); }
})();