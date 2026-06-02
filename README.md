# Brandon Alley Photography

Static photography portfolio site built with plain HTML, CSS, and JavaScript. Deployed from the repository root on GitHub Pages.

## Project Structure

```text
.
|-- index.html          # Homepage with featured carousel, About, Contact, and lightbox
|-- portfolio.html      # Full gallery page with lightbox
|-- projects.html       # Herons of Florida project page
|-- about.html          # About page
|-- contact.html        # Contact page
|-- photo-data.js       # All photo and species data — edit this file to change photos
|-- script.js           # Main site entry point; starts the correct page behavior
|-- js/
|   |-- site-core.js    # Shared DOM references, state, metadata helpers, and utilities
|   |-- lightbox.js     # Lightbox behavior and Flickr/EXIF metadata display
|   |-- gallery.js      # Portfolio gallery rendering
|   |-- carousel.js     # Homepage featured carousel
|   |-- locations.js    # Location cards and location galleries
|   |-- projects.js     # Project gallery, species cards, and species modal
|   `-- navigation.js   # Mobile menu, active nav, keyboard events, and scroll reveal
|-- style.css           # Shared site styling
|-- admin.html          # Admin reference panel (read-only photo viewer with ID numbers)
|-- admin.js            # Admin panel logic
|-- admin.css           # Admin panel styles
|-- logo-component.html # Standalone logo markup
|-- CNAME               # Custom domain for GitHub Pages
`-- README.md           # Project notes
```

---

## Admin Panel

Open `admin.html` in a browser (or at `yourdomain.com/admin.html`) to see every photo with its reference number, thumbnail, and current metadata.

The panel is **read-only** — it shows what's in `photo-data.js`. To change anything, tell Claude which photo number to update (see workflows below).

**Filters:**
- **Project** — show only photos in a specific project (e.g., "herons")
- **Featured** — show only photos marked as carousel-featured

---

## Photo Reference Numbers

Every photo has a stable `id` number (1–25 for the current set). These numbers:

- **Never change** — even if you reorder or delete other photos
- **Are never reused** — a deleted photo's number stays retired
- **Always grow** — new photos get the next available integer

Use these numbers when talking to Claude: *"Update photo #7"*, *"Remove photo #12"*, *"Add a species tag to photo #5"*.

---

## Photo Fields Reference

All photo data lives in the `GALLERY_IMAGES` array in `photo-data.js`.

| Field | Required | Description |
|---|---|---|
| `id` | Yes | Stable integer. Never change or reuse. New photos get the next number after the last entry. |
| `src` | Yes | Full Flickr image URL (use `_b.jpg` suffix for full resolution) |
| `alt` | Yes | Photo description — shown as the lightbox caption |
| `is_featured` | No | `true` = included in the homepage carousel |
| `project` | No | Project slug (e.g. `"herons"`) — adds the photo to that project gallery |
| `species` | No | Scientific name (e.g. `"Ardea herodias"`) — links the photo to its species card in Projects |

**Example:**
```js
{
  id: 26,
  src: "https://live.staticflickr.com/65535/PHOTOID_HASH_b.jpg",
  alt: "Great Blue Heron wading at sunrise",
  is_featured: true,
  project: "herons",
  species: "Ardea herodias",
},
```

---

## Workflows

### Controlled Photo Publishing Workflow

Use this workflow whenever the user says **"update photos"**, **"update spreadsheet from Flickr"**, or **"update repo from the sheet"**.

```text
Lightroom -> Flickr -> Spreadsheet Intake -> Manual Review -> Repo Sync -> Admin/Site Verification -> Report
```

Flickr is only the intake source. The Google Sheet is the control center. The repo should only publish photos that the spreadsheet explicitly marks as approved.

Live Google Sheet:

```text
Brandon_Alley_Photo_Organizer
https://docs.google.com/spreadsheets/d/1dShWCUHNf5BEVv39rSGAmKBccVjT7gfL815aFy_ibtk/edit
```

#### Command: Update Spreadsheet From Flickr

When the user asks to update the spreadsheet from Flickr:

1. Run the Flickr intake helper:

   ```powershell
   npm.cmd run intake:flickr
   ```

2. Review `outputs/photo-organizer/Flickr_Intake.tsv`.
3. Append the prepared rows to the live Google Sheet `Photo Organizer` tab.
   - The TSV is ordered for the current `Photo Organizer` columns.
   - The `Preview Image` cell includes a Google Sheets `IMAGE()` formula so thumbnails render after paste.
4. New Flickr rows must keep these defaults:
   - `Publish Status`: `Needs Review`
   - `Featured`: `FALSE`
   - `Folder (Location)`: `Unassigned` unless the user explicitly provided it
   - `Project`, `Species`, `Category`: blank unless the user explicitly provided them
   - `Photo ID`: blank until repo sync publishes the row

The intake helper compares Flickr IDs against the current sheet export and does not prepare duplicate rows.

If a pasted row needs to be repaired, regenerate rows for specific Flickr URLs:

```powershell
npm.cmd run intake:flickr -- --urls "FLICKR_URL_1,FLICKR_URL_2"
```

#### Manual Review Fields

The spreadsheet controls publishing through these fields:

| Column | Purpose |
|---|---|
| `Publish Status` | `Needs Review`, `Approved`, `Published`, `Hidden`, or `Do Not Publish` |
| `Folder (Location)` | Website location gallery |
| `Category` | Optional category/section label |
| `Featured` | Homepage featured carousel control |
| `Homepage Order` | Optional manual ordering |
| `Portfolio Order` | Optional manual ordering |
| `Alt Text` | Preferred site alt text |
| `Caption` | Preferred photo caption |
| `Display Title` | Optional display title |
| `Project` | Project gallery slug, e.g. `herons` |
| `Species` | Species link, e.g. `Ardea herodias` |
| EXIF columns | Camera/settings data displayed on the site |

Only rows with `Publish Status` set to `Approved` or `Published` are eligible for repo sync. Rows marked `Needs Review`, `Hidden`, or `Do Not Publish` are skipped.

#### Command: Update Repo From Sheet

When the user asks to update the repo from the sheet:

1. Preview the Google Sheet changes:

   ```powershell
   npm.cmd run sync:sheet
   ```

2. Review the JSON report for new photos, updated photos, skipped rows, and missing required fields.
3. Apply only if the preview is correct:

   ```powershell
   npm.cmd run sync:sheet:apply
   ```

4. Run checks:

   ```powershell
   node --check photo-data.js
   node --check js/site-core.js
   node --check js/lightbox.js
   node --check js/gallery.js
   node --check js/carousel.js
   node --check js/locations.js
   node --check js/projects.js
   node --check js/navigation.js
   node --check script.js
   ```

5. Verify the admin panel and site sections:
   - approved photos appear in `admin.html`
   - approved location photos appear in `locations.html`
   - approved project/species photos appear in `projects.html`
   - featured photos appear in the homepage carousel only when `Featured` is true
   - skipped rows remain unpublished

6. Give the user a short report with:
   - new Flickr photos found
   - rows added to the sheet
   - photos needing review
   - approved photos published
   - skipped rows and reasons
   - duplicate photos found
   - broken image URLs or missing required fields
   - files changed

#### Google Sheet CSV Access

The sync scripts read the public `Export_Sync` CSV from Google Sheets. If access breaks, make sure the sheet is shared as **Viewer** for anyone with the link, or publish only the `Export_Sync` tab to the web as CSV.

With a custom published CSV URL:

```powershell
node tools/sync-google-sheet.mjs --csv-url "PASTE_CSV_URL_HERE" --apply
```

### Legacy Direct Flickr Add

1. Upload your photos to Flickr as usual.
2. Copy the Flickr page URLs for the new photos (e.g. `https://www.flickr.com/photos/204244048@N05/12345678901/`).
3. Tell Claude:

   > "Add new photos from my Flickr. Here are the photo page URLs: [paste URLs]"

This direct-to-repo workflow is no longer preferred. Use **Update Spreadsheet From Flickr** first, then publish only reviewed and approved rows from the spreadsheet.

**Tip:** You can also paste the direct `_b.jpg` image URLs if you already have them from Flickr's "All sizes" page or the embed code.

---

### Updating Photo Metadata

1. Open `admin.html` to find the photo number.
2. Tell Claude what to change, referencing the number:

   > "Update photo #7 alt text to 'Great Blue Heron at sunrise, Ocala National Forest'"

   > "Set photo #16 is_featured to false"

   > "Add project 'herons' and species 'Ardea herodias' to photo #11"

   > "Remove photo #3"

Claude edits `photo-data.js`, commits, and pushes. The site updates automatically.

---

### Updating Species Metadata (Herons Project)

Species data lives in the `SPECIES_DATA` object in `photo-data.js`. Each entry has: `range`, `habitat`, `diet`, `fieldMarks`, `behavior`, `conservation`, `funFact`.

Tell Claude:

> "Update the funFact for Great Blue Heron (Ardea herodias) to: '...'"

> "Change the conservation status for Reddish Egret to 'Least Concern'"

---

## Local Preview

Open `index.html` directly in a browser, or run a local server:

```bash
python -m http.server 3000
```

Then visit `http://localhost:3000`.

---

## Checks

Validate JavaScript syntax:

```bash
node --check js/site-core.js
node --check js/lightbox.js
node --check js/gallery.js
node --check js/carousel.js
node --check js/locations.js
node --check js/projects.js
node --check js/navigation.js
node --check script.js
node --check admin.js
node --check photo-data.js
```

> Note: `node --check` validates syntax only. The public site files are classic browser scripts loaded in order after `photo-data.js`, so shared names such as `GALLERY_IMAGES`, `dom`, and `state` are expected to come from earlier script tags.

---

## Deploy

No build step required. Deploy from the repository root to GitHub Pages.
