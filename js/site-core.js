// Shared site state and utilities.
// Photo data (GALLERY_IMAGES, SPECIES_DATA) lives in photo-data.js, loaded before these files.

const pageType = document.body?.dataset?.page || "home";

const dom = {
  menuToggle: document.getElementById("menuToggle"),
  mobileMenu: document.getElementById("mobileMenu"),
  mobileMenuClose: document.getElementById("mobileMenuClose"),
  yearNode: document.getElementById("year"),
  gallery: document.getElementById("gallery"),
  homeLocationsGrid: document.getElementById("homeLocationsGrid"),
  locationsGrid: document.getElementById("locationsGrid"),
  locationGallery: document.getElementById("location-gallery"),
  locationGalleryTitle: document.getElementById("locationGalleryTitle"),
  locationGalleryIntro: document.getElementById("locationGalleryIntro"),
  locationGalleryCount: document.getElementById("locationGalleryCount"),
  homeCarousel: document.getElementById("homeCarousel"),
  carouselTrack: document.getElementById("carouselTrack"),
  carouselPrev: document.getElementById("carouselPrev"),
  carouselNext: document.getElementById("carouselNext"),
  carouselDots: document.getElementById("carouselDots"),
  lightbox: document.getElementById("lightbox"),
  lightboxImage: document.getElementById("lightboxImage"),
  lightboxCaption: document.getElementById("lightboxCaption"),
  lightboxCounter: document.getElementById("lightboxCounter"),
  lightboxClose: document.getElementById("lightboxClose"),
  lightboxPrevZone: document.getElementById("lightboxPrevZone"),
  lightboxNextZone: document.getElementById("lightboxNextZone"),
  lightboxFigure: document.getElementById("lightboxFigure"),
  lightboxFlickrLink: document.getElementById("lightboxFlickrLink"),
  lightboxMetadataToggle: null,
  lightboxMetadataPanel: null,
  projectGallery: document.getElementById("project-gallery"),
  speciesModal: document.getElementById("speciesModal"),
  speciesModalBackdrop: document.getElementById("speciesModalBackdrop"),
  speciesModalClose: document.getElementById("speciesModalClose"),
  speciesModalTitle: document.getElementById("speciesModalTitle"),
  speciesModalScientific: document.getElementById("speciesModalScientific"),
  speciesModalConservation: document.getElementById("speciesModalConservation"),
  speciesModalDocumented: document.getElementById("speciesModalDocumented"),
  speciesModalDetails: document.getElementById("speciesModalDetails"),
  speciesModalPhotoWrap: document.getElementById("speciesModalPhotoWrap"),
};

const state = {
  orderedGalleryImages: [],
  availableLightboxItems: [],
  currentLightboxPosition: 0,
  lightboxUiVisible: true,
  lightboxMetadataVisible: false,
  hideUiTimeoutId: null,
  touchStartX: 0,
  touchStartY: 0,
  hasAlignedInitialHash: false,
  speciesModalOpener: null,
};

const CONTROL_HIDE_DELAY_MS = 1500;

function normalizeSlug(value, fallback = "uncategorized") {
  const slug = (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || fallback;
}

function normalizeGalleryImages(images) {
  if (!Array.isArray(images)) return [];
  return images
    .map((image) => {
      const src = (image?.src || image?.image_url || "").toString().trim();
      if (!src) return null;
      return {
        ...image,
        src,
        alt: (image?.alt || image?.title || "Portfolio photo").toString(),
      };
    })
    .filter(Boolean);
}

function hashFromSeed(seedText) {
  let hash = 2166136261;
  for (let i = 0; i < seedText.length; i += 1) {
    hash ^= seedText.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seedText) {
  let hash = hashFromSeed(seedText);
  return () => {
    hash += 0x6d2b79f5;
    let t = hash;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Keeps gallery ordering stable between page loads without relying on source data order.
function seededShuffle(array, seedText) {
  const shuffled = [...array];
  const random = seededRandom(seedText);
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getFlickrMetadata(imageId) {
  if (!imageId || typeof FLICKR_METADATA === "undefined") return null;
  const baseMetadata = FLICKR_METADATA[imageId] || null;
  const cameraMetadata = typeof FLICKR_CAMERA_METADATA !== "undefined"
    ? FLICKR_CAMERA_METADATA[imageId] || null
    : null;
  return baseMetadata || cameraMetadata
    ? { ...(baseMetadata || {}), ...(cameraMetadata || {}) }
    : null;
}

function flickrPageUrlFromMetadata(metadata, src) {
  if (metadata?.flickrId) return `https://www.flickr.com/photos/204244048@N05/${metadata.flickrId}/`;
  return src || null;
}

function formatFlickrDate(value) {
  if (!value) return "";
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
