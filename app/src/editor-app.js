// Vice Frame's editor: boots the app, holds the one state object every control edits, wires the panel —
// photos, templates, grades, panel assignments, caption — to the live preview, and handles the screenshot
// deep links (?shot=cover / ?shot=editor) that reproduce a fixed cover for captures.

import { SAMPLE_PHOTOS, loadSamplePhotos, loadUploadedPhoto } from './sample-photos.js';
import { TEMPLATES, layoutFor, panelCountFor } from './cover-templates.js';
import { GRADES } from './color-grades.js';
import { CAPTION_THEMES } from './caption-lettering.js';
import {
  clampPan, coverFitRect, panelBoundingBox, pointInPanel,
  resizePanelSlots, assignPhotoToPanel, fillEveryPanel, recentrePanel,
} from './photo-panels.js';
import { renderCover } from './render-cover.js';
import { EXPORT_SIZES, getExportSize, downloadCoverPng } from './export-cover.js';

/** The longest side of the live preview canvas, in pixels; exports render separately at full size. */
const PREVIEW_LONG_SIDE = 960;

/** The editor's whole state: the template and grade chosen, the export size, the caption, and the panel slots. */
const state = {
  templateId: 'vice-grid',
  gradeId: 'sunset',
  sizeId: 'landscape',
  caption: {
    main: 'SUNSET HEIST',
    sub: 'PALMERA CITY • EST. 1986',
    size: 1,
    position: 'bottom',
    theme: 'sunset',
    skew: false,
    badge: true,
    badgeText: 'PALMERA CITY',
  },
  slots: [],
};

/** Every photo the editor knows, by id, plus the order they are shown in and the one currently picked. */
const photosById = new Map();
const photoOrder = [];
let activePhotoId = null;
let selectedPanel = 0;
let uploadCount = 0;

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const statusLine = $('statusLine');

/** Sets the small status line under the stage. */
function setStatus(text) {
  statusLine.textContent = text;
}

/** The preview canvas's pixel size for the chosen export size, scaled to PREVIEW_LONG_SIDE. */
function previewDims() {
  const size = getExportSize(state.sizeId);
  const scale = PREVIEW_LONG_SIDE / Math.max(size.w, size.h);
  return { w: Math.round(size.w * scale), h: Math.round(size.h * scale) };
}

let renderQueued = false;

/** Renders the preview on the next frame, coalescing bursts of control changes into one paint. */
function requestRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    const { w, h } = previewDims();
    renderCover(preview, w, h, state, photosById);
  });
}

/** Keeps one slot per panel for the current template and size, seeding new slots from the loaded photos. */
function syncSlots() {
  const size = getExportSize(state.sizeId);
  const count = panelCountFor(state.templateId, size.w, size.h);
  const before = state.slots.length;
  state.slots = resizePanelSlots(state.slots, count, activePhotoId);
  if (before === 0 && photoOrder.length) {
    state.slots.forEach((slot, i) => { slot.photoId = photoOrder[i % photoOrder.length]; });
  }
  if (selectedPanel >= state.slots.length) selectedPanel = 0;
}

/* ---------- control builders ---------- */

/** Builds one swatch button: a colour chip (when given) and a label, marked active when chosen. */
function swatchButton(label, chipCss, active, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `swatch${active ? ' active' : ''}`;
  if (chipCss) {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.style.background = chipCss;
    btn.appendChild(chip);
  }
  btn.appendChild(document.createTextNode(label));
  btn.addEventListener('click', onClick);
  return btn;
}

/** Rebuilds the template, grade and lettering-theme rows with the current choices marked. */
function renderSwatchRows() {
  const templateRow = $('templateRow');
  templateRow.replaceChildren(...TEMPLATES.map((t) => swatchButton(t.name, null, t.id === state.templateId, () => {
    state.templateId = t.id;
    syncSlots();
    renderSwatchRows();
    renderPanelList();
    requestRender();
  })));
  const gradeRow = $('gradeRow');
  gradeRow.replaceChildren(...GRADES.map((g) => swatchButton(g.name, g.swatch, g.id === state.gradeId, () => {
    state.gradeId = g.id;
    renderSwatchRows();
    requestRender();
  })));
  const themeRow = $('themeRow');
  themeRow.replaceChildren(...CAPTION_THEMES.map((t) => swatchButton(
    t.name, `linear-gradient(180deg, ${t.from}, ${t.to})`, t.id === state.caption.theme,
    () => {
      state.caption.theme = t.id;
      renderSwatchRows();
      requestRender();
    },
  )));
}

/** Rebuilds the photo strip: one thumbnail per photo; picking one also places it in the selected panel. */
function renderPhotoStrip() {
  const strip = $('photoStrip');
  strip.replaceChildren(...photoOrder.map((id) => {
    const entry = photosById.get(id);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `photo-thumb${id === activePhotoId ? ' active' : ''}`;
    btn.title = entry.name;
    const img = document.createElement('img');
    img.src = entry.url;
    img.alt = entry.name;
    btn.appendChild(img);
    btn.addEventListener('click', () => {
      activePhotoId = id;
      assignPhotoToPanel(state.slots, selectedPanel, id);
      renderPhotoStrip();
      renderPanelList();
      requestRender();
    });
    return btn;
  }));
}

/** Rebuilds the panel list: one row per panel with its photo picker, zoom slider and recentre button. */
function renderPanelList() {
  const list = $('panelList');
  list.replaceChildren(...state.slots.map((slot, i) => {
    const row = document.createElement('div');
    row.className = `panel-row${i === selectedPanel ? ' active' : ''}`;
    const name = document.createElement('span');
    name.className = 'panel-name';
    name.textContent = `Panel ${i + 1}`;
    const select = document.createElement('select');
    for (const id of photoOrder) {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = photosById.get(id).name;
      option.selected = id === slot.photoId;
      select.appendChild(option);
    }
    select.addEventListener('change', () => {
      assignPhotoToPanel(state.slots, i, select.value);
      activePhotoId = select.value;
      renderPhotoStrip();
      requestRender();
    });
    const zoom = document.createElement('input');
    zoom.type = 'range';
    zoom.min = '1';
    zoom.max = '3';
    zoom.step = '0.05';
    zoom.value = String(slot.zoom);
    zoom.title = 'Zoom';
    zoom.addEventListener('input', () => {
      slot.zoom = Number(zoom.value);
      requestRender();
    });
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'icon-btn';
    reset.textContent = '⟲';
    reset.title = 'Recentre this panel';
    reset.addEventListener('click', (e) => {
      e.stopPropagation();
      recentrePanel(slot);
      renderPanelList();
      requestRender();
    });
    row.append(name, select, zoom, reset);
    row.addEventListener('click', () => {
      selectedPanel = i;
      renderPanelList();
    });
    return row;
  }));
}

/** Rebuilds the export-size segmented control. */
function renderSizeRow() {
  const row = $('sizeRow');
  row.replaceChildren(...EXPORT_SIZES.map((size) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = size.id === state.sizeId ? 'active' : '';
    btn.textContent = `${size.name} ${size.w}×${size.h}`;
    btn.addEventListener('click', () => {
      state.sizeId = size.id;
      syncSlots();
      renderSizeRow();
      renderPanelList();
      requestRender();
    });
    return btn;
  }));
}

/** Refreshes every dynamic control after a wholesale state change (boot, shuffle, uploads). */
function refreshControls() {
  renderSwatchRows();
  renderPhotoStrip();
  renderPanelList();
  renderSizeRow();
}

/* ---------- photo intake ---------- */

/** Adds uploaded files to the photo collection and places the first of them in the selected panel. */
async function addPhotoFiles(files) {
  const images = [...files].filter((file) => file.type.startsWith('image/'));
  if (!images.length) return;
  for (const file of images) {
    uploadCount += 1;
    const entry = await loadUploadedPhoto(file, `upload-${uploadCount}`);
    photosById.set(entry.id, entry);
    photoOrder.push(entry.id);
    activePhotoId = entry.id;
  }
  assignPhotoToPanel(state.slots, selectedPanel, activePhotoId);
  refreshControls();
  requestRender();
  setStatus(`${images.length} photo${images.length > 1 ? 's' : ''} added — drag inside the preview to reframe.`);
}

/** Wires the file picker, the browse button and drag-and-drop onto the drop zone and the whole window. */
function wirePhotoIntake() {
  const input = $('photoInput');
  $('browseBtn').addEventListener('click', () => input.click());
  $('dropZone').addEventListener('click', (e) => {
    if (e.target !== $('browseBtn')) input.click();
  });
  input.addEventListener('change', () => {
    addPhotoFiles(input.files ?? []);
    input.value = '';
  });
  const zone = $('dropZone');
  for (const target of [zone, window]) {
    target.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('dragging');
    });
    target.addEventListener('dragleave', () => zone.classList.remove('dragging'));
    target.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragging');
      if (e.dataTransfer?.files?.length) addPhotoFiles(e.dataTransfer.files);
    });
  }
  $('fillAllBtn').addEventListener('click', () => {
    if (!activePhotoId) return;
    fillEveryPanel(state.slots, activePhotoId);
    renderPanelList();
    requestRender();
    setStatus('Every panel now shows the selected photo.');
  });
}

/* ---------- preview dragging ---------- */

/** Wires the preview: clicking picks the panel under the pointer, dragging pans its photo inside it. */
function wirePreviewDrag() {
  let drag = null;
  const toCanvasPoint = (e) => {
    const rect = preview.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * preview.width,
      y: ((e.clientY - rect.top) / rect.height) * preview.height,
    };
  };
  preview.addEventListener('pointerdown', (e) => {
    const point = toCanvasPoint(e);
    const { panels } = layoutFor(state.templateId, preview.width, preview.height);
    const hit = panels.findIndex((panel) => pointInPanel(point.x, point.y, panel.points, preview.width, preview.height));
    if (hit !== -1) {
      selectedPanel = hit;
      renderPanelList();
    }
    const slot = state.slots[selectedPanel];
    if (!slot) return;
    drag = { x: point.x, y: point.y, offX: slot.offX, offY: slot.offY };
    preview.setPointerCapture(e.pointerId);
  });
  preview.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const slot = state.slots[selectedPanel];
    const photo = photosById.get(slot.photoId);
    if (!photo) return;
    const point = toCanvasPoint(e);
    const { panels } = layoutFor(state.templateId, preview.width, preview.height);
    const box = panelBoundingBox(panels[selectedPanel].points, preview.width, preview.height);
    const fit = coverFitRect(photo.width, photo.height, box.w, box.h, slot.zoom, slot.offX, slot.offY);
    if (fit.spareX > 0.5) slot.offX = clampPan(drag.offX + (point.x - drag.x) / fit.spareX);
    if (fit.spareY > 0.5) slot.offY = clampPan(drag.offY + (point.y - drag.y) / fit.spareY);
    requestRender();
  });
  const endDrag = () => { drag = null; };
  preview.addEventListener('pointerup', endDrag);
  preview.addEventListener('pointercancel', endDrag);
}

/* ---------- caption, shuffle, export ---------- */

/** Wires every caption control to the state's caption object. */
function wireCaptionControls() {
  $('captionMain').addEventListener('input', (e) => {
    state.caption.main = e.target.value;
    requestRender();
  });
  $('captionSub').addEventListener('input', (e) => {
    state.caption.sub = e.target.value;
    requestRender();
  });
  $('captionSize').addEventListener('input', (e) => {
    state.caption.size = Number(e.target.value);
    requestRender();
  });
  const setPosition = (position) => {
    state.caption.position = position;
    $('posBottom').classList.toggle('active', position === 'bottom');
    $('posTop').classList.toggle('active', position === 'top');
    requestRender();
  };
  $('posBottom').addEventListener('click', () => setPosition('bottom'));
  $('posTop').addEventListener('click', () => setPosition('top'));
  $('skewToggle').addEventListener('change', (e) => {
    state.caption.skew = e.target.checked;
    requestRender();
  });
  $('badgeToggle').addEventListener('change', (e) => {
    state.caption.badge = e.target.checked;
    requestRender();
  });
  $('badgeText').addEventListener('input', (e) => {
    state.caption.badgeText = e.target.value;
    requestRender();
  });
}

/** Picks a random member of a list. */
function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/** The Shuffle button: re-rolls the template, the grade, the lettering theme and the panel assignments. */
function wireShuffle() {
  $('shuffleBtn').addEventListener('click', () => {
    state.templateId = pick(TEMPLATES).id;
    state.gradeId = pick(GRADES).id;
    state.caption.theme = pick(CAPTION_THEMES).id;
    syncSlots();
    for (const slot of state.slots) {
      slot.photoId = pick(photoOrder);
      slot.offX = (Math.random() - 0.5) * 0.6;
      slot.offY = (Math.random() - 0.5) * 0.6;
    }
    refreshControls();
    requestRender();
    setStatus('Shuffled — a new layout, grade and arrangement.');
  });
}

/** The Export button: downloads the cover as a PNG at the chosen size. */
function wireExport() {
  $('exportBtn').addEventListener('click', async () => {
    const name = await downloadCoverPng(state, photosById, state.sizeId);
    setStatus(`Saved ${name}`);
  });
}

/* ---------- screenshot deep links ---------- */

/** Applies a ?shot= link's parameters to the state: sample photo, caption, size, template and grade. */
function applyShotQuery(query) {
  const sample = SAMPLE_PHOTOS.find((s) => s.id === query.get('photo'));
  if (sample) {
    activePhotoId = sample.id;
    fillEveryPanel(state.slots, sample.id);
  }
  if (query.get('caption')) state.caption.main = query.get('caption');
  if (query.get('sub')) state.caption.sub = query.get('sub');
  if (query.get('badge')) state.caption.badgeText = query.get('badge');
  const size = EXPORT_SIZES.find((s) => s.id === query.get('size'));
  if (size) state.sizeId = size.id;
  const template = TEMPLATES.find((t) => t.id === query.get('template'));
  if (template) state.templateId = template.id;
  const grade = GRADES.find((g) => g.id === query.get('grade'));
  if (grade) state.gradeId = grade.id;
  syncSlots();
  if (sample) fillEveryPanel(state.slots, sample.id);
}

/** Copies the state into the caption inputs, so the editor shot shows the same words as the cover. */
function syncCaptionInputs() {
  $('captionMain').value = state.caption.main;
  $('captionSub').value = state.caption.sub;
  $('badgeText').value = state.caption.badgeText;
}

/** Marks the screenshot scene as painted, two frames after the render so the capture sees it settled. */
function markShotReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}

/* ---------- boot ---------- */

/** Loads the samples, applies any deep link, builds the controls and paints the first cover. */
async function boot() {
  const entries = await loadSamplePhotos();
  for (const entry of entries) {
    photosById.set(entry.id, entry);
    photoOrder.push(entry.id);
  }
  activePhotoId = entries[0].id;
  syncSlots();

  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  if (shot) applyShotQuery(query);
  syncCaptionInputs();

  wirePhotoIntake();
  wirePreviewDrag();
  wireCaptionControls();
  wireShuffle();
  wireExport();
  refreshControls();

  await document.fonts.ready;

  window.__viceFrame = {
    state,
    exportPng: (sizeId) => downloadCoverPng(state, photosById, sizeId ?? state.sizeId),
  };

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    $('app').hidden = true;
    const stage = $('coverStage');
    stage.hidden = false;
    const size = getExportSize(state.sizeId);
    renderCover($('coverCanvas'), size.w, size.h, state, photosById);
  } else {
    const { w, h } = previewDims();
    renderCover(preview, w, h, state, photosById);
  }
  if (shot) markShotReady();
}

boot().catch((error) => {
  console.error(error);
  setStatus(`Something went wrong: ${error.message}`);
});
