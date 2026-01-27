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
  const basePath = 'artifacts/visual_presentation/breeding_baseline.png';
  const attPath = 'artifacts/visual_presentation/breeding_sequence_attempt_1.png';
  try {
    const base = await loadPNG(basePath);
    const att = await loadPNG(attPath);
    const w = base.width, h = base.height;
    if (att.width !== w || att.height !== h) {
      console.log('Different dimensions'); return;
    }
    let exactEqual = 0;
    let total = w*h;
    const buckets = new Array(256).fill(0);
    for (let y=0;y<h;y++){
      for (let x=0;x<w;x++){
        const idx = (w*y + x)<<2;
        const dr = Math.abs(base.data[idx] - att.data[idx]);
        const dg = Math.abs(base.data[idx+1] - att.data[idx+1]);
        const db = Math.abs(base.data[idx+2] - att.data[idx+2]);
        const da = Math.abs(base.data[idx+3] - att.data[idx+3]);
        const d = Math.max(dr,dg,db,da);
        buckets[d]++;
        if (d===0) exactEqual++;
      }
    }
    console.log('Total pixels:', total, 'Exact equal:', exactEqual);
    const top = buckets.slice(0, 21).map((v,i)=>`${i}:${v}`).join(', ');
    console.log('Buckets[0..20]:', top);
  } catch(e){console.error(e);} 
})();