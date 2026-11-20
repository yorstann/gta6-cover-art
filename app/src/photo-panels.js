// The panel store: which photo sits in each panel of the cover, and how far each photo is panned and zoomed
// inside its panel. Also the cover-fit maths that scales a photo to fill a panel box without distorting it,
// and the point-in-polygon test the editor uses when a panel is clicked on the preview.

/** Clamps a pan offset to the -1..1 range the store keeps it in. */
export function clampPan(value) {
  return Math.max(-1, Math.min(1, value));
}

/** Clamps a zoom factor to the 1..3 range the zoom slider offers. */
export function clampZoom(value) {
  return Math.max(1, Math.min(3, value));
}

/**
 * Cover-fit: the draw rectangle that makes a photo of photoW x photoH fill a box of boxW x boxH, scaled by
 * `zoom` and shifted by the pan offsets offX/offY (-1..1 of the spare room on each axis). The photo always
 * covers the whole box; the offsets choose which part of the overflow is cropped away.
 */
export function coverFitRect(photoW, photoH, boxW, boxH, zoom = 1, offX = 0, offY = 0) {
  const scale = Math.max(boxW / photoW, boxH / photoH) * clampZoom(zoom);
  const dw = photoW * scale;
  const dh = photoH * scale;
  const spareX = Math.max(0, (dw - boxW) / 2);
  const spareY = Math.max(0, (dh - boxH) / 2);
  return {
    dx: boxW / 2 - dw / 2 + clampPan(offX) * spareX,
    dy: boxH / 2 - dh / 2 + clampPan(offY) * spareY,
    dw,
    dh,
    spareX,
    spareY,
  };
}

/** The pixel bounding box of a normalised panel polygon on a cover of width x height. */
export function panelBoundingBox(points, width, height) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [nx, ny] of points) {
    minX = Math.min(minX, nx * width);
    minY = Math.min(minY, ny * height);
    maxX = Math.max(maxX, nx * width);
    maxY = Math.max(maxY, ny * height);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** True when the cover-space point (x, y) falls inside a normalised panel polygon. */
export function pointInPanel(x, y, points, width, height) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i][0] * width;
    const yi = points[i][1] * height;
    const xj = points[j][0] * width;
    const yj = points[j][1] * height;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** One fresh panel slot: a photo id (or null) with centred pan and no extra zoom. */
export function createPanelSlot(photoId = null) {
  return { photoId, offX: 0, offY: 0, zoom: 1 };
}

/**
 * Grows or shrinks the slot list to `count`, keeping the slots that already exist and filling new ones by
 * cycling the photos the cover already uses (or `fallbackPhotoId` when it uses none yet).
 */
export function resizePanelSlots(slots, count, fallbackPhotoId = null) {
  const next = slots.slice(0, count);
  const inUse = next.map((slot) => slot.photoId).filter(Boolean);
  while (next.length < count) {
    const fill = inUse.length ? inUse[next.length % inUse.length] : fallbackPhotoId;
    next.push(createPanelSlot(fill));
  }
  return next;
}

/** Points one panel slot at a photo, leaving its pan and zoom as they were. */
export function assignPhotoToPanel(slots, index, photoId) {
  if (slots[index]) slots[index].photoId = photoId;
  return slots;
}

/** Points every panel slot at the same photo: one picture filling the whole cover. */
export function fillEveryPanel(slots, photoId) {
  for (const slot of slots) slot.photoId = photoId;
  return slots;
}

/** Recentres one slot's photo and resets its zoom, for the panel list's reset button. */
export function recentrePanel(slot) {
  slot.offX = 0;
  slot.offY = 0;
  slot.zoom = 1;
  return slot;
}
