import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SPREADSHEET_ID = "1dShWCUHNf5BEVv39rSGAmKBccVjT7gfL815aFy_ibtk";
const PHOTO_ORGANIZER_GID = "1145637188";
const EXPORT_SYNC_GID = "2076409196";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outputPath = path.join(repoRoot, "outputs", "photo-organizer", "Export_Sync.from-google.csv");
const applyScript = path.join(repoRoot, "tools", "apply-photo-organizer-export.mjs");

function getArgValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const shouldApply = process.argv.includes("--apply");
const csvUrl = getArgValue("--csv-url")
  || process.env.GOOGLE_SHEET_CSV_URL
  || `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${EXPORT_SYNC_GID}`;
const organizerCsvUrl = getArgValue("--organizer-csv-url")
  || process.env.GOOGLE_SHEET_ORGANIZER_CSV_URL
  || `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${PHOTO_ORGANIZER_GID}`;

const reviewHeaders = [
  "Publish Status",
  "Category",
  "Homepage Order",
  "Portfolio Order",
  "Alt Text",
  "Caption",
  "Display Title",
  "Description",
  "Date Uploaded",
  "Tags",
  "Orientation",
  "Aspect Ratio",
];

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

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function rowKey(row, index) {
  const photoId = index["Photo ID"] == null ? "" : row[index["Photo ID"]];
  const flickrId = index["Flickr ID"] == null ? "" : row[index["Flickr ID"]];
  const flickrUrl = index["Flickr URL"] == null ? "" : row[index["Flickr URL"]];
  if (photoId) return `photo:${photoId}`;
  if (flickrId) return `flickr:${flickrId}`;
  if (flickrUrl) return `url:${flickrUrl}`;
  return "";
}

function mergeReviewColumns(exportCsv, organizerCsv) {
  const exportRows = parseCsv(exportCsv);
  const organizerRows = parseCsv(organizerCsv);
  const exportHeaders = exportRows.shift() || [];
  const organizerHeaders = organizerRows.shift() || [];
  const exportIndex = Object.fromEntries(exportHeaders.map((header, i) => [header.trim(), i]));
  const organizerIndex = Object.fromEntries(organizerHeaders.map((header, i) => [header.trim(), i]));
  const availableReviewHeaders = reviewHeaders.filter((header) => organizerIndex[header] != null);
  if (!availableReviewHeaders.length) return exportCsv;

  const organizerByKey = new Map();
  for (const row of organizerRows) {
    const key = rowKey(row, organizerIndex);
    if (key) organizerByKey.set(key, row);
  }

  const mergedHeaders = exportHeaders.slice();
  for (const header of availableReviewHeaders) {
    if (exportIndex[header] == null) {
      exportIndex[header] = mergedHeaders.length;
      mergedHeaders.push(header);
    }
  }

  const mergedRows = exportRows.map((row) => {
    const next = row.slice();
    const source = organizerByKey.get(rowKey(row, exportIndex));
    for (const header of availableReviewHeaders) {
      next[exportIndex[header]] = source ? source[organizerIndex[header]] || "" : next[exportIndex[header]] || "";
    }
    return next;
  });

  return [mergedHeaders, ...mergedRows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");
}

function looksLikeCsv(text) {
  const firstLine = String(text || "").split(/\r?\n/, 1)[0] || "";
  return firstLine.includes("Folder (Location)")
    && firstLine.includes("Photo ID")
    && firstLine.includes("Featured");
}

function printAccessHelp(status, contentType, body) {
  console.error("Could not download Export_Sync from Google Sheets.");
  console.error(`Status: ${status || "unknown"}`);
  if (contentType) console.error(`Content-Type: ${contentType}`);
  if (/ServiceLogin|accounts\.google\.com|DOCTYPE html|<html/i.test(body || "")) {
    console.error("Google returned a sign-in or HTML page instead of CSV data.");
  }
  console.error("");
  console.error("One-time Google setup needed:");
  console.error("1. In Google Sheets, open the Brandon_Alley_Photo_Organizer file.");
  console.error("2. Share it as Viewer for anyone with the link, or publish only the Export_Sync tab to the web as CSV.");
  console.error("3. Re-run: npm run sync:sheet");
  console.error("");
  console.error("If you use a published CSV URL, run:");
  console.error("node tools/sync-google-sheet.mjs --csv-url \"PASTE_CSV_URL_HERE\"");
}

const response = await fetch(csvUrl, { redirect: "follow" });
const contentType = response.headers.get("content-type") || "";
let csvText = await response.text();

if (!response.ok || contentType.includes("text/html") || !looksLikeCsv(csvText)) {
  printAccessHelp(response.status, contentType, csvText.slice(0, 1000));
  process.exit(1);
}

const organizerResponse = await fetch(organizerCsvUrl, { redirect: "follow" });
const organizerText = await organizerResponse.text();
if (organizerResponse.ok && !/<html|ServiceLogin|accounts\.google\.com/i.test(organizerText)) {
  csvText = mergeReviewColumns(csvText, organizerText);
}

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, csvText, "utf8");
console.log(`Downloaded Export_Sync to ${outputPath}`);

const args = [applyScript, outputPath];
if (!shouldApply) args.push("--dry-run");

const result = spawnSync(process.execPath, args, {
  cwd: repoRoot,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
