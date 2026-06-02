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

### Photo Publishing Workflow

Use this workflow whenever the user says **"update photos"**.

```text
Lightroom -> Flickr -> Repo Photo Data -> Admin Review -> Codex Prompt Builder -> Site Verification -> Report
```

Flickr is the image host. `photo-data.js` is the source of truth. `admin.html` is the visual organizer and prompt builder.

#### Command: Update Photos From Flickr

When the user asks to update photos:

1. Pull new Flickr photos directly into the repo:

   ```powershell
   npm.cmd run update:photos
   ```

2. New Flickr photos are added with these defaults:
   - `is_featured: false`
   - no `location`
   - no `project`
   - no `species`
   - metadata and camera settings are saved when Flickr exposes them

3. Run checks:

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

4. Verify the admin panel and site sections:
   - new photos appear in `admin.html`
   - unassigned photos can be found with the Location filter
   - location photos appear in `locations.html` after a location is assigned
   - project/species photos appear in `projects.html` after project/species fields are assigned
   - featured photos appear in the homepage carousel only when `is_featured` is true

5. Give the user a short report with:
   - new Flickr photos found
   - photo numbers added
   - default status/placement
   - duplicate photos found
   - broken image URLs or missing required fields
   - files changed

After new photos are added, open `admin.html`, select photos visually, choose one or more prompt actions, and copy the generated Codex prompt.

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
