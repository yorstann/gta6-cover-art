// The one render pipeline every cover goes through: the editor's live preview and the full-resolution PNG
// export both call renderCover, so what you see is exactly what downloads. It paints a deep backdrop, draws
// each panel's photo cover-fitted and graded on an offscreen canvas, clips it into the panel's polygon,
// strokes the white keylines, applies the grade's global finish, then sets the caption and the badge.

import { layoutFor } from './cover-templates.js';
import { getGrade, paintPanelOverlay, paintGlobalFinish } from './color-grades.js';
import { coverFitRect, panelBoundingBox } from './photo-panels.js';
import { drawCaption, drawBadge } from './caption-lettering.js';

/** One reusable offscreen canvas, resized to whatever cover is being rendered. */
const scratch = document.createElement('canvas');

/** Traces a panel's normalised polygon as a path on the context, in cover pixels. */
function tracePanelPath(ctx, panel, width, height) {
  ctx.beginPath();
  panel.points.forEach(([nx, ny], i) => {
    if (i === 0) ctx.moveTo(nx * width, ny * height);
    else ctx.lineTo(nx * width, ny * height);
  });
  ctx.closePath();
}

/** The backdrop a cover starts from: a deep plum-to-black falloff the caption band and gaps sit on. */
function paintBackdrop(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#2c1836');
  gradient.addColorStop(0.55, '#1b0f26');
  gradient.addColorStop(1, '#0d0714');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

/**
 * Renders one panel onto the scratch canvas: the slot's photo cover-fitted into the panel's bounding box
 * with the grade's filter, then the grade's overlay — all clipped to the panel polygon. A slot with no
 * photo gets a quiet diagonal hatch instead.
 */
function renderPanelToScratch(ctx, panel, slot, photo, grade, width, height) {
  const box = panelBoundingBox(panel.points, width, height);
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  tracePanelPath(ctx, panel, width, height);
  ctx.clip();
  if (photo) {
    const fit = coverFitRect(photo.width, photo.height, box.w, box.h, slot.zoom, slot.offX, slot.offY);
    ctx.save();
    ctx.filter = grade.filter;
    ctx.drawImage(photo.img, box.x + fit.dx, box.y + fit.dy, fit.dw, fit.dh);
    ctx.restore();
  } else {
    const hatch = ctx.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
    hatch.addColorStop(0, '#33203f');
    hatch.addColorStop(1, '#1d1128');
    ctx.fillStyle = hatch;
    ctx.fillRect(box.x, box.y, box.w, box.h);
  }
  paintPanelOverlay(ctx, grade, width, height);
  ctx.restore();
}

/** Strokes every panel's white keyline, plus a keyline around the cover's own edge. */
function strokeKeylines(ctx, panels, width, height) {
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, width * 0.011);
  ctx.lineJoin = 'round';
  for (const panel of panels) {
    tracePanelPath(ctx, panel, width, height);
    ctx.stroke();
  }
  ctx.strokeRect(0, 0, width, height);
  ctx.restore();
}

/**
 * Renders a whole cover onto `canvas` (resized to width x height first). `state` is the editor's state —
 * { templateId, gradeId, caption, slots } — and `photosById` maps photo ids to photo entries.
 */
export function renderCover(canvas, width, height, state, photosById) {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const grade = getGrade(state.gradeId);
  const { panels } = layoutFor(state.templateId, width, height);
  paintBackdrop(ctx, width, height);
  scratch.width = width;
  scratch.height = height;
  const sctx = scratch.getContext('2d');
  panels.forEach((panel, i) => {
    const slot = state.slots[i];
    const photo = slot ? photosById.get(slot.photoId) : undefined;
    renderPanelToScratch(sctx, panel, slot ?? { zoom: 1, offX: 0, offY: 0 }, photo, grade, width, height);
    ctx.drawImage(scratch, 0, 0);
  });
  strokeKeylines(ctx, panels, width, height);
  paintGlobalFinish(ctx, grade, width, height);
  drawCaption(ctx, width, height, state.caption);
  if (state.caption.badge) drawBadge(ctx, width, height, state.caption);
  return canvas;
}
