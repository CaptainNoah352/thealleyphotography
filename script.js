const menuToggle = document.getElementById("menuToggle");
const mobileMenu = document.getElementById("mobileMenu");
const mobileMenuClose = document.getElementById("mobileMenuClose");
const yearNode = document.getElementById("year");
const gallery = document.getElementById("gallery");

const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxCaption = document.getElementById("lightboxCaption");
const lightboxCounter = document.getElementById("lightboxCounter");
const lightboxClose = document.getElementById("lightboxClose");
const lightboxPrevZone = document.getElementById("lightboxPrevZone");
const lightboxNextZone = document.getElementById("lightboxNextZone");
const lightboxFigure = document.getElementById("lightboxFigure");

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

const pageType = document.body.dataset.page || "home";
let seededFallbackImages = [...galleryImages];
let orderedGalleryImages = [...galleryImages];


let availableLightboxItems = [];
let currentLightboxPosition = 0;
let lightboxUiVisible = true;
let hideUiTimeoutId = null;
let touchStartX = 0;
let touchStartY = 0;

const CONTROL_HIDE_DELAY_MS = 1500;
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
  const uniqueImages = images.filter(
    (image, index, collection) => collection.findIndex((entry) => entry.src === image.src) === index
  );

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

async function loadGalleryFromSupabase() {
  if (!window.photoDataApi?.hasValidSupabaseConfig || !window.photoDataApi.hasValidSupabaseConfig()) {
    orderedGalleryImages = [...seededFallbackImages];
    return;
  }

  const showOnHomeOnly = pageType === "home";
  const photos = await window.photoDataApi.fetchPublishedPhotos({ showOnHomeOnly });

  if (photos.length) {
    orderedGalleryImages = photos;
    return;
  }

  orderedGalleryImages = [...seededFallbackImages];
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
  try {
    await loadGalleryFromSupabase();
  } catch (error) {
    orderedGalleryImages = [...seededFallbackImages];
    console.warn("Unable to load photos from Supabase. Falling back to local galleryImages.", error);
  }

  renderForActiveFilter();
  initializeScrollReveal();
})();
