const fs = require("fs");
const vm = require("vm");

const FLICKR_USER_ID = "204244048@N05";

function decodeHtml(value) {
  return String(value || "")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function metaContent(html, key) {
  const pattern = new RegExp(
    `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']*)["']`,
    "i"
  );
  return decodeHtml((html.match(pattern) || [])[1] || "");
}

function flickrIdFromSrc(src) {
  return (String(src || "").match(/\/65535\/(\d+)_/) || [])[1] || "";
}

async function main() {
  const context = {};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("photo-data.js", "utf8"), context);

  const metadata = {};

  for (const image of context.GALLERY_IMAGES || []) {
    const flickrId = flickrIdFromSrc(image.src);
    if (!flickrId) continue;

    const pageUrl = `https://www.flickr.com/photos/${FLICKR_USER_ID}/${flickrId}/`;
    const response = await fetch(pageUrl);
    const html = await response.text();
    const stats = html.match(
      /"photo-stats-models":\[\{"data":\{[^}]*?"dateTaken":"([^"]*)","datePosted":"([^"]*)","id":"([^"]*)"/
    );

    metadata[image.id] = {
      flickrId,
      pageUrl,
      title: metaContent(html, "og:title") || metaContent(html, "title") || image.alt || "",
      description: metaContent(html, "og:description"),
      dateTaken: stats?.[1] || "",
      datePosted: stats?.[2] || "",
      width: metaContent(html, "og:image:width"),
      height: metaContent(html, "og:image:height"),
    };

    await new Promise((resolve) => setTimeout(resolve, 80));
  }

  console.log(JSON.stringify(metadata, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
