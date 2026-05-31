import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const csvPath = process.argv[2];
const dryRun = process.argv.includes("--dry-run");

if (!csvPath) {
  console.error("Usage: node tools/apply-photo-organizer-export.mjs <Export_Sync.csv> [--dry-run]");
  process.exit(1);
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = path.join(repoRoot, "photo-data.js");
const FLICKR_USER_ID = "204244048@N05";

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

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function loadSiteData(source) {
  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context);
  return context;
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

function flickrIdFromUrl(value) {
  const text = String(value || "");
  return (text.match(/\/photos\/[^/]+\/(\d+)/) || text.match(/\/65535\/(\d+)_/) || [])[1] || "";
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

function shutterFromExposure(value) {
  return (String(value || "").match(/\(([^)]+)\)/) || [])[1] || String(value || "").replace(/\s*sec.*/i, "").trim();
}

function apertureFromExif(rows) {
  if (rows.Aperture) return rows.Aperture;
  if (rows["F-Number"]) return rows["F-Number"];
  return "";
}

function fullImageUrl(value) {
  return String(value || "").replace(/_[a-z]\.jpg$/i, "_b.jpg");
}

async function fetchFlickrInfo(flickrUrl) {
  const flickrId = flickrIdFromUrl(flickrUrl);
  if (!flickrId) throw new Error(`Could not read Flickr ID from ${flickrUrl}`);
  const pageUrl = `https://www.flickr.com/photos/${FLICKR_USER_ID}/${flickrId}/`;
  const pageResponse = await fetch(pageUrl);
  const pageHtml = await pageResponse.text();
  if (!pageResponse.ok) throw new Error(`Flickr page returned ${pageResponse.status} for ${pageUrl}`);

  const stats = pageHtml.match(/"photo-stats-models":\[\{"data":\{[^}]*?"dateTaken":"([^"]*)","datePosted":"([^"]*)","id":"([^"]*)"/);
  const imageUrl = fullImageUrl(metaContent(pageHtml, "og:image"));
  const title = metaContent(pageHtml, "og:title") || metaContent(pageHtml, "title") || "";

  let camera = {};
  try {
    const metaResponse = await fetch(`${pageUrl}meta`);
    const metaHtml = await metaResponse.text();
    const rows = exifRows(metaHtml);
    camera = {
      camera: rows.Camera || "",
      lens: rows.Lens || rows["Lens Model"] || "",
      shutter: shutterFromExposure(rows.Exposure),
      aperture: apertureFromExif(rows),
      iso: rows["ISO Speed"] || rows.ISO || rows["Recommended Exposure Index"] || "",
      focalLength: rows["Focal Length"] || "",
      flash: rows.Flash === "No Flash" ? "Flash (off, did not fire)" : rows.Flash || "",
      exposureMode: rows["Exposure Mode"] || rows["Exposure Program"] || "",
      meteringMode: rows["Metering Mode"] || "",
      whiteBalance: rows["White Balance"] || "",
    };
  } catch {
    camera = {};
  }

  return {
    flickr: {
      flickrId,
      title,
      dateTaken: stats?.[1] || "",
      width: metaContent(pageHtml, "og:image:width"),
      height: metaContent(pageHtml, "og:image:height"),
    },
    camera,
    imageUrl,
    pageUrl,
  };
}

function setObjectLocation(objectText, slug) {
  let next = objectText.replace(/\n\s*location:\s*"[^"]*",/g, "");
  if (!slug) return next;
  if (/\n\s*species:\s*"/.test(next)) {
    return next.replace(/(\n\s*species:\s*")/, `\n    location: "${slug}",$1`);
  }
  if (/\n\s*project:\s*"/.test(next)) {
    return next.replace(/(\n\s*project:\s*"[^"]*",)/, `$1\n    location: "${slug}",`);
  }
  return next.replace(/(\n\s*is_featured:\s*(?:true|false),)/, `$1\n    location: "${slug}",`);
}

function setObjectProject(objectText, slug) {
  let next = objectText.replace(/\n\s*project:\s*"[^"]*",/g, "");
  if (!slug) return next;
  if (/\n\s*location:\s*"/.test(next)) {
    return next.replace(/(\n\s*location:\s*"[^"]*",)/, `\n    project: "${slug}",$1`);
  }
  if (/\n\s*species:\s*"/.test(next)) {
    return next.replace(/(\n\s*species:\s*")/, `\n    project: "${slug}",$1`);
  }
  return next.replace(/(\n\s*is_featured:\s*(?:true|false),)/, `$1\n    project: "${slug}",`);
}

function setObjectFeatured(objectText, featured) {
  if (/\n\s*is_featured:\s*(?:true|false),/.test(objectText)) {
    return objectText.replace(/\n\s*is_featured:\s*(?:true|false),/, `\n    is_featured: ${featured},`);
  }
  if (/\n\s*alt:\s*"/.test(objectText)) {
    return objectText.replace(/(\n\s*alt:\s*"[^"]*",)/, `$1\n    is_featured: ${featured},`);
  }
  return objectText.replace(/(\n\s*src:\s*"[^"]*",)/, `$1\n    is_featured: ${featured},`);
}

function parseFeatured(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return null;
  if (["true", "yes", "y", "1", "checked"].includes(normalized)) return true;
  if (["false", "no", "n", "0", "unchecked"].includes(normalized)) return false;
  return null;
}

function rowValue(row, index, header) {
  return Object.hasOwn(index, header) ? String(row[index[header]] || "").trim() : "";
}

function publishStatusForRow(row, index, photoId) {
  if (!Object.hasOwn(index, "Publish Status")) return photoId ? "published" : "needs review";
  const value = rowValue(row, index, "Publish Status").toLowerCase();
  return value || (photoId ? "published" : "needs review");
}

function canPublish(status) {
  return status === "approved" || status === "published";
}

function formatPhotoObject(photo) {
  const lines = [
    "  {",
    `    id: ${photo.id},`,
    `    src: ${jsString(photo.src)},`,
    `    alt: ${jsString(photo.alt || "Photography by Brandon Alley")},`,
    `    is_featured: ${photo.is_featured ? "true" : "false"},`,
  ];
  if (photo.project) lines.push(`    project: ${jsString(photo.project)},`);
  if (photo.location) lines.push(`    location: ${jsString(photo.location)},`);
  if (photo.species) lines.push(`    species: ${jsString(photo.species)},`);
  lines.push("  },");
  return lines.join("\n");
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

const source = await fs.readFile(dataPath, "utf8");
const site = loadSiteData(source);
const locations = Array.isArray(site.LOCATIONS_DATA) ? site.LOCATIONS_DATA : [];
const gallery = Array.isArray(site.GALLERY_IMAGES) ? site.GALLERY_IMAGES : [];
const flickrMetadata = site.FLICKR_METADATA || {};
const locationByFolder = new Map();
for (const location of locations) {
  locationByFolder.set(location.name.toLowerCase(), location.slug);
  locationByFolder.set(location.slug.toLowerCase(), location.slug);
}
const projectByFolder = new Map();
for (const project of new Set(gallery.map((photo) => photo.project).filter(Boolean))) {
  projectByFolder.set(`project: ${project}`.toLowerCase(), project);
  projectByFolder.set(project.toLowerCase(), project);
  projectByFolder.set(slugify(project), project);
}

const rows = parseCsv(await fs.readFile(csvPath, "utf8"));
const headers = rows.shift() || [];
const index = Object.fromEntries(headers.map((header, i) => [header.trim(), i]));
let updated = source;
const changes = [];
const skipped = [];
const report = {
  rowsRead: rows.length,
  eligibleRows: 0,
  newPhotosAdded: 0,
  existingPhotosUpdated: 0,
  needsReview: 0,
  hiddenOrBlocked: 0,
};
let nextPhotoId = Math.max(0, ...gallery.map((photo) => Number(photo.id) || 0)) + 1;
const existingFlickrIds = new Set(Object.values(flickrMetadata).map((entry) => entry?.flickrId).filter(Boolean));

for (const row of rows) {
  let photoId = Number(row[index["Photo ID"]]);
  const folder = rowValue(row, index, "Folder (Location)");
  const flickrUrl = rowValue(row, index, "Flickr URL");
  if (!photoId && !flickrUrl) continue;
  const publishStatus = publishStatusForRow(row, index, photoId);

  if (!canPublish(publishStatus)) {
    if (publishStatus === "needs review") report.needsReview += 1;
    else report.hiddenOrBlocked += 1;
    skipped.push({
      photoId: photoId || undefined,
      flickrUrl: flickrUrl || undefined,
      publishStatus,
      reason: "Row is not Approved or Published",
    });
    continue;
  }
  report.eligibleRows += 1;

  let assignmentType = "location";
  let targetSlug = null;
  if (/^project:\s*/i.test(folder)) {
    assignmentType = "project";
    targetSlug = projectByFolder.get(folder.toLowerCase()) || projectByFolder.get(slugify(folder.replace(/^project:\s*/i, "")));
  } else if (!/^unassigned$/i.test(folder)) {
    targetSlug = locationByFolder.get(folder.toLowerCase()) || locationByFolder.get(slugify(folder));
  }

  if (folder && !targetSlug && !/^unassigned$/i.test(folder)) {
    skipped.push({ photoId, folder, reason: "Folder is not a known location or project" });
    continue;
  }

  if (!photoId) {
    try {
      const flickr = await fetchFlickrInfo(flickrUrl);
      if (existingFlickrIds.has(flickr.flickr.flickrId)) {
        skipped.push({ flickrUrl, reason: "Flickr photo already exists in photo-data.js" });
        continue;
      }
      photoId = nextPhotoId;
      nextPhotoId += 1;
      existingFlickrIds.add(flickr.flickr.flickrId);

      const explicitProject = rowValue(row, index, "Project");
      const project = explicitProject || (assignmentType === "project" ? targetSlug : "");
      const location = assignmentType === "location" ? targetSlug : "";
      const featured = parseFeatured(rowValue(row, index, "Featured")) ?? false;
      const alt = rowValue(row, index, "Alt Text")
        || rowValue(row, index, "Caption")
        || rowValue(row, index, "Display Title")
        || rowValue(row, index, "Notes")
        || rowValue(row, index, "Title")
        || flickr.flickr.title
        || "Photography by Brandon Alley";
      const photo = {
        id: photoId,
        src: fullImageUrl(rowValue(row, index, "Full Image URL") || rowValue(row, index, "Resolved Image URL") || flickr.imageUrl),
        alt,
        is_featured: featured,
        project,
        location,
        species: rowValue(row, index, "Species"),
      };

      const flickrEntry = {
        flickrId: rowValue(row, index, "Flickr ID") || flickr.flickr.flickrId,
        title: rowValue(row, index, "Title") || flickr.flickr.title,
        dateTaken: rowValue(row, index, "Date Taken") || flickr.flickr.dateTaken,
        width: rowValue(row, index, "Width") || flickr.flickr.width,
        height: rowValue(row, index, "Height") || flickr.flickr.height,
      };
      const cameraEntry = {
        camera: rowValue(row, index, "Camera") || flickr.camera.camera || "",
        lens: rowValue(row, index, "Lens") || flickr.camera.lens || "",
        shutter: rowValue(row, index, "Shutter") || flickr.camera.shutter || "",
        aperture: rowValue(row, index, "Aperture") || flickr.camera.aperture || "",
        iso: rowValue(row, index, "ISO") || flickr.camera.iso || "",
        focalLength: rowValue(row, index, "Focal Length") || flickr.camera.focalLength || "",
        flash: rowValue(row, index, "Flash") || flickr.camera.flash || "",
        exposureMode: rowValue(row, index, "Exposure Mode") || flickr.camera.exposureMode || "",
        meteringMode: rowValue(row, index, "Metering") || flickr.camera.meteringMode || "",
        whiteBalance: rowValue(row, index, "White Balance") || flickr.camera.whiteBalance || "",
      };

      updated = appendGalleryImage(updated, photo);
      updated = appendFlickrMetadata(updated, photoId, flickrEntry);
      updated = appendCameraMetadata(updated, photoId, cameraEntry);
      changes.push({ photoId, action: "added", folder, location, project, featured });
      report.newPhotosAdded += 1;
    } catch (error) {
      skipped.push({ flickrUrl, reason: error.message });
    }
    continue;
  }

  if (!folder) continue;

  const pattern = new RegExp(`(\\{\\s*id:\\s*${photoId},[\\s\\S]*?\\n\\s*\\},)`);
  const match = updated.match(pattern);
  if (!match) {
    skipped.push({ photoId, folder, reason: "Photo ID not found in photo-data.js" });
    continue;
  }

  const before = match[1];
  let after = assignmentType === "project"
    ? setObjectProject(before, targetSlug)
    : setObjectLocation(before, targetSlug);
  if (Object.hasOwn(index, "Featured")) {
    const featured = parseFeatured(row[index["Featured"]]);
    if (featured !== null) {
      after = setObjectFeatured(after, featured);
    }
  }
  if (before !== after) {
    updated = updated.replace(before, after);
    changes.push({ photoId, folder, [assignmentType]: targetSlug || "", featured: parseFeatured(row[index["Featured"]]) });
    report.existingPhotosUpdated += 1;
  }
}

console.log(JSON.stringify({ dryRun, report, changes, skipped }, null, 2));

if (!dryRun && changes.length) {
  await fs.writeFile(dataPath, updated, "utf8");
}
