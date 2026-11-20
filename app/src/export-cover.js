// The export: the three sizes a finished cover can download at, and the one-click PNG download itself.
// Exporting renders the current state once more, at full resolution, through the same pipeline as the
// preview (render-cover.js), then saves the canvas as a PNG file.

import { renderCover } from './render-cover.js';

/** The export sizes, in the order the editor's size row shows them. */
export const EXPORT_SIZES = [
  { id: 'square', name: 'Square', w: 1080, h: 1080 },
  { id: 'portrait', name: 'Portrait', w: 1080, h: 1350 },
  { id: 'landscape', name: 'Landscape', w: 1920, h: 1080 },
];

/** Looks an export size up by id, falling back to Landscape. */
export function getExportSize(sizeId) {
  return EXPORT_SIZES.find((size) => size.id === sizeId) ?? EXPORT_SIZES[2];
}

/** Renders the cover at an export size onto a fresh canvas and returns it. */
export function renderExportCanvas(state, photosById, sizeId) {
  const size = getExportSize(sizeId);
  const canvas = document.createElement('canvas');
  renderCover(canvas, size.w, size.h, state, photosById);
  return canvas;
}

/** The PNG of the cover at an export size, as a Blob. */
export function exportCoverBlob(state, photosById, sizeId) {
  const canvas = renderExportCanvas(state, photosById, sizeId);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

/** Downloads the cover as a PNG at the chosen size; resolves to the file name it was saved under. */
export async function downloadCoverPng(state, photosById, sizeId) {
  const size = getExportSize(sizeId);
  const blob = await exportCoverBlob(state, photosById, sizeId);
  const name = `vice-frame-${size.id}-${size.w}x${size.h}.png`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return name;
}
