// Shared lightbox and Flickr metadata display.

function applyLightboxData(img, image) {
  const metadata = getFlickrMetadata(image.id);
  img.dataset.photoId = image.id || "";
  img.dataset.flickrTitle = metadata?.title || "";
  img.dataset.flickrId = metadata?.flickrId || "";
  img.dataset.flickrDateTaken = metadata?.dateTaken || "";
  img.dataset.flickrWidth = metadata?.width || "";
  img.dataset.flickrHeight = metadata?.height || "";
  img.dataset.flickrPageUrl = flickrPageUrlFromMetadata(metadata, image.src) || "";
  img.dataset.camera = metadata?.camera || "";
  img.dataset.lens = metadata?.lens || "";
  img.dataset.shutter = metadata?.shutter || "";
  img.dataset.aperture = metadata?.aperture || "";
  img.dataset.iso = metadata?.iso || "";
  img.dataset.focalLength = metadata?.focalLength || "";
  img.dataset.exposureMode = metadata?.exposureMode || "";
  img.dataset.meteringMode = metadata?.meteringMode || "";
  img.dataset.whiteBalance = metadata?.whiteBalance || "";
  img.dataset.flash = metadata?.flash || "";
}

// Injected once so every page can share the same lightbox markup.
function ensureLightboxMetadataUi() {
  if (!dom.lightbox || dom.lightboxMetadataToggle) return;

  const toggle = document.createElement("button");
  toggle.className = "lightbox-control lightbox-metadata-toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-label", "Show photo metadata");
  toggle.setAttribute("aria-expanded", "false");
  toggle.textContent = "i";

  const panel = document.createElement("section");
  panel.className = "lightbox-metadata-panel";
  panel.setAttribute("aria-label", "Photo metadata");
  panel.setAttribute("aria-hidden", "true");

  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    setLightboxMetadataVisibility(!state.lightboxMetadataVisible);
    revealLightboxUi();
  });

  panel.addEventListener("click", (event) => event.stopPropagation());

  dom.lightbox.append(toggle, panel);
  dom.lightboxMetadataToggle = toggle;
  dom.lightboxMetadataPanel = panel;
}

function setLightboxMetadataVisibility(visible) {
  if (!dom.lightbox || !dom.lightboxMetadataToggle || !dom.lightboxMetadataPanel) return;
  state.lightboxMetadataVisible = visible;
  dom.lightbox.classList.toggle("metadata-visible", visible);
  dom.lightboxMetadataToggle.setAttribute("aria-expanded", String(visible));
  dom.lightboxMetadataToggle.setAttribute("aria-label", visible ? "Hide photo metadata" : "Show photo metadata");
  dom.lightboxMetadataPanel.setAttribute("aria-hidden", String(!visible));
}

function updateLightboxMetadata(activeImage) {
  ensureLightboxMetadataUi();
  if (!dom.lightboxMetadataPanel || !dom.lightboxMetadataToggle) return;

  const dimensions = activeImage.dataset.flickrWidth && activeImage.dataset.flickrHeight
    ? `${activeImage.dataset.flickrWidth} x ${activeImage.dataset.flickrHeight}`
    : "";
  const items = [
    ["Photo", activeImage.dataset.photoId],
    ["Camera", activeImage.dataset.camera],
    ["Lens", activeImage.dataset.lens],
    ["Shutter", activeImage.dataset.shutter],
    ["Aperture", activeImage.dataset.aperture],
    ["ISO", activeImage.dataset.iso],
    ["Focal length", activeImage.dataset.focalLength],
    ["Mode", activeImage.dataset.exposureMode],
    ["Metering", activeImage.dataset.meteringMode],
    ["White balance", activeImage.dataset.whiteBalance],
    ["Flash", activeImage.dataset.flash],
    ["Flickr title", activeImage.dataset.flickrTitle],
    ["Date taken", formatFlickrDate(activeImage.dataset.flickrDateTaken)],
    ["Dimensions", dimensions],
    ["Flickr ID", activeImage.dataset.flickrId],
  ].filter(([, value]) => value);

  dom.lightboxMetadataToggle.hidden = !items.length;
  dom.lightboxMetadataPanel.innerHTML = items.map(([label, value]) => (
    `<div class="lightbox-metadata-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`
  )).join("");
}

function refreshLightboxItems() {
  if (dom.homeCarousel) {
    state.availableLightboxItems = Array.from(
      dom.homeCarousel.querySelectorAll(".carousel-slide img")
    ).filter((img) => img.dataset.broken !== "true");
    return;
  }
  const galleryEl = dom.locationGallery || dom.projectGallery || dom.gallery;
  if (!galleryEl) return;
  state.availableLightboxItems = Array.from(
    galleryEl.querySelectorAll(".gallery-item img")
  ).filter((img) => img.dataset.broken !== "true");
}

function updateLightboxView(direction = "next") {
  const activeImage = state.availableLightboxItems[state.currentLightboxPosition];
  if (!activeImage || !dom.lightboxImage || !dom.lightboxCounter || !dom.lightboxCaption) return;

  if (dom.lightboxFigure) {
    const animationClass = direction === "prev" ? "slide-prev" : "slide-next";
    dom.lightboxFigure.classList.remove("slide-next", "slide-prev");
    void dom.lightboxFigure.offsetWidth;
    dom.lightboxFigure.classList.add(animationClass);
  }

  dom.lightboxImage.src = activeImage.src;
  dom.lightboxImage.alt = activeImage.alt || "Gallery image";
  dom.lightboxCaption.textContent = activeImage.alt || "";
  dom.lightboxCounter.textContent = `${state.currentLightboxPosition + 1} / ${state.availableLightboxItems.length}`;
  updateLightboxMetadata(activeImage);

  if (dom.lightboxFlickrLink) {
    const flickrUrl = activeImage.dataset.flickrPageUrl || activeImage.src;
    dom.lightboxFlickrLink.href = flickrUrl || "#";
  }
}

function clearUiHideTimer() {
  if (!state.hideUiTimeoutId) return;
  clearTimeout(state.hideUiTimeoutId);
  state.hideUiTimeoutId = null;
}

function setLightboxUiVisibility(visible) {
  if (!dom.lightbox) return;
  state.lightboxUiVisible = visible;
  dom.lightbox.classList.toggle("ui-visible", visible);
  dom.lightbox.classList.toggle("ui-hidden", !visible);
}

function scheduleUiHide() {
  clearUiHideTimer();
  state.hideUiTimeoutId = window.setTimeout(() => {
    if (!dom.lightbox || !dom.lightbox.classList.contains("open")) return;
    setLightboxUiVisibility(false);
  }, CONTROL_HIDE_DELAY_MS);
}

function revealLightboxUi() {
  setLightboxUiVisibility(true);
  scheduleUiHide();
}

function openLightboxByImageNode(imageNode) {
  if (!dom.lightbox || !imageNode) return;
  refreshLightboxItems();
  const clickedPosition = state.availableLightboxItems.indexOf(imageNode);
  if (clickedPosition < 0) return;

  state.currentLightboxPosition = clickedPosition;
  updateLightboxView("next");
  dom.lightbox.classList.add("open");
  dom.lightbox.setAttribute("aria-hidden", "false");
  revealLightboxUi();
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  if (!dom.lightbox) return;
  dom.lightbox.classList.remove("open");
  dom.lightbox.setAttribute("aria-hidden", "true");
  clearUiHideTimer();
  setLightboxUiVisibility(true);
  setLightboxMetadataVisibility(false);
  state.touchStartX = 0;
  state.touchStartY = 0;
  document.body.style.overflow = "";
}

function showNextImage() {
  if (!state.availableLightboxItems.length) return;
  state.currentLightboxPosition = (state.currentLightboxPosition + 1) % state.availableLightboxItems.length;
  updateLightboxView("next");
  revealLightboxUi();
}

function showPreviousImage() {
  if (!state.availableLightboxItems.length) return;
  state.currentLightboxPosition = (state.currentLightboxPosition - 1 + state.availableLightboxItems.length) % state.availableLightboxItems.length;
  updateLightboxView("prev");
  revealLightboxUi();
}
