// added to render.html's R: composite the scene's canvases (DOM paint order: z-index auto in DOM order, then z>0) into one RGBA frame
R.frame = function (t) {
  this.scene.render(t);
  const host = document.getElementById('host');
  const cs = [...host.querySelectorAll('canvas')].map((c, i) => ({ c, i, z: parseInt(getComputedStyle(c).zIndex) || 0 }));
  cs.sort((a, b) => a.z - b.z || a.i - b.i);
  const W = host.clientWidth, H = host.clientHeight;
  if (!this.out) { this.out = document.createElement('canvas'); this.out.width = W; this.out.height = H; this.ctx = this.out.getContext('2d', { willReadFrequently: true }); }
  const g = this.ctx;
  g.clearRect(0, 0, W, H);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  for (const { c } of cs) g.drawImage(c, 0, 0, W, H);
  return g.getImageData(0, 0, W, H).data;
};
R.hash = function (t) {
  const d = this.frame(t); let h = 2166136261, nz = 0;
  for (let i = 0; i < d.length; i += 7) { h = Math.imul(h ^ d[i], 16777619); if (d[i | 3]) nz++; }
  const host = document.getElementById('host');
  return { t, h: h >>> 0, alphaPx: nz, hostTf: getComputedStyle(host).transform, canvTf: [...host.querySelectorAll('canvas')].map((c) => getComputedStyle(c).transform + '|' + c.style.cssText.slice(0, 80)) };
};
