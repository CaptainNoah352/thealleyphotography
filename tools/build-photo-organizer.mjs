import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outputDir = path.join(repoRoot, "outputs", "photo-organizer");
const outputPath = path.join(outputDir, "Brandon_Alley_Photo_Organizer.xlsx");
const maxRows = 500;

function thumbUrl(src) {
  return String(src || "").replace(/_[a-z]\.jpg$/i, "_m.jpg");
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

function directFlickrPageUrl(image, metadata) {
  if (metadata?.flickrId) {
    return `https://www.flickr.com/photos/204244048@N05/${metadata.flickrId}/`;
  }
  const match = String(image.src || "").match(/\/65535\/(\d+)_/);
  return match ? `https://www.flickr.com/photos/204244048@N05/${match[1]}/` : image.src;
}

function loadSiteData() {
  const context = {};
  vm.createContext(context);
  vm.runInContext(fsSync.readFileSync(path.join(repoRoot, "photo-data.js"), "utf8"), context);
  return context;
}

function folderForPhoto(photo, locationsBySlug) {
  if (photo.location && locationsBySlug.get(photo.location)) return locationsBySlug.get(photo.location).name;
  if (photo.location) return photo.location;
  if (photo.project) return `Project: ${photo.project}`;
  return "Unassigned";
}

function styleTitle(range) {
  range.format = {
    fill: "#2E4228",
    font: { bold: true, color: "#FFFFFF", size: 16 },
  };
}

function styleHeader(range) {
  range.format = {
    fill: "#4A6741",
    font: { bold: true, color: "#FFFFFF" },
  };
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const site = loadSiteData();
const gallery = Array.isArray(site.GALLERY_IMAGES) ? site.GALLERY_IMAGES : [];
const metadata = site.FLICKR_METADATA || {};
const cameraMetadata = site.FLICKR_CAMERA_METADATA || {};
const locations = Array.isArray(site.LOCATIONS_DATA) ? site.LOCATIONS_DATA : [];
const locationsBySlug = new Map(locations.map((location) => [location.slug, location]));
const folderNames = [
  "Unassigned",
  ...locations.map((location) => location.name),
  ...Array.from(new Set(gallery.map((photo) => photo.project).filter(Boolean))).map((project) => `Project: ${project}`),
].filter((value, index, all) => all.indexOf(value) === index);

const workbook = Workbook.create();
const organizer = workbook.worksheets.add("Photo Organizer");
const exportSheet = workbook.worksheets.add("Export_Sync");
const foldersSheet = workbook.worksheets.add("Folders");
const scriptSheet = workbook.worksheets.add("Apps Script");
const guideSheet = workbook.worksheets.add("Guide");

organizer.showGridLines = false;
exportSheet.showGridLines = false;
foldersSheet.showGridLines = false;
scriptSheet.showGridLines = false;
guideSheet.showGridLines = false;

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
organizer.getRangeByIndexes(0, 0, 1, organizerHeaders.length).values = [organizerHeaders];
styleHeader(organizer.getRangeByIndexes(0, 0, 1, organizerHeaders.length));
organizer.freezePanes.freezeRows(1);
organizer.getRange("A:A").format.columnWidthPx = 190;
organizer.getRange("B:B").format.columnWidthPx = 350;
organizer.getRange("C:C").format.columnWidthPx = 150;
organizer.getRange("D:D").format.columnWidthPx = 330;
organizer.getRange("E:E").format.columnWidthPx = 80;
organizer.getRange("F:F").format.columnWidthPx = 130;
organizer.getRange("G:G").format.columnWidthPx = 100;
organizer.getRange("H:J").format.columnWidthPx = 150;
organizer.getRange("K:L").format.columnWidthPx = 120;
organizer.getRange("M:P").format.columnWidthPx = 220;
organizer.getRange("Q:Q").format.columnWidthPx = 330;
organizer.getRange("R:AK").format.columnWidthPx = 150;
organizer.getRange(`A2:AK${maxRows + 1}`).format = {
  wrapText: true,
  verticalAlignment: "middle",
};
organizer.getRange(`C2:C${maxRows + 1}`).format.rowHeightPx = 120;

const seededRows = gallery
  .slice()
  .sort((a, b) => Number(a.id || 0) - Number(b.id || 0))
  .map((photo) => {
    const photoMetadata = metadata[photo.id] || {};
    const photoCameraMetadata = cameraMetadata[photo.id] || {};
    return [
      folderForPhoto(photo, locationsBySlug),
      directFlickrPageUrl(photo, photoMetadata),
      null,
      thumbUrl(photo.src),
      photo.id,
      "Published",
      Boolean(photo.is_featured),
      photo.project || "",
      photo.species || "",
      photo.project || "",
      "",
      "",
      photo.alt || "",
      photo.alt || "",
      photoMetadata.title || photo.alt || "",
      "",
      photo.src || "",
      photoMetadata.flickrId || "",
      photoMetadata.title || "",
      photoMetadata.description || "",
      photoMetadata.datePosted || "",
      photoMetadata.dateTaken || "",
      photoMetadata.tags || "",
      photoMetadata.width || "",
      photoMetadata.height || "",
      photoMetadata.width && photoMetadata.height
        ? (Number(photoMetadata.width) >= Number(photoMetadata.height) ? "Landscape" : "Portrait")
        : "",
      photoMetadata.width && photoMetadata.height ? `${photoMetadata.width}:${photoMetadata.height}` : "",
      photoCameraMetadata.camera || "",
      photoCameraMetadata.lens || "",
      photoCameraMetadata.shutter || "",
      photoCameraMetadata.aperture || "",
      photoCameraMetadata.iso || "",
      photoCameraMetadata.focalLength || "",
      photoCameraMetadata.exposureMode || "",
      photoCameraMetadata.meteringMode || "",
      photoCameraMetadata.whiteBalance || "",
      photoCameraMetadata.flash || "",
    ];
  });

if (seededRows.length) {
  organizer.getRangeByIndexes(1, 0, seededRows.length, organizerHeaders.length).values = seededRows;
}

for (let row = 2; row <= maxRows + 1; row += 1) {
  organizer.getRange(`C${row}`).formulas = [[`=IF($D${row}="","",IMAGE($D${row},4,110,140))`]];
}

for (let row = seededRows.length + 2; row <= maxRows + 1; row += 1) {
  organizer.getRange(`D${row}`).formulas = [[
    `=IF($B${row}="","",IF(REGEXMATCH($B${row},"live.staticflickr.com"),REGEXREPLACE($B${row},"_[a-z]\\.jpg$","_m.jpg"),FLICKR_IMAGE_URL($B${row})))`
  ]];
}

organizer.tables.add(`A1:AK${maxRows + 1}`, true, "PhotoOrganizerTable");

foldersSheet.getRange("A1:C1").values = [["Folder (Location)", "Site Slug", "Use"]];
styleHeader(foldersSheet.getRange("A1:C1"));
const folderRows = [
  ["Unassigned", "", "No folder/location assigned yet"],
  ...locations.map((location) => [location.name, location.slug, "Location gallery"]),
  ...Array.from(new Set(gallery.map((photo) => photo.project).filter(Boolean))).map((project) => [`Project: ${project}`, slugify(project), "Project/gallery section"]),
];
foldersSheet.getRangeByIndexes(1, 0, folderRows.length, 3).values = folderRows;
foldersSheet.getRange("A:A").format.columnWidthPx = 240;
foldersSheet.getRange("B:B").format.columnWidthPx = 220;
foldersSheet.getRange("C:C").format.columnWidthPx = 220;
foldersSheet.tables.add(`A1:C${folderRows.length + 1}`, true, "FolderMapTable");

organizer.getRange(`A2:A${maxRows + 1}`).dataValidation = {
  rule: { type: "list", formula1: `Folders!$A$2:$A$${folderRows.length + 1}` },
  prompt: { title: "Folder", message: "Choose a folder/location category from the Folders sheet.", show: true },
  errorAlert: { title: "Unknown folder", message: "Use a folder listed on the Folders sheet, or add the new folder there first.", show: true },
  ignoreBlanks: true,
  inCellDropDown: true,
};

organizer.getRange(`F2:F${maxRows + 1}`).dataValidation = {
  rule: { type: "list", formula1: '"Needs Review,Approved,Published,Hidden,Do Not Publish"' },
  prompt: { title: "Publish Status", message: "Only Approved or Published rows are eligible for repo sync.", show: true },
  errorAlert: { title: "Unknown status", message: "Use Needs Review, Approved, Published, Hidden, or Do Not Publish.", show: true },
  ignoreBlanks: true,
  inCellDropDown: true,
};

const exportHeaders = [
  "Folder (Location)",
  "Flickr URL",
  "Resolved Image URL",
  "Photo ID",
  "Publish Status",
  "Folder Slug",
  "Ready",
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
exportSheet.getRangeByIndexes(0, 0, 1, exportHeaders.length).values = [exportHeaders];
styleHeader(exportSheet.getRangeByIndexes(0, 0, 1, exportHeaders.length));
exportSheet.freezePanes.freezeRows(1);
for (let row = 2; row <= maxRows + 1; row += 1) {
  exportSheet.getRange(`A${row}:E${row}`).formulas = [[
    `='Photo Organizer'!A${row}`,
    `='Photo Organizer'!B${row}`,
    `='Photo Organizer'!D${row}`,
    `='Photo Organizer'!E${row}`,
    `='Photo Organizer'!F${row}`,
  ]];
  exportSheet.getRange(`F${row}`).formulas = [[`=IF(A${row}="","",IFERROR(VLOOKUP(A${row},Folders!$A$2:$B$100,2,FALSE),LOWER(REGEXREPLACE(A${row},"[^A-Za-z0-9]+","-"))))`]];
  exportSheet.getRange(`G${row}`).formulas = [[`=IF(B${row}="","",IF(C${row}<>"","Yes","Needs preview URL"))`]];
  exportSheet.getRange(`H${row}`).formulas = [[`='Photo Organizer'!G${row}`]];
  exportSheet.getRange(`I${row}:AL${row}`).formulas = [[
    `='Photo Organizer'!H${row}`,
    `='Photo Organizer'!I${row}`,
    `='Photo Organizer'!J${row}`,
    `='Photo Organizer'!K${row}`,
    `='Photo Organizer'!L${row}`,
    `='Photo Organizer'!M${row}`,
    `='Photo Organizer'!N${row}`,
    `='Photo Organizer'!O${row}`,
    `='Photo Organizer'!P${row}`,
    `='Photo Organizer'!Q${row}`,
    `='Photo Organizer'!R${row}`,
    `='Photo Organizer'!S${row}`,
    `='Photo Organizer'!T${row}`,
    `='Photo Organizer'!U${row}`,
    `='Photo Organizer'!V${row}`,
    `='Photo Organizer'!W${row}`,
    `='Photo Organizer'!X${row}`,
    `='Photo Organizer'!Y${row}`,
    `='Photo Organizer'!Z${row}`,
    `='Photo Organizer'!AA${row}`,
    `='Photo Organizer'!AB${row}`,
    `='Photo Organizer'!AC${row}`,
    `='Photo Organizer'!AD${row}`,
    `='Photo Organizer'!AE${row}`,
    `='Photo Organizer'!AF${row}`,
    `='Photo Organizer'!AG${row}`,
    `='Photo Organizer'!AH${row}`,
    `='Photo Organizer'!AI${row}`,
    `='Photo Organizer'!AJ${row}`,
    `='Photo Organizer'!AK${row}`,
  ]];
}
exportSheet.getRange("A:A").format.columnWidthPx = 190;
exportSheet.getRange("B:B").format.columnWidthPx = 350;
exportSheet.getRange("C:C").format.columnWidthPx = 330;
exportSheet.getRange("D:D").format.columnWidthPx = 80;
exportSheet.getRange("E:E").format.columnWidthPx = 130;
exportSheet.getRange("F:F").format.columnWidthPx = 180;
exportSheet.getRange("G:G").format.columnWidthPx = 130;
exportSheet.getRange("H:H").format.columnWidthPx = 100;
exportSheet.getRange("I:K").format.columnWidthPx = 150;
exportSheet.getRange("L:M").format.columnWidthPx = 120;
exportSheet.getRange("N:Q").format.columnWidthPx = 220;
exportSheet.getRange("R:AL").format.columnWidthPx = 150;
exportSheet.tables.add(`A1:AL${maxRows + 1}`, true, "PhotoSyncExportTable");

guideSheet.getRange("A1:F1").merge();
guideSheet.getRange("A1").values = [["Brandon Alley Photo Organizer"]];
styleTitle(guideSheet.getRange("A1:F1"));
guideSheet.getRange("A3:B12").values = [
  ["What this is", "A Google Sheets-ready organizer for assigning photo URLs to folder/location categories while seeing thumbnails."],
  ["Main sheet", "Use Photo Organizer. Edit Publish Status, Folder (Location), Featured, Project, Species, Category, Alt Text, Caption, Display Title, and Notes."],
  ["Required columns", "The first three columns are Folder (Location), Flickr URL, and Preview Image. Publish Status controls whether a row can sync to the repo."],
  ["Adding photos", "New Flickr intake rows start as Needs Review. Leave Photo ID blank until a row is approved and synced to the repo."],
  ["Thumbnail formula", "Existing rows already have thumbnail URLs. For new Flickr page URLs, install the Apps Script function from the Apps Script tab."],
  ["Folders", "Edit the Folders sheet to add or rename folder categories. Use the same folder names in Photo Organizer."],
  ["Export", "Use Export_Sync for a clean table to download as CSV or use in a future sync script."],
  ["Sync note", "Download Export_Sync as CSV, then run node tools/apply-photo-organizer-export.mjs <csv> --dry-run to preview approved repo changes before applying them."],
  ["Google Sheets import", "Upload this .xlsx to Google Drive and open with Google Sheets. Then add the Apps Script code if you want pasted Flickr page URLs to auto-resolve."],
  ["Preview limitation", "Excel may not render Google Sheets IMAGE/REGEX formulas exactly. The target runtime for live thumbnail previews is Google Sheets."],
];
guideSheet.getRange("A:A").format.columnWidthPx = 180;
guideSheet.getRange("B:B").format.columnWidthPx = 680;
guideSheet.getRange("A3:A12").format = { fill: "#E2CEB4", font: { bold: true } };
guideSheet.getRange("B3:B12").format = { wrapText: true };

const appsScript = `/**
 * Returns a live.staticflickr.com thumbnail URL for a Flickr photo page URL.
 * Install in Google Sheets: Extensions > Apps Script, paste this code, save.
 * Then the Photo Organizer sheet can use: =FLICKR_IMAGE_URL(B2)
 */
function FLICKR_IMAGE_URL(input) {
  if (Array.isArray(input)) {
    return input.map(function(row) {
      return row.map(function(value) {
        return flickrImageUrl_(value);
      });
    });
  }
  return flickrImageUrl_(input);
}

function flickrImageUrl_(url) {
  url = String(url || '').trim();
  if (!url) return '';
  if (/live\\.staticflickr\\.com/.test(url)) {
    return url.replace(/_[a-z]\\.jpg$/i, '_m.jpg');
  }
  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var html = response.getContentText();
  var match = html.match(/<meta\\s+property=["']og:image["']\\s+content=["']([^"']+)["']/i);
  if (!match) match = html.match(/<meta\\s+content=["']([^"']+)["']\\s+property=["']og:image["']/i);
  return match ? match[1].replace(/_[a-z]\\.jpg$/i, '_m.jpg') : '';
}`;

scriptSheet.getRange("A1:D1").merge();
scriptSheet.getRange("A1").values = [["Apps Script for Flickr URL thumbnails"]];
styleTitle(scriptSheet.getRange("A1:D1"));
scriptSheet.getRange("A3").values = [["Install steps"]];
scriptSheet.getRange("A4").values = [["1. Open the imported Google Sheet."]];
scriptSheet.getRange("A5").values = [["2. Go to Extensions > Apps Script."]];
scriptSheet.getRange("A6").values = [["3. Paste the code below and save."]];
scriptSheet.getRange("A7").values = [["4. Return to the sheet. New pasted Flickr page URLs can now resolve thumbnails."]];
scriptSheet.getRange("A9").values = [[appsScript]];
scriptSheet.getRange("A:A").format.columnWidthPx = 850;
scriptSheet.getRange("A9").format = {
  font: { name: "Consolas", size: 9 },
  wrapText: true,
  fill: "#F5EAD8",
};

await fs.mkdir(outputDir, { recursive: true });
const exportRows = [
  exportHeaders,
  ...seededRows.map((row) => {
    const folder = row[0];
    const location = locations.find((entry) => entry.name === folder);
    const slug = location?.slug || (folder === "Unassigned" ? "" : slugify(String(folder).replace(/^Project:\s*/i, "")));
    return [folder, row[1], row[3], row[4], row[5], slug, row[3] ? "Yes" : "Needs preview URL", ...row.slice(6)];
  }),
];
await fs.writeFile(
  path.join(outputDir, "Export_Sync.csv"),
  exportRows.map((row) => row.map(csvEscape).join(",")).join("\n"),
  "utf8",
);
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);
console.log(outputPath);
