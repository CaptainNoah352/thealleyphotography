// Main site entry point. Feature logic lives in the js/ files loaded before this file.

function renderCurrentPageGallery() {
  if (pageType === "home") {
    renderFeaturedCarousel(state.orderedGalleryImages);
    renderHomeLocationPreview();
    return;
  }

  if (pageType === "locations") {
    renderLocationsPage();
    return;
  }

  if (pageType === "projects") {
    renderProjectGallery("herons");
    updateProjectProgress("herons", 12);
    initSpeciesCardClicks();
    return;
  }

  renderGallery(state.orderedGalleryImages);
}

function alignInitialHashTarget() {
  if (state.hasAlignedInitialHash || pageType !== "home") return;
  if (!window.location.hash) return;
  const target = document.querySelector(window.location.hash);
  if (!target) return;
  target.scrollIntoView({ block: "start", behavior: "auto" });
  state.hasAlignedInitialHash = true;
}

function initializeGallery() {
  if (dom.yearNode) dom.yearNode.textContent = new Date().getFullYear();

  bindGlobalEvents();
  updateActiveNavLink();
  window.addEventListener("scroll", updateActiveNavLink, { passive: true });
  if (pageType === "locations") {
    window.addEventListener("hashchange", renderLocationsPage);
  }

  state.orderedGalleryImages = normalizeGalleryImages(seededShuffle(GALLERY_IMAGES, "v1"));

  renderCurrentPageGallery();
  initializeScrollReveal();
  requestAnimationFrame(alignInitialHashTarget);
}

initializeGallery();
window.addEventListener("load", alignInitialHashTarget);
