# The Alley Photography Portfolio

A clean, beginner-friendly, static photography portfolio website for **The Alley Photography**.

This project is built with only:
- HTML
- CSS
- JavaScript

No frameworks, no Node tooling, and no build step. It is ready for GitHub Pages.

---

## File structure

```text
.
├─ index.html    # Main page sections + lightbox markup
├─ style.css     # Theme styles, responsive gallery collage, lightbox design
├─ script.js     # Mobile menu, gallery image list, ratio detection, lightbox carousel
└─ README.md     # Editing and setup guide
```

---

## Gallery image URLs (beginner-friendly)

Open **`script.js`** and find this exact section:

```js
/*
  <!-- REPLACE OR ADD YOUR DIRECT IMAGE URLS BELOW -->
  ----------------------------------------------------
*/
const galleryImages = [
  ...
];
```

### Important Flickr note
- Use **direct image URLs** (for example from `live.staticflickr.com` ending in `.jpg`).
- Do **not** use regular Flickr photo page links.

Each image object only needs:

```js
{
  src: "https://your-direct-image-url.jpg",
  alt: "Describe the photo"
}
```

The site now auto-detects portrait/landscape/square image ratios, so you no longer need a manual `shape` field.

---

## How the dynamic gallery works

- JavaScript reads each image's real dimensions after it loads.
- It assigns a class (`ratio-landscape`, `ratio-portrait`, `ratio-square`).
- It also sets a CSS variable for the exact aspect ratio so the tile shape feels natural.
- CSS grid uses those classes to create an editorial collage layout.

If an image fails to load, that tile is hidden gracefully and removed from lightbox navigation.

---

## Fullscreen lightbox carousel

Click any gallery image to open a fullscreen lightbox.

Controls:
- **Next / Previous** buttons
- **Close** button
- **Keyboard support**
  - `Escape` closes
  - `ArrowLeft` shows previous
  - `ArrowRight` shows next
- Click on the backdrop (outside the image) to close

The lightbox image uses `object-fit: contain` so the full image stays visible without stretching.

---

## Deploy with GitHub Pages

1. Push the repo to GitHub.
2. Go to **Settings → Pages**.
3. Set Source to **Deploy from a branch**.
4. Select your branch and root folder (`/`).
5. Save and wait for the Pages URL.

Because this is plain static HTML/CSS/JS, no build process is needed.
