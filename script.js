const menuToggle = document.getElementById("menuToggle");
const mobileMenu = document.getElementById("mobileMenu");
const mobileMenuClose = document.getElementById("mobileMenuClose");
const yearNode = document.getElementById("year");
const gallery = document.getElementById("gallery");

const pageType = document.body.dataset.page || "home";

const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxCaption = document.getElementById("lightboxCaption");
const lightboxCounter = document.getElementById("lightboxCounter");
const lightboxClose = document.getElementById("lightboxClose");
const lightboxPrevZone = document.getElementById("lightboxPrevZone");
const lightboxNextZone = document.getElementById("lightboxNextZone");
const lightboxFigure = document.getElementById("lightboxFigure");

const siteContentNodes = {
  aboutIntro: document.getElementById("aboutIntro"),
  aboutParagraph1: document.getElementById("aboutParagraph1"),
  aboutParagraph2: document.getElementById("aboutParagraph2"),
  aboutPullquote: document.getElementById("aboutPullquote"),
  aboutParagraph3: document.getElementById("aboutParagraph3"),
  aboutParagraph4: document.getElementById("aboutParagraph4"),
  aboutParagraph5: document.getElementById("aboutParagraph5"),
  contactTitle: document.getElementById("contact-title"),
  contactSubtitle: document.getElementById("contactSubtitle"),
  contactEmailLink: document.getElementById("contactEmailLink"),
  contactInstagramLink: document.getElementById("contactInstagramLink"),
  contactFlickrLink: document.getElementById("contactFlickrLink"),
  headerInstagramLink: document.getElementById("headerInstagramLink"),
  mobileInstagramLink: document.getElementById("mobileInstagramLink"),
  headerFlickrLink: document.getElementById("headerFlickrLink"),
  mobileFlickrLink: document.getElementById("mobileFlickrLink"),
  contactLocationText: document.getElementById("contactLocationText"),
  contactAvailabilityText: document.getElementById("contactAvailabilityText"),
  contactResponseTimeText: document.getElementById("contactResponseTimeText"),
};

if (yearNode) {
  yearNode.textContent = new Date().getFullYear();
}

/* ── Mobile menu ── */

function openMobileMenu() {
  if (!menuToggle || !mobileMenu) return;
  menuToggle.classList.add("burger--active");
  menuToggle.setAttribute("aria-expanded", "true");
  mobileMenu.classList.add("open");
  mobileMenu.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  const firstLink = mobileMenu.querySelector("a");
  if (firstLink) firstLink.focus();
}

function closeMobileMenu() {
  if (!menuToggle || !mobileMenu) return;
  menuToggle.classList.remove("burger--active");
  menuToggle.setAttribute("aria-expanded", "false");
  mobileMenu.classList.remove("open");
  mobileMenu.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  menuToggle.focus();
}

function isMobileMenuOpen() {
  return mobileMenu && mobileMenu.classList.contains("open");
}

if (menuToggle && mobileMenu) {
  menuToggle.addEventListener("click", () => {
    if (isMobileMenuOpen()) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  });

  mobileMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      closeMobileMenu();
    });
  });

  if (mobileMenuClose) {
    mobileMenuClose.addEventListener("click", () => {
      closeMobileMenu();
    });
  }

  // Focus trap inside mobile menu
  mobileMenu.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;

    const focusable = mobileMenu.querySelectorAll('a[href], button, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isMobileMenuOpen()) {
    closeMobileMenu();
  }
});

/* ── Active nav link highlighting ── */

function updateActiveNavLink() {
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll(".site-nav > a");
  if (!navLinks.length) return;

  if (pageType === "portfolio") {
    navLinks.forEach((link) => {
      const href = link.getAttribute("href") || "";
      const isPortfolioLink = href === "portfolio.html" || href.endsWith("/portfolio.html");
      link.classList.toggle("active", isPortfolioLink);
    });
    return;
  }

  let currentId = "";

  sections.forEach((section) => {
    const top = section.offsetTop - 120;
    if (window.scrollY >= top) {
      currentId = section.id;
    }
  });

  navLinks.forEach((link) => {
    const href = link.getAttribute("href");
    link.classList.toggle("active", href === "#" + currentId || (href && href.endsWith("#" + currentId)));
  });
}

window.addEventListener("scroll", updateActiveNavLink, { passive: true });
updateActiveNavLink();

/*
  <!-- REPLACE OR ADD YOUR DIRECT IMAGE URLS BELOW -->
  ----------------------------------------------------
  IMPORTANT FOR FLICKR:
  - Use direct image files from staticflickr (usually ending in .jpg/.png/.webp).
  - Do NOT paste regular Flickr page links (they will not render as images).
  - Example direct link format: https://live.staticflickr.com/.../photo_id_secret_b.jpg
*/
const galleryImages = [];

let seededFallbackImages = [...galleryImages];
let orderedGalleryImages = [...galleryImages];
const initialHash = window.location.hash;
let hasAlignedInitialHash = false;


let availableLightboxItems = [];
let currentLightboxPosition = 0;
let lightboxUiVisible = true;
let hideUiTimeoutId = null;
let touchStartX = 0;
let touchStartY = 0;

const CONTROL_HIDE_DELAY_MS = 1500;
const DEFAULT_THEME_SETTINGS = {
  primary: "#5f6f52",
  accent: "#8a6442",
};

const EMPTY_SITE_COPY = {
  about_intro: "This section is for your introduction and brand story. It’s currently empty.",
  about_paragraph_1: "This section is for the opening part of your story. It’s currently empty.",
  about_paragraph_2: "This section is meant for additional background about your work. It’s currently empty.",
  about_pullquote: "This section is for a short featured quote. It’s currently empty.",
  about_paragraph_3: "This section is for the middle of your story narrative. It’s currently empty.",
  about_paragraph_4: "This section is for details about your process and approach. It’s currently empty.",
  about_paragraph_5: "This section is for a closing note in your story. It’s currently empty.",
  contact_title: "This section is for your contact heading. It’s currently empty.",
  contact_subtitle: "This section is meant for contact details or booking information. It’s currently empty.",
  contact_email: "This section is for your contact email address. It’s currently empty.",
  instagram_label: "This section is for your Instagram handle or label. It’s currently empty.",
  flickr_url: "This section is for your Flickr profile link. It’s currently empty.",
  location_text: "This section is for your location details. It’s currently empty.",
  availability_text: "This section is for your current availability status. It’s currently empty.",
  response_time_text: "This section is for your typical response-time note. It’s currently empty.",
};

const EMPTY_GALLERY_MESSAGES = {
  home: "No photos published yet. Add published photos with 'Show on Home' enabled to populate this section.",
  portfolio: "No photos published yet. Publish photos in admin to populate the portfolio.",
};

function getGalleryEmptyStateMessage() {
  return pageType === "home" ? EMPTY_GALLERY_MESSAGES.home : EMPTY_GALLERY_MESSAGES.portfolio;
}

function renderGalleryEmptyState(message) {
  if (!gallery) return;
  const emptyState = document.createElement("div");
  emptyState.className = "gallery-empty-state";
  emptyState.setAttribute("role", "status");
  emptyState.setAttribute("aria-live", "polite");

  const title = document.createElement("h3");
  title.textContent = "No photos published yet";

  const body = document.createElement("p");
  body.textContent = message;

  emptyState.appendChild(title);
  emptyState.appendChild(body);
  gallery.appendChild(emptyState);
}

function normalizeGalleryImages(images) {
  if (!Array.isArray(images)) return [];

  return images
    .map((image) => {
      const src = image?.image_url || image?.src || "";
      if (typeof src !== "string" || !src.trim()) return null;

      const normalizedCategory = Array.isArray(image?.tags) && image.tags.length
        ? image.tags
        : [image?.category || "wildlife"];

      return {
        ...image,
        src: src.trim(),
        alt: (image?.alt || image?.title || image?.description || "Portfolio photo").toString(),
        tags: normalizedCategory
          .map((tag) => (tag || "").toString().trim().toLowerCase())
          .filter(Boolean),
      };
    })
    .filter(Boolean);
}

function normalizePublishedPhotosForPage(photos) {
  const filtered = Array.isArray(photos)
    ? photos.filter((photo) => {
        if (!photo || !photo.is_published) return false;
        if (pageType === "home") return Boolean(photo.show_on_home);
        return true;
      })
    : [];

  return normalizeGalleryImages(filtered);
}

function normalizeHexColor(value, fallback) {
  if (typeof value !== "string") return fallback;
  const color = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback;
}

function applySiteTheme(settings = {}) {
  document.documentElement.style.setProperty(
    "--color-primary",
    normalizeHexColor(settings.theme_primary_color, DEFAULT_THEME_SETTINGS.primary)
  );
  document.documentElement.style.setProperty(
    "--color-accent",
    normalizeHexColor(settings.theme_accent_color, DEFAULT_THEME_SETTINGS.accent)
  );
}

function setTextContentWithEmptyState(node, value, fallbackText) {
  if (!node) return;
  const hasRealContent = typeof value === "string" && value.trim().length > 0;
  node.textContent = hasRealContent ? value.trim() : fallbackText;
  node.classList.toggle("empty-state-copy", !hasRealContent);
}

function setLinkWithEmptyState(node, url, label, fallbackText) {
  if (!node) return;
  const hasLabel = typeof label === "string" && label.trim().length > 0;
  const hasUrl = typeof url === "string" && url.trim().length > 0;
  const showRealContent = hasLabel || hasUrl;
  node.textContent = showRealContent ? (hasLabel ? label.trim() : url.trim()) : fallbackText;
  node.classList.toggle("empty-state-copy", !showRealContent);
}
const revealObserver = "IntersectionObserver" in window
  ? new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        });
      },
      {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.15,
      }
    )
  : null;

function loadGalleryImage(imageNode) {
  if (!imageNode || !imageNode.dataset.src) return;
  imageNode.src = imageNode.dataset.src;
  imageNode.removeAttribute("data-src");
}

function revealGalleryRow(rowAnchor) {
  if (!rowAnchor || !gallery) return;
  const rowTop = rowAnchor.offsetTop;
  const rowTolerance = 14;
  const rowItems = Array.from(gallery.querySelectorAll(".gallery-item")).filter((item) => {
    return Math.abs(item.offsetTop - rowTop) <= rowTolerance;
  });

  rowItems.forEach((item) => {
    item.classList.add("is-revealed");
    const imageNode = item.querySelector("img");
    loadGalleryImage(imageNode);
    if (galleryRowObserver) {
      galleryRowObserver.unobserve(item);
    }
  });
}

const galleryRowObserver = null;

function initializeScrollReveal() {
  const revealTargets = document.querySelectorAll(".scroll-reveal");
  revealTargets.forEach((node, index) => {
    node.style.transitionDelay = `${Math.min(index * 40, 240)}ms`;
    if (revealObserver) {
      revealObserver.observe(node);
    } else {
      node.classList.add("is-revealed");
    }
  });
}

function alignInitialHashTarget() {
  if (hasAlignedInitialHash) return;
  if (!initialHash) return;
  if (pageType !== "home") return;

  const target = document.querySelector(initialHash);
  if (!target) return;

  target.scrollIntoView({ block: "start", behavior: "auto" });
  hasAlignedInitialHash = true;
}

function refreshLightboxItems() {
  if (!gallery) return;

  availableLightboxItems = Array.from(gallery.querySelectorAll(".gallery-item img")).filter(
    (img) => img.dataset.broken !== "true"
  );
}

function animateLightboxImage(direction) {
  if (!lightboxFigure) return;
  const animationClass = direction === "prev" ? "slide-prev" : "slide-next";
  lightboxFigure.classList.remove("slide-next", "slide-prev");
  void lightboxFigure.offsetWidth;
  lightboxFigure.classList.add(animationClass);
}

function updateLightboxView(direction = "next") {
  const activeImage = availableLightboxItems[currentLightboxPosition];
  if (!activeImage || !lightboxImage || !lightboxCounter || !lightboxCaption) return;

  animateLightboxImage(direction);
  lightboxImage.src = activeImage.src;
  lightboxImage.alt = activeImage.alt || "Gallery image";
  lightboxCaption.textContent = activeImage.alt || "";
  lightboxCounter.textContent = `${currentLightboxPosition + 1} / ${availableLightboxItems.length}`;
}

function clearUiHideTimer() {
  if (!hideUiTimeoutId) return;
  clearTimeout(hideUiTimeoutId);
  hideUiTimeoutId = null;
}

function setLightboxUiVisibility(visible) {
  if (!lightbox) return;
  lightboxUiVisible = visible;
  lightbox.classList.toggle("ui-visible", visible);
  lightbox.classList.toggle("ui-hidden", !visible);
}

function scheduleUiHide() {
  clearUiHideTimer();
  hideUiTimeoutId = window.setTimeout(() => {
    if (!lightbox || !lightbox.classList.contains("open")) return;
    setLightboxUiVisibility(false);
  }, CONTROL_HIDE_DELAY_MS);
}

function revealLightboxUi() {
  setLightboxUiVisibility(true);
  scheduleUiHide();
}

function openLightboxByImageNode(imageNode) {
  if (!lightbox || !imageNode) return;

  refreshLightboxItems();
  const clickedPosition = availableLightboxItems.indexOf(imageNode);
  if (clickedPosition < 0) return;

  currentLightboxPosition = clickedPosition;
  updateLightboxView("next");

  lightbox.classList.add("open");
  revealLightboxUi();
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  if (!lightbox) return;

  lightbox.classList.remove("open");
  clearUiHideTimer();
  setLightboxUiVisibility(true);
  touchStartX = 0;
  touchStartY = 0;
  lightbox.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function showNextImage() {
  if (!availableLightboxItems.length) return;

  currentLightboxPosition = (currentLightboxPosition + 1) % availableLightboxItems.length;
  updateLightboxView("next");
  revealLightboxUi();
}

function showPreviousImage() {
  if (!availableLightboxItems.length) return;

  currentLightboxPosition = (currentLightboxPosition - 1 + availableLightboxItems.length) % availableLightboxItems.length;
  updateLightboxView("prev");
  revealLightboxUi();
}

function renderGallery(images) {
  if (!gallery) return;

  gallery.innerHTML = "";
  const normalizedImages = normalizeGalleryImages(images);
  const uniqueImages = normalizedImages.filter(
    (image, index, collection) => collection.findIndex((entry) => entry.src === image.src) === index
  );

  if (!uniqueImages.length) {
    renderGalleryEmptyState(getGalleryEmptyStateMessage());
    return;
  }

  uniqueImages.forEach((image, index) => {
    const article = document.createElement("article");
    article.className = "gallery-item";

    const img = document.createElement("img");
    img.dataset.src = image.src;
    img.alt = image.alt;
    img.loading = "lazy";
    img.decoding = "async";
    img.dataset.index = String(index);

    img.addEventListener("load", () => {
      img.classList.add("is-visible");
      refreshLightboxItems();
    });

    img.addEventListener("error", () => {
      img.dataset.broken = "true";
      article.classList.add("is-broken");
      refreshLightboxItems();
    });

    article.addEventListener("click", () => {
      if (img.dataset.broken === "true") return;
      if (!img.currentSrc) return;
      openLightboxByImageNode(img);
    });

    article.appendChild(img);
    gallery.appendChild(article);

    article.classList.add("is-revealed");
    loadGalleryImage(img);
  });
}

if (lightboxClose) {
  lightboxClose.addEventListener("click", (event) => {
    event.stopPropagation();
    closeLightbox();
  });
}

if (lightboxNextZone) {
  lightboxNextZone.addEventListener("click", (event) => {
    event.stopPropagation();
    showNextImage();
  });
}

if (lightboxPrevZone) {
  lightboxPrevZone.addEventListener("click", (event) => {
    event.stopPropagation();
    showPreviousImage();
  });
}

if (lightbox) {
  lightbox.addEventListener("click", (event) => {
    if (!lightbox.classList.contains("open")) return;
    const clickedControl = event.target.closest(".lightbox-control, .lightbox-tap-zone");
    if (clickedControl) return;
    if (!lightboxUiVisible) {
      revealLightboxUi();
      return;
    }
    setLightboxUiVisibility(false);
    clearUiHideTimer();
  });

  lightbox.addEventListener("pointermove", () => {
    if (!lightbox.classList.contains("open")) return;
    revealLightboxUi();
  });

  lightbox.addEventListener(
    "touchstart",
    (event) => {
      if (!lightbox.classList.contains("open") || !event.touches.length) return;
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
      revealLightboxUi();
    },
    { passive: true }
  );

  lightbox.addEventListener(
    "touchend",
    (event) => {
      if (!lightbox.classList.contains("open") || !event.changedTouches.length) return;
      const deltaX = event.changedTouches[0].clientX - touchStartX;
      const deltaY = event.changedTouches[0].clientY - touchStartY;
      const isHorizontalSwipe = Math.abs(deltaX) > 48 && Math.abs(deltaX) > Math.abs(deltaY);
      if (!isHorizontalSwipe) {
        revealLightboxUi();
        return;
      }
      if (deltaX < 0) {
        showNextImage();
      } else {
        showPreviousImage();
      }
    },
    { passive: true }
  );
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isMobileMenuOpen()) {
    closeMobileMenu();
    return;
  }

  if (!lightbox || !lightbox.classList.contains("open")) return;

  if (event.key === "Escape") {
    closeLightbox();
  } else if (event.key === "ArrowRight") {
    showNextImage();
  } else if (event.key === "ArrowLeft") {
    showPreviousImage();
  }
  revealLightboxUi();
});

const GALLERY_VERSION = "v1";
seededFallbackImages = seededShuffle(galleryImages, GALLERY_VERSION);
orderedGalleryImages = [...seededFallbackImages];

function createSeededRandom(seedText) {
  let hash = 2166136261;
  for (let i = 0; i < seedText.length; i += 1) {
    hash ^= seedText.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return function seededRandom() {
    hash += 0x6d2b79f5;
    let t = hash;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(array, seedText) {
  const shuffled = [...array];
  const random = createSeededRandom(seedText);

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}



function renderForActiveFilter() {
  const portfolioFilters = document.getElementById("portfolioFilters");
  if (!portfolioFilters) {
    renderGallery(orderedGalleryImages);
    return;
  }

  const activeButton = portfolioFilters.querySelector(".portfolio-filter-btn.active");
  const tag = activeButton?.dataset.filter || "all";
  const filteredImages = tag === "all"
    ? orderedGalleryImages
    : orderedGalleryImages.filter((image) => image.tags.includes(tag));

  renderGallery(filteredImages);
}

function applySiteSettingsToHome(settings) {
  if (!settings) return;
  setTextContentWithEmptyState(siteContentNodes.aboutIntro, settings.about_intro, EMPTY_SITE_COPY.about_intro);
  setTextContentWithEmptyState(siteContentNodes.aboutParagraph1, settings.about_paragraph_1, EMPTY_SITE_COPY.about_paragraph_1);
  setTextContentWithEmptyState(siteContentNodes.aboutParagraph2, settings.about_paragraph_2, EMPTY_SITE_COPY.about_paragraph_2);
  setTextContentWithEmptyState(siteContentNodes.aboutPullquote, settings.about_pullquote, EMPTY_SITE_COPY.about_pullquote);
  setTextContentWithEmptyState(siteContentNodes.aboutParagraph3, settings.about_paragraph_3, EMPTY_SITE_COPY.about_paragraph_3);
  setTextContentWithEmptyState(siteContentNodes.aboutParagraph4, settings.about_paragraph_4, EMPTY_SITE_COPY.about_paragraph_4);
  setTextContentWithEmptyState(siteContentNodes.aboutParagraph5, settings.about_paragraph_5, EMPTY_SITE_COPY.about_paragraph_5);
  setTextContentWithEmptyState(siteContentNodes.contactTitle, settings.contact_title, EMPTY_SITE_COPY.contact_title);
  setTextContentWithEmptyState(siteContentNodes.contactSubtitle, settings.contact_subtitle, EMPTY_SITE_COPY.contact_subtitle);
  setTextContentWithEmptyState(siteContentNodes.contactLocationText, settings.location_text, EMPTY_SITE_COPY.location_text);
  setTextContentWithEmptyState(siteContentNodes.contactAvailabilityText, settings.availability_text, EMPTY_SITE_COPY.availability_text);
  setTextContentWithEmptyState(siteContentNodes.contactResponseTimeText, settings.response_time_text, EMPTY_SITE_COPY.response_time_text);

  const email = (settings.contact_email || "").trim();
  setTextContentWithEmptyState(siteContentNodes.contactEmailLink, email, EMPTY_SITE_COPY.contact_email);
  siteContentNodes.contactEmailLink?.classList.toggle("empty-state-copy", !email);
  if (siteContentNodes.contactEmailLink) {
    siteContentNodes.contactEmailLink.href = email ? `mailto:${email}` : "#contact";
  }

  const instagramUrl = (settings.instagram_url || "").trim();
  const instagramLabel = (settings.instagram_label || "").trim();
  setLinkWithEmptyState(siteContentNodes.contactInstagramLink, instagramUrl, instagramLabel, EMPTY_SITE_COPY.instagram_label);
  if (siteContentNodes.contactInstagramLink) {
    siteContentNodes.contactInstagramLink.href = instagramUrl || "#contact";
    siteContentNodes.contactInstagramLink.target = instagramUrl ? "_blank" : "_self";
  }
  if (siteContentNodes.headerInstagramLink) {
    siteContentNodes.headerInstagramLink.href = instagramUrl || "#contact";
    siteContentNodes.headerInstagramLink.target = instagramUrl ? "_blank" : "_self";
  }
  if (siteContentNodes.mobileInstagramLink) {
    siteContentNodes.mobileInstagramLink.href = instagramUrl || "#contact";
    siteContentNodes.mobileInstagramLink.target = instagramUrl ? "_blank" : "_self";
  }

  const flickrUrl = (settings.flickr_url || "").trim();
  setTextContentWithEmptyState(siteContentNodes.contactFlickrLink, flickrUrl ? "View on Flickr" : "", EMPTY_SITE_COPY.flickr_url);
  if (siteContentNodes.contactFlickrLink) {
    siteContentNodes.contactFlickrLink.href = flickrUrl || "#contact";
    siteContentNodes.contactFlickrLink.target = flickrUrl ? "_blank" : "_self";
  }
  if (siteContentNodes.headerFlickrLink) {
    siteContentNodes.headerFlickrLink.href = flickrUrl || "#contact";
    siteContentNodes.headerFlickrLink.target = flickrUrl ? "_blank" : "_self";
  }
  if (siteContentNodes.mobileFlickrLink) {
    siteContentNodes.mobileFlickrLink.href = flickrUrl || "#contact";
    siteContentNodes.mobileFlickrLink.target = flickrUrl ? "_blank" : "_self";
  }
}

async function loadSiteSettingsForSite() {
  if (!window.photoDataApi?.fetchSiteSettings) return;

  try {
    const settings = await window.photoDataApi.fetchSiteSettings();
    applySiteTheme(settings);
    if (pageType === "home") {
      applySiteSettingsToHome(settings);
    }
  } catch (error) {
    console.warn("[gallery] fetchSiteSettings failed. Using static content defaults.", error);
    applySiteTheme({});
  }
}

async function loadGalleryFromSupabase() {
  if (!window.photoDataApi?.hasValidSupabaseConfig || !window.photoDataApi.hasValidSupabaseConfig()) {
    console.warn("[gallery] Supabase config is invalid or missing. Falling back to local gallery data.");
    orderedGalleryImages = normalizeGalleryImages(seededFallbackImages);
    return;
  }

  const showOnHomeOnly = pageType === "home";
  const photos = await window.photoDataApi.fetchPublishedPhotos({ showOnHomeOnly });
  const publishedPhotos = normalizePublishedPhotosForPage(photos);

  if (publishedPhotos.length) {
    orderedGalleryImages = publishedPhotos;
    return;
  }

  console.warn(
    `[gallery] fetchPublishedPhotos returned zero rows for ${pageType === "home" ? "home" : "portfolio"} view.`
  );

  const normalizedFallback = normalizeGalleryImages(seededFallbackImages);
  orderedGalleryImages = normalizedFallback;

  if (!normalizedFallback.length) {
    console.warn("[gallery] Fallback galleryImages is empty. Rendering empty-state messaging.");
  }
}

const portfolioFilters = document.getElementById("portfolioFilters");

if (portfolioFilters) {
  portfolioFilters.querySelectorAll(".portfolio-filter-btn").forEach((button) => {
    button.addEventListener("click", () => {
      portfolioFilters.querySelectorAll(".portfolio-filter-btn").forEach((node) => {
        node.classList.toggle("active", node === button);
      });
      renderForActiveFilter();
    });
  });
}

(async function initializeGallery() {
  await loadSiteSettingsForSite();

  try {
    await loadGalleryFromSupabase();
  } catch (error) {
    orderedGalleryImages = [...seededFallbackImages];
    console.warn("[gallery] fetchPublishedPhotos request failed. Falling back to local galleryImages.", error);
  }

  renderForActiveFilter();
  initializeScrollReveal();
  requestAnimationFrame(alignInitialHashTarget);
})();

window.addEventListener("load", () => {
  alignInitialHashTarget();
});
