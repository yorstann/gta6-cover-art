// The photos that ship with Vice Frame: two sample pictures made for make.fun that the editor opens with, plus
// the loaders that turn a sample file or an uploaded file into a photo entry the panel store can point at.
// Uploaded photos are read on this machine only (object URLs and FileReader); nothing is ever sent anywhere.

/** The bundled samples: `id` is the file stem under samples/, `name` is the label the editor shows. */
export const SAMPLE_PHOTOS = [
  { id: 'pier', name: 'Sunset Pier', src: 'samples/pier.jpg' },
  { id: 'boulevard', name: 'Boulevard Nights', src: 'samples/boulevard.jpg' },
];

/** Loads an image element from a URL, resolving once the image can be drawn to a canvas. */
export function loadImageElement(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That image could not be read.'));
    img.src = url;
  });
}

/**
 * Builds one photo entry, the record every panel slot points at: its id, the label shown in the editor,
 * the loaded image, where it came from, and its natural size for the cover-fit maths.
 */
export function createPhotoEntry(id, name, img, url) {
  return { id, name, img, url, width: img.naturalWidth, height: img.naturalHeight };
}

/** Loads every bundled sample photo, in SAMPLE_PHOTOS order, as photo entries. */
export async function loadSamplePhotos() {
  const entries = [];
  for (const sample of SAMPLE_PHOTOS) {
    const img = await loadImageElement(sample.src);
    entries.push(createPhotoEntry(sample.id, sample.name, img, sample.src));
  }
  return entries;
}

/** Reads one uploaded file into a photo entry, entirely on this machine. */
export async function loadUploadedPhoto(file, id) {
  const url = URL.createObjectURL(file);
  const img = await loadImageElement(url);
  const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'My photo';
  return createPhotoEntry(id, name, img, url);
}
