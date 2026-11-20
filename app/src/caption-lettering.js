// The caption lettering: the big condensed headline, its letterspaced sub-line, and the rotated sticker badge.
// The headline is set in Anton, filled with a theme gradient, given a thick dark stroke and a hard offset
// shadow, and shrunk (or split over two lines) until it fits the cover's width.

/** The headline's gradient themes: the colours its letters run from, top to bottom. */
export const CAPTION_THEMES = [
  { id: 'sunset', name: 'Sunset', from: '#ffffff', to: '#ffb347' },
  { id: 'neon', name: 'Neon', from: '#ff5fd2', to: '#37e0ff' },
  { id: 'chrome', name: 'Chrome', from: '#ffffff', to: '#93a9bd' },
];

/** The font family the headline is set in: the bundled Anton, with a heavy local stack behind it. */
export const HEADLINE_FONT = '"Anton", "Arial Black", sans-serif';

/** The font family the sub-line and badge are set in. */
export const DETAIL_FONT = '"Archivo", "Segoe UI", Arial, sans-serif';

/** Looks a caption theme up by id, falling back to Sunset. */
export function getCaptionTheme(themeId) {
  return CAPTION_THEMES.find((theme) => theme.id === themeId) ?? CAPTION_THEMES[0];
}

/** Sets the context's font for a headline of the given pixel size. */
function headlineFont(ctx, size) {
  ctx.font = `${size}px ${HEADLINE_FONT}`;
}

/** The largest headline size, at most `base`, whose text still fits `maxWidth` on one line. */
function fitHeadlineSize(ctx, text, base, maxWidth) {
  let size = base;
  headlineFont(ctx, size);
  while (size > 14 && ctx.measureText(text).width > maxWidth) {
    size *= 0.94;
    headlineFont(ctx, size);
  }
  return size;
}

/** Splits a headline into two balanced lines at a word boundary, when it has one. */
function splitHeadline(text) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 2) return [text];
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const balance = Math.abs(a.length - b.length);
    if (!best || balance < best.balance) best = { lines: [a, b], balance };
  }
  return best.lines;
}

/**
 * Plans the headline: one line at the base size when it fits, two balanced lines when one line would have
 * to shrink past 62% of the base size. Returns the lines and the size they are set at.
 */
function planHeadline(ctx, text, base, maxWidth) {
  const oneLine = fitHeadlineSize(ctx, text, base, maxWidth);
  if (oneLine >= base * 0.62 || !text.includes(' ')) return { lines: [text], size: oneLine };
  const lines = splitHeadline(text);
  let size = base;
  for (const line of lines) size = Math.min(size, fitHeadlineSize(ctx, line, base, maxWidth));
  return { lines, size };
}

/** Draws one headline line: gradient fill, thick dark stroke, and a hard shadow dropped straight down. */
function drawHeadlineLine(ctx, line, cx, baseline, size, theme) {
  headlineFont(ctx, size);
  const gradient = ctx.createLinearGradient(0, baseline - size, 0, baseline + size * 0.18);
  gradient.addColorStop(0, theme.from);
  gradient.addColorStop(1, theme.to);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(10, 4, 16, 0.55)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = size * 0.045;
  ctx.shadowOffsetY = size * 0.07;
  ctx.strokeStyle = '#17101d';
  ctx.lineWidth = size * 0.17;
  ctx.strokeText(line, cx, baseline);
  ctx.shadowColor = 'rgba(0, 0, 0, 0)';
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = gradient;
  ctx.fillText(line, cx, baseline);
  ctx.restore();
}

/** Draws the letterspaced sub-line in a detail font, quietly stroked so it survives a bright photo. */
function drawSubLine(ctx, text, cx, baseline, size) {
  ctx.save();
  ctx.font = `700 ${size}px ${DETAIL_FONT}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.round(size * 0.34)}px`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(14, 8, 20, 0.85)';
  ctx.lineWidth = size * 0.16;
  ctx.strokeText(text, cx, baseline);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, cx, baseline);
  ctx.restore();
}

/**
 * Draws the whole caption onto the cover: the sub-line as a kicker and the headline under it (or over it,
 * when the caption sits at the top), anchored to the top or bottom edge the caption settings choose.
 * `caption` is { main, sub, size, position, theme, skew } with size a 0.6..1.5 scale.
 */
export function drawCaption(ctx, width, height, caption) {
  const main = (caption.main ?? '').trim().toUpperCase();
  const sub = (caption.sub ?? '').trim().toUpperCase();
  if (!main && !sub) return;
  const theme = getCaptionTheme(caption.theme);
  const base = Math.min(width, height) * 0.148 * (caption.size ?? 1);
  const maxWidth = width * 0.93;
  const atBottom = caption.position !== 'top';
  ctx.save();
  if (caption.skew) {
    const cx = width / 2;
    const cy = atBottom ? height * 0.86 : height * 0.14;
    ctx.translate(cx, cy);
    ctx.transform(1, 0, Math.tan((-4 * Math.PI) / 180), 1, 0, 0);
    ctx.translate(-cx, -cy);
  }
  if (main) {
    const { lines, size } = planHeadline(ctx, main, base, maxWidth);
    const lineStep = size * 1.04;
    if (atBottom) {
      const lastBaseline = height * 0.955;
      const firstBaseline = lastBaseline - (lines.length - 1) * lineStep;
      lines.forEach((line, i) => drawHeadlineLine(ctx, line, width / 2, firstBaseline + i * lineStep, size, theme));
      if (sub) drawSubLine(ctx, sub, width / 2, firstBaseline - size * 1.24, size * 0.21);
    } else {
      const firstBaseline = height * 0.045 + size;
      lines.forEach((line, i) => drawHeadlineLine(ctx, line, width / 2, firstBaseline + i * lineStep, size, theme));
      if (sub) drawSubLine(ctx, sub, width / 2, firstBaseline + (lines.length - 1) * lineStep + size * 0.5, size * 0.21);
    }
  } else if (sub) {
    drawSubLine(ctx, sub, width / 2, atBottom ? height * 0.94 : height * 0.09, Math.min(width, height) * 0.032);
  }
  ctx.restore();
}

/**
 * Draws the sticker badge: a rotated block in the top-right corner carrying a short line of text, like the
 * city stickers on a game cover. `caption` provides { badgeText, theme }.
 */
export function drawBadge(ctx, width, height, caption) {
  const text = (caption.badgeText ?? '').trim().toUpperCase();
  if (!text) return;
  const theme = getCaptionTheme(caption.theme);
  const size = Math.min(width, height) * 0.034;
  ctx.save();
  ctx.font = `${size}px ${HEADLINE_FONT}`;
  const textWidth = ctx.measureText(text).width;
  const padX = size * 0.62;
  const padY = size * 0.42;
  const boxW = textWidth + padX * 2;
  const boxH = size + padY * 2;
  ctx.translate(width * 0.965, height * 0.045);
  ctx.rotate((-8 * Math.PI) / 180);
  ctx.translate(-boxW, 0);
  const gradient = ctx.createLinearGradient(0, 0, 0, boxH);
  gradient.addColorStop(0, theme.to);
  gradient.addColorStop(1, theme.from);
  ctx.beginPath();
  ctx.roundRect(0, 0, boxW, boxH, size * 0.22);
  ctx.fillStyle = '#17101d';
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(size * 0.09, size * 0.09, boxW - size * 0.18, boxH - size * 0.18, size * 0.16);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.font = `${size}px ${HEADLINE_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#17101d';
  ctx.fillText(text, boxW / 2, boxH / 2 + size * 0.05);
  ctx.restore();
}
