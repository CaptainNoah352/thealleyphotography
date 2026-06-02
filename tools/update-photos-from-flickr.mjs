import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const FLICKR_USER_ID = "204244048@N05";
const publicFeedUrl = `https://www.flickr.com/services/feeds/photos_public.gne?id=${FLICKR_USER_ID}&format=json&nojsoncallback=1`;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const dataPath = path.join(repoRoot, "photo-data.js");

function getArgValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value) {
  return decodeHtml(String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function jsString(value) {
  return JSON.stringify(String(value ?? ""));
}

function metaContent(html, key) {
  const patternA = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']*)["']`, "i");
  const patternB = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${key}["']`, "i");
  return decodeHtml((html.match(patternA) || html.match(patternB) || [])[1] || "");
}

function exifRows(html) {
  const rows = {};
  for (const match of html.matchAll(/<tr[^>]*>\s*<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi)) {
    rows[stripHtml(match[1])] = stripHtml(match[2]);
  }
  return rows;
}

function flickrIdFromUrl(value) {
  const text = String(value || "");
  return (text.match(/\/photos\/[^/]+\/(\d+)/) || text.match(/\/65535\/(\d+)_/) || [])[1] || "";
}

function fullImageUrl(value) {
  return String(value || "").replace(/_[a-z]\.jpg$/i, "_b.jpg");
}

function shutterFromExposure(value) {
  return (String(value || "").match(/\(([^)]+)\)/) || [])[1] || String(value || "").replace(/\s*sec.*/i, "").trim();
}

function loadSiteData(source) {
  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context);
  return context;
}

function formatPhotoObject(photo) {
  return [
    "  {",
    `    id: ${photo.id},`,
    `    src: ${jsString(photo.src)},`,
    `    alt: ${jsString(photo.alt)},`,
    `    is_featured: false,`,
    "  },",
  ].join("\n");
}

function formatObjectEntry(id, object) {
  const entries = Object.entries(object).filter(([, value]) => value !== "");
  return `  ${id}: { ${entries.map(([key, value]) => `${key}: ${jsString(value)}`).join(", ")} },`;
}

function appendGalleryImage(sourceText, photo) {
  return sourceText.replace(/\n\];\n\nvar FLICKR_METADATA = /, `\n${formatPhotoObject(photo)}\n];\n\nvar FLICKR_METADATA = `);
}

function appendFlickrMetadata(sourceText, id, metadata) {
  return sourceText.replace(/\n\};\n\nvar FLICKR_CAMERA_METADATA = /, `\n${formatObjectEntry(id, metadata)}\n};\n\nvar FLICKR_CAMERA_METADATA = `);
}

function appendCameraMetadata(sourceText, id, metadata) {
  return sourceText.replace(/\n\};\s*$/, `\n${formatObjectEntry(id, metadata)}\n};\n`);
}

async function fetchPhoto(link, feedItem) {
  const response = await fetch(link);
  const html = await response.text();
  if (!response.ok) throw new Error(`Flickr returned ${response.status} for ${link}`);

  const imageUrl = fullImageUrl(metaContent(html, "og:image") || feedItem.media?.m || "");
  const width = metaContent(html, "og:image:width");
  const height = metaContent(html, "og:image:height");
  const stats = html.match(/"photo-stats-models":\[\{"data":\{[^}]*?"dateTaken":"([^"]*)","datePosted":"([^"]*)","id":"([^"]*)"/);

  let exif = {};
  try {
    const metaResponse = await fetch(`${link.replace(/\/?$/, "/")}meta`);
    exif = exifRows(await metaResponse.text());
  } catch {
    exif = {};
  }

  return {
    src: imageUrl,
    alt: "Photography by Brandon Alley",
    flickr: {
      flickrId: flickrIdFromUrl(link),
      title: metaContent(html, "og:title") || feedItem.title || "",
      dateTaken: stats?.[1] || feedItem.date_taken || "",
      width,
      height,
    },
    camera: {
      camera: exif.Camera || "",
      lens: exif.Lens || exif["Lens Model"] || "",
      shutter: shutterFromExposure(exif.Exposure),
      aperture: exif.Aperture || exif["F-Number"] || "",
      iso: exif["ISO Speed"] || exif.ISO || exif["Recommended Exposure Index"] || "",
      focalLength: exif["Focal Length"] || "",
      flash: exif.Flash === "No Flash" ? "Flash (off, did not fire)" : exif.Flash || "",
      exposureMode: exif["Exposure Mode"] || exif["Exposure Program"] || "",
      meteringMode: exif["Metering Mode"] || "",
      whiteBalance: exif["White Balance"] || "",
    },
  };
}

const limit = Number(getArgValue("--limit") || 20);
const apply = process.argv.includes("--apply");
const source = await fs.readFile(dataPath, "utf8");
const site = loadSiteData(source);
const gallery = Array.isArray(site.GALLERY_IMAGES) ? site.GALLERY_IMAGES : [];
const metadata = site.FLICKR_METADATA || {};
const existingFlickrIds = new Set(Object.values(metadata).map((entry) => entry?.flickrId).filter(Boolean));
for (const photo of gallery) {
  const id = flickrIdFromUrl(photo.src);
  if (id) existingFlickrIds.add(id);
}

const feed = await fetch(publicFeedUrl).then((response) => response.json());
const items = Array.isArray(feed.items) ? feed.items.slice(0, limit) : [];
const newItems = items.filter((item) => {
  const id = flickrIdFromUrl(item.link);
  return id && !existingFlickrIds.has(id);
});

let updated = source;
let nextPhotoId = Math.max(0, ...gallery.map((photo) => Number(photo.id) || 0)) + 1;
const added = [];
const skipped = [];

for (const item of newItems) {
  try {
    const photo = await fetchPhoto(item.link, item);
    const photoId = nextPhotoId;
    nextPhotoId += 1;

    updated = appendGalleryImage(updated, { id: photoId, src: photo.src, alt: photo.alt });
    updated = appendFlickrMetadata(updated, photoId, photo.flickr);
    updated = appendCameraMetadata(updated, photoId, photo.camera);
    added.push({ photoId, flickrId: photo.flickr.flickrId, title: photo.flickr.title, src: photo.src });
    await new Promise((resolve) => setTimeout(resolve, 120));
  } catch (error) {
    skipped.push({ link: item.link, reason: error.message });
  }
}

if (apply && added.length) {
  await fs.writeFile(dataPath, updated, "utf8");
}

console.log(JSON.stringify({
  dryRun: !apply,
  checked: items.length,
  newPhotosFound: newItems.length,
  photosAdded: apply ? added.length : 0,
  nextPhotoId,
  added,
  skipped,
}, null, 2));
