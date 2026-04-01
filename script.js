const menuToggle = document.getElementById("menuToggle");
const siteNav = document.getElementById("siteNav");
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

if (menuToggle && siteNav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  siteNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      siteNav.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

/*
  <!-- REPLACE OR ADD YOUR DIRECT IMAGE URLS BELOW -->
  ----------------------------------------------------
  IMPORTANT FOR FLICKR:
  - Use direct image files from staticflickr (usually ending in .jpg/.png/.webp).
  - Do NOT paste regular Flickr page links (they will not render as images).
  - Example direct link format: https://live.staticflickr.com/.../photo_id_secret_b.jpg
*/
const galleryImages = [
  {
    src: "https://live.staticflickr.com/65535/55174718119_fcc96e9679_b.jpg",
    alt: "Couple walking through a warm-toned alley",
  },
  {
    src: "https://live.staticflickr.com/65535/55174862805_62b4b2bb62_b.jpg",
    alt: "Portrait of a woman in natural light",
  },
  {
    src: "https://live.staticflickr.com/65535/55174717824_9f229d66e3_b.jpg",
    alt: "Camera and printed photos on a table",
  },
  {
    src: "https://live.staticflickr.com/65535/55141237211_d22ab4de9a_b.jpg",
    alt: "Mountain valley at sunrise",
  },
  {
    src: "https://live.staticflickr.com/65535/55139720299_06e2216dc4_b.jpg",
    alt: "Bride portrait near a bright window",
  },
  {
    src: "https://live.staticflickr.com/65535/55174862700_704b4310df_b.jpg",
    alt: "Hands holding a bouquet",
  },
  {
    src: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1000&q=80",
    alt: "City corner with warm evening light",
  },
  {
    src: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1000&q=80",
    alt: "Portrait with soft earthy styling",
  },
];

let availableLightboxItems = [];
let currentLightboxPosition = 0;
let lightboxUiVisible = true;
let hideUiTimeoutId = null;
let touchStartX = 0;
let touchStartY = 0;

const CONTROL_HIDE_DELAY_MS = 1500;

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
    img.src = image.src;
    img.alt = image.alt;
    img.loading = "lazy";
    img.decoding = "async";
    img.dataset.index = String(index);

    img.addEventListener("load", () => {
      refreshLightboxItems();
    });

    img.addEventListener("error", () => {
      img.dataset.broken = "true";
      article.classList.add("is-broken");
      refreshLightboxItems();
    });

    article.addEventListener("click", () => {
      if (img.dataset.broken === "true") return;
      openLightboxByImageNode(img);
    });

    article.appendChild(img);
    gallery.appendChild(article);
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

renderGallery(galleryImages);
