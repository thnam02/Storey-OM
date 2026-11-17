import * as THREE from 'three';

const textures = new Map<string, THREE.Texture>();
function cached(key: string, make: () => THREE.Texture) {
  let t = textures.get(key);
  if (!t) {
    t = make();
    textures.set(key, t);
  }
  return t;
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  return { c, ctx };
}

/** A sign or screen: centred text on an optional background, shrunk to fit. */
export function textTexture(
  text: string,
  { bg, fg = '#fff', w = 512, h = 128, weight = 600 }: { bg?: string | null; fg?: string; w?: number; h?: number; weight?: number } = {},
) {
  return cached(`t|${text}|${bg}|${fg}|${w}|${h}|${weight}`, () => {
    const { c, ctx } = canvas(w, h);
    if (bg) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
    }
    let size = Math.round(h * 0.46);
    const font = (s: number) => `${weight} ${s}px Sora, "Segoe UI", sans-serif`;
    ctx.font = font(size);
    while (ctx.measureText(text).width > w * 0.88 && size > 10) {
      size -= 2;
      ctx.font = font(size);
    }
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 2);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  });
}

/** The pipeline bar chart on the Sales floor's wall screen. */
export function chartTexture(values: number[], color: string) {
  return cached(`chart|${values.join(',')}|${color}`, () => {
    const { c, ctx } = canvas(256, 140);
    ctx.fillStyle = '#1f2a33';
    ctx.fillRect(0, 0, 256, 140);
    const max = Math.max(...values);
    values.forEach((v, i) => {
      const bh = (v / max) * 90;
      ctx.fillStyle = color;
      ctx.fillRect(28 + i * 54, 120 - bh, 34, bh);
    });
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.fillRect(16, 121, 224, 2);
    ctx.font = '600 15px Sora, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('Pipeline', 16, 22);
    return new THREE.CanvasTexture(c);
  });
}

/** Ribbed metal cladding for the warehouse walls. */
export function corrugatedTexture(repeat: number) {
  return cached(`corrugated|${repeat}`, () => {
    const { c, ctx } = canvas(64, 64);
    ctx.fillStyle = '#a3b4c0';
    ctx.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 64; i += 8) {
      ctx.fillStyle = 'rgba(255,255,255,.22)';
      ctx.fillRect(i, 0, 3, 64);
      ctx.fillStyle = 'rgba(0,0,0,.09)';
      ctx.fillRect(i + 5, 0, 2, 64);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, 1);
    return t;
  });
}
