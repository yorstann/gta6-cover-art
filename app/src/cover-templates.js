// The cover templates: panel layouts laid over the cover rectangle. Each layout is a set of panels, and each
// panel is a polygon in normalised cover coordinates (0..1 on both axes) that the renderer clips a photo into
// and outlines with the white keyline. Layouts adapt to the cover's aspect: wide, square or tall.

/** The four templates, in the order the editor's template row shows them. */
export const TEMPLATES = [
  { id: 'vice-grid', name: 'Vice Grid', blurb: 'Hero panel, two stacked, one wide' },
  { id: 'slash', name: 'Slash', blurb: 'Three diagonal bands' },
  { id: 'triptych', name: 'Triptych', blurb: 'Three verticals over a caption band' },
  { id: 'mosaic', name: 'Mosaic', blurb: 'One hero and five small panels' },
];

/** Names the aspect family a cover size falls into, so a layout can reshape itself for it. */
export function aspectFamily(width, height) {
  const ratio = width / height;
  if (ratio > 1.15) return 'wide';
  if (ratio < 0.87) return 'tall';
  return 'square';
}

/** Builds a rectangle panel from normalised corners. */
function rectPanel(x0, y0, x1, y1) {
  return { points: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]] };
}

/** Builds a panel from an explicit list of normalised polygon points. */
function polyPanel(points) {
  return { points };
}

/** Vice Grid: a hero panel top-left, two panels stacked at its right, and one wide panel along the bottom. */
function viceGridLayout(aspect) {
  if (aspect === 'tall') {
    return {
      panels: [
        rectPanel(0, 0, 1, 0.42),
        rectPanel(0, 0.42, 0.5, 0.69),
        rectPanel(0.5, 0.42, 1, 0.69),
        rectPanel(0, 0.69, 1, 1),
      ],
    };
  }
  return {
    panels: [
      rectPanel(0, 0, 0.62, 0.66),
      rectPanel(0.62, 0, 0.62 + 0.38, 0.33),
      rectPanel(0.62, 0.33, 1, 0.66),
      rectPanel(0, 0.66, 1, 1),
    ],
  };
}

/** Slash: three full-width bands split by diagonal edges, leaning harder on a tall cover. */
function slashLayout(aspect) {
  const lean = aspect === 'tall' ? 0.1 : 0.18;
  return {
    panels: [
      polyPanel([[0, 0], [1, 0], [1, 0.42 - lean / 2], [0, 0.42 + lean / 2]]),
      polyPanel([[0, 0.42 + lean / 2], [1, 0.42 - lean / 2], [1, 0.74 - lean / 2], [0, 0.74 + lean / 2]]),
      polyPanel([[0, 0.74 + lean / 2], [1, 0.74 - lean / 2], [1, 1], [0, 1]]),
    ],
  };
}

/** Triptych: three tall panels side by side, leaving the bottom band empty for the caption to own. */
function triptychLayout(aspect) {
  const photoBottom = aspect === 'tall' ? 0.76 : aspect === 'wide' ? 0.7 : 0.73;
  return {
    panels: [
      rectPanel(0, 0, 0.34, photoBottom),
      rectPanel(0.34, 0, 0.67, photoBottom),
      rectPanel(0.67, 0, 1, photoBottom),
    ],
  };
}

/** Mosaic: one hero panel and five small ones — a tall cover stacks the hero on top instead of at the left. */
function mosaicLayout(aspect) {
  if (aspect === 'tall') {
    return {
      panels: [
        rectPanel(0, 0, 1, 0.44),
        rectPanel(0, 0.44, 0.5, 0.72),
        rectPanel(0.5, 0.44, 1, 0.72),
        rectPanel(0, 0.72, 0.34, 1),
        rectPanel(0.34, 0.72, 0.67, 1),
        rectPanel(0.67, 0.72, 1, 1),
      ],
    };
  }
  return {
    panels: [
      rectPanel(0, 0, 0.56, 1),
      rectPanel(0.56, 0, 1, 0.38),
      rectPanel(0.56, 0.38, 0.78, 0.69),
      rectPanel(0.78, 0.38, 1, 0.69),
      rectPanel(0.56, 0.69, 0.78, 1),
      rectPanel(0.78, 0.69, 1, 1),
    ],
  };
}

const LAYOUT_BUILDERS = {
  'vice-grid': viceGridLayout,
  slash: slashLayout,
  triptych: triptychLayout,
  mosaic: mosaicLayout,
};

/** Returns the layout for a template at a cover size: its panels, as normalised polygons. */
export function layoutFor(templateId, width, height) {
  const build = LAYOUT_BUILDERS[templateId] ?? viceGridLayout;
  return build(aspectFamily(width, height));
}

/** Counts the panels a template has at a cover size, so the editor can keep one slot per panel. */
export function panelCountFor(templateId, width, height) {
  return layoutFor(templateId, width, height).panels.length;
}
