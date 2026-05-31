import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FLICKR_USER_ID = "204244048@N05";
const SPREADSHEET_ID = "1dShWCUHNf5BEVv39rSGAmKBccVjT7gfL815aFy_ibtk";
const EXPORT_SYNC_GID = "2076409196";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outputPath = path.join(repoRoot, "outputs", "photo-organizer", "Flickr_Intake.tsv");
const sheetCsvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${EXPORT_SYNC_GID}`;
const publicFeedUrl = `https://www.flickr.com/services/feeds/photos_public.gne?id=${FLICKR_USER_ID}&format=json&nojsoncallback=1`;

const organizerHeaders = [
  "Folder (Location)",
  "Flickr URL",
  "Preview Image",
  "Resolved Image URL",
  "Photo ID",
  "Publish Status",
  "Featured",
  "Project",
  "Species",
  "Category",
  "Homepage Order",
  "Portfolio Order",
  "Alt Text",
  "Caption",
  "Display Title",
  "Notes",
  "Full Image URL",
  "Flickr ID",
  "Title",
  "Description",
  "Date Uploaded",
  "Date Taken",
  "Tags",
  "Width",
  "Height",
  "Orientation",
  "Aspect Ratio",
  "Camera",
  "Lens",
  "Shutter",
  "Aperture",
  "ISO",
  "Focal Length",
  "Exposure Mode",
  "Metering",
  "White Balance",
  "Flash",
];

function getArgValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
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

function thumbUrl(value) {
  return String(value || "").replace(/_[a-z]\.jpg$/i, "_m.jpg");
}

function shutterFromExposure(value) {
  return (String(value || "").match(/\(([^)]+)\)/) || [])[1] || String(value || "").replace(/\s*sec.*/i, "").trim();
}

function orientation(width, height) {
  const w = Number(width);
  const h = Number(height);
  if (!w || !h) return "";
  if (w === h) return "Square";
  return w > h ? "Landscape" : "Portrait";
}

function aspectRatio(width, height) {
  const w = Number(width);
  const h = Number(height);
  if (!w || !h) return "";
  return `${w}:${h}`;
}

function tsvEscape(value) {
  return String(value ?? "").replace(/\t/g, " ").replace(/\r?\n/g, " ");
}

async function existingSheetIds() {
  const response = await fetch(sheetCsvUrl, { redirect: "follow" });
  const csv = await response.text();
  if (!response.ok || /<html|ServiceLogin|accounts\.google\.com/i.test(csv)) {
    throw new Error("Could not read the public Export_Sync CSV from Google Sheets.");
  }
  const rows = parseCsv(csv);
  const headers = rows.shift() || [];
  const index = Object.fromEntries(headers.map((header, i) => [header.trim(), i]));
  const ids = new Set();
  const urls = new Set();
  for (const row of rows) {
    const flickrId = index["Flickr ID"] == null ? "" : row[index["Flickr ID"]];
    const flickrUrl = index["Flickr URL"] == null ? "" : row[index["Flickr URL"]];
    if (flickrId) ids.add(flickrId);
    if (flickrUrl) urls.add(flickrUrl);
  }
  return { ids, urls };
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

  const row = Object.fromEntries(organizerHeaders.map((header) => [header, ""]));
  row["Flickr URL"] = link;
  row["Resolved Image URL"] = thumbUrl(imageUrl);
  row["Publish Status"] = "Needs Review";
  row.Featured = "FALSE";
  row["Full Image URL"] = imageUrl;
  row["Flickr ID"] = flickrIdFromUrl(link);
  row.Title = metaContent(html, "og:title") || feedItem.title || "";
  row.Description = metaContent(html, "og:description") || stripHtml(feedItem.description || "");
  row["Date Uploaded"] = feedItem.published || stats?.[2] || "";
  row["Date Taken"] = stats?.[1] || feedItem.date_taken || "";
  row.Tags = feedItem.tags || "";
  row.Width = width;
  row.Height = height;
  row.Orientation = orientation(width, height);
  row["Aspect Ratio"] = aspectRatio(width, height);
  row.Camera = exif.Camera || "";
  row.Lens = exif.Lens || exif["Lens Model"] || "";
  row.Shutter = shutterFromExposure(exif.Exposure);
  row.Aperture = exif.Aperture || exif["F-Number"] || "";
  row.ISO = exif["ISO Speed"] || exif.ISO || exif["Recommended Exposure Index"] || "";
  row["Focal Length"] = exif["Focal Length"] || "";
  row["Exposure Mode"] = exif["Exposure Mode"] || exif["Exposure Program"] || "";
  row.Metering = exif["Metering Mode"] || "";
  row["White Balance"] = exif["White Balance"] || "";
  row.Flash = exif.Flash === "No Flash" ? "Flash (off, did not fire)" : exif.Flash || "";
  return organizerHeaders.map((header) => row[header]);
}

const limit = Number(getArgValue("--limit") || 20);
const { ids, urls } = await existingSheetIds();
const feed = await fetch(publicFeedUrl).then((response) => response.json());
const items = Array.isArray(feed.items) ? feed.items.slice(0, limit) : [];
const newItems = items.filter((item) => {
  const id = flickrIdFromUrl(item.link);
  return id && !ids.has(id) && !urls.has(item.link);
});

const rows = [];
const skipped = [];
for (const item of newItems) {
  try {
    rows.push(await fetchPhoto(item.link, item));
    await new Promise((resolve) => setTimeout(resolve, 120));
  } catch (error) {
    skipped.push({ link: item.link, reason: error.message });
  }
}

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(
  outputPath,
  rows.map((row) => row.map(tsvEscape).join("\t")).join("\n"),
  "utf8",
);

console.log(JSON.stringify({
  checked: items.length,
  newPhotosFound: newItems.length,
  rowsPrepared: rows.length,
  outputPath,
  skipped,
}, null, 2));
