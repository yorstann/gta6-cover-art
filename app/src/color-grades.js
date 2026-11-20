// The colour grades: the five looks a cover can wear. A grade is a canvas filter applied to each photo as it
// is drawn into its panel, a colour overlay blended over the panel, and a global finish — a wash of colour,
// a vignette, fine grain and an optional light leak — painted over the whole cover once the panels are in.

/**
 * The grades, in the order the editor's swatch row shows them. `filter` is a canvas filter string,
 * `overlayStops` a top-to-bottom gradient blended with `overlayMode`, `wash` a flat tint over everything,
 * `leak` the colour of the light leak in one corner (or null), and `vignette`/`grain` the finish strengths.
 */
export const GRADES = [
  {
    id: 'sunset',
    name: 'Sunset',
    swatch: 'linear-gradient(135deg, #ffb347, #ff5e8a 55%, #5b2a86)',
    filter: 'saturate(1.4) contrast(1.1) brightness(1.03)',
    overlayStops: [[0, 'rgba(255, 150, 70, 0.28)'], [0.55, 'rgba(255, 70, 140, 0.16)'], [1, 'rgba(46, 6, 74, 0.34)']],
    overlayMode: 'soft-light',
    wash: 'rgba(255, 110, 60, 0.07)',
    leak: 'rgba(255, 176, 92, 0.22)',
    vignette: 0.34,
    grain: 0.05,
  },
  {
    id: 'neon',
    name: 'Neon Nights',
    swatch: 'linear-gradient(135deg, #19e3ff, #274bdb 50%, #ff2fb3)',
    filter: 'saturate(1.5) contrast(1.16) brightness(0.99)',
    overlayStops: [[0, 'rgba(0, 230, 255, 0.18)'], [0.5, 'rgba(64, 40, 200, 0.14)'], [1, 'rgba(255, 0, 170, 0.24)']],
    overlayMode: 'soft-light',
    wash: 'rgba(24, 0, 70, 0.1)',
    leak: 'rgba(255, 84, 220, 0.16)',
    vignette: 0.4,
    grain: 0.06,
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    swatch: 'linear-gradient(135deg, #ffe9a3, #f2a541 55%, #8a4b1d)',
    filter: 'sepia(0.32) saturate(1.28) contrast(1.06) brightness(1.06)',
    overlayStops: [[0, 'rgba(255, 196, 92, 0.24)'], [1, 'rgba(122, 62, 12, 0.2)']],
    overlayMode: 'soft-light',
    wash: 'rgba(255, 182, 90, 0.09)',
    leak: 'rgba(255, 214, 130, 0.2)',
    vignette: 0.28,
    grain: 0.05,
  },
  {
    id: 'noir',
    name: 'Noir',
    swatch: 'linear-gradient(135deg, #e8e8ec, #6d6d78 55%, #101014)',
    filter: 'grayscale(0.88) contrast(1.32) brightness(1.02)',
    overlayStops: [[0, 'rgba(255, 255, 255, 0.07)'], [1, 'rgba(0, 0, 0, 0.3)']],
    overlayMode: 'soft-light',
    wash: null,
    leak: null,
    vignette: 0.52,
    grain: 0.09,
  },
  {
    id: 'raw',
    name: 'Raw',
    swatch: 'linear-gradient(135deg, #cfd8dc, #78909c 60%, #37474f)',
    filter: 'saturate(1.08) contrast(1.03)',
    overlayStops: [[0, 'rgba(255, 255, 255, 0.03)'], [1, 'rgba(0, 0, 0, 0.05)']],
    overlayMode: 'soft-light',
    wash: null,
    leak: null,
    vignette: 0.18,
    grain: 0.03,
  },
];

/** Looks a grade up by id, falling back to Sunset. */
export function getGrade(gradeId) {
  return GRADES.find((grade) => grade.id === gradeId) ?? GRADES[0];
}

/**
 * Paints a grade's colour overlay over the part of the context already clipped to one panel: a vertical
 * gradient in the grade's blend mode, called while the panel's clip is active.
 */
export function paintPanelOverlay(ctx, grade, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  for (const [stop, colour] of grade.overlayStops) gradient.addColorStop(stop, colour);
  ctx.save();
  ctx.globalCompositeOperation = grade.overlayMode;
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

let grainTile = null;

/** Builds (once) the 256 x 256 tile of random grey noise the grain finish repeats over the cover. */
function getGrainTile() {
  if (grainTile) return grainTile;
  const tile = document.createElement('canvas');
  tile.width = 256;
  tile.height = 256;
  const tctx = tile.getContext('2d');
  const image = tctx.createImageData(256, 256);
  for (let i = 0; i < image.data.length; i += 4) {
    const v = 96 + Math.floor(Math.random() * 96);
    image.data[i] = v;
    image.data[i + 1] = v;
    image.data[i + 2] = v;
    image.data[i + 3] = 255;
  }
  tctx.putImageData(image, 0, 0);
  grainTile = tile;
  return tile;
}

/**
 * The global finish, painted over the finished panels before the caption: the grade's wash, a light leak
 * blooming from the top-left, a vignette darkening the edges, and fine grain over everything.
 */
export function paintGlobalFinish(ctx, grade, width, height) {
  if (grade.wash) {
    ctx.fillStyle = grade.wash;
    ctx.fillRect(0, 0, width, height);
  }
  if (grade.leak) {
    const leak = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(width, height) * 0.85);
    leak.addColorStop(0, grade.leak);
    leak.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = leak;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
  if (grade.vignette > 0) {
    const vig = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.42,
      width / 2, height / 2, Math.max(width, height) * 0.78,
    );
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(1, `rgba(6, 2, 12, ${grade.vignette})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, width, height);
  }
  if (grade.grain > 0) {
    ctx.save();
    ctx.globalAlpha = grade.grain;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = ctx.createPattern(getGrainTile(), 'repeat');
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}
