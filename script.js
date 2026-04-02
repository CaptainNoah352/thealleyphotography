const pageType = document.body?.dataset?.page || "home";

const dom = {
  menuToggle: document.getElementById("menuToggle"),
  mobileMenu: document.getElementById("mobileMenu"),
  mobileMenuClose: document.getElementById("mobileMenuClose"),
  yearNode: document.getElementById("year"),
  gallery: document.getElementById("gallery"),
  portfolioFilters: document.getElementById("portfolioFilters"),
  lightbox: document.getElementById("lightbox"),
  lightboxImage: document.getElementById("lightboxImage"),
  lightboxCaption: document.getElementById("lightboxCaption"),
  lightboxCounter: document.getElementById("lightboxCounter"),
  lightboxClose: document.getElementById("lightboxClose"),
  lightboxPrevZone: document.getElementById("lightboxPrevZone"),
  lightboxNextZone: document.getElementById("lightboxNextZone"),
  lightboxFigure: document.getElementById("lightboxFigure"),
};

const siteContentNodes = {
  siteTitleLogo: document.getElementById("siteTitleLogo"),
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

const state = {
  galleryImages: [],
  orderedGalleryImages: [],
  availableLightboxItems: [],
  siteCollections: [],
  activeAppearanceSettings: {},
  currentLightboxPosition: 0,
  lightboxUiVisible: true,
  hideUiTimeoutId: null,
  touchStartX: 0,
  touchStartY: 0,
  hasAlignedInitialHash: false,
};

const CONTROL_HIDE_DELAY_MS = 1500;
const DEFAULT_THEME_SETTINGS = { primary: "#5f6f52", accent: "#8a6442" };
const EMPTY_GALLERY_MESSAGES = {
  home: "No photos published yet. Add published photos with 'Show on Home' enabled to populate this section.",
  portfolio: "No photos published yet. Publish photos in admin to populate the portfolio.",
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

function normalizeHexColor(value, fallback) {
  if (typeof value !== "string") return fallback;
  return /^#[0-9a-fA-F]{6}$/.test(value.trim()) ? value.trim() : fallback;
}

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

function setExternalLink(node, href, fallbackHref = "#") {
  if (!node) return;
  const resolvedHref = (href || "").trim() || fallbackHref;
  const isExternal = /^https?:\/\//i.test(resolvedHref);
  node.href = resolvedHref;
  node.target = isExternal ? "_blank" : "_self";
  node.rel = isExternal ? "noreferrer" : "";
}

function normalizeGalleryImages(images) {
  if (!Array.isArray(images)) return [];

  return images
    .map((image) => {
      const src = (image?.image_url || image?.src || "").toString().trim();
      if (!src) return null;
      const fallbackCategory = normalizeSlug(image?.category || "wildlife");
      const sourceTags = Array.isArray(image?.tags) && image.tags.length ? image.tags : [fallbackCategory];

      return {
        ...image,
        src,
        category: fallbackCategory,
        alt: (image?.alt || image?.title || image?.description || "Portfolio photo").toString(),
        tags: sourceTags.map((tag) => normalizeSlug(tag, "")).filter(Boolean),
      };
    })
    .filter(Boolean);
}

function refreshLightboxItems() {
  if (!dom.gallery) return;
  state.availableLightboxItems = Array.from(dom.gallery.querySelectorAll(".gallery-item img")).filter((img) => img.dataset.broken !== "true");
}

function getGalleryEmptyStateMessage() {
  return pageType === "home" ? EMPTY_GALLERY_MESSAGES.home : EMPTY_GALLERY_MESSAGES.portfolio;
}

function renderGalleryEmptyState(message) {
  if (!dom.gallery) return;
  const emptyState = document.createElement("div");
  emptyState.className = "gallery-empty-state";
  emptyState.setAttribute("role", "status");
  emptyState.innerHTML = `<h3>No photos published yet</h3><p>${message}</p>`;
  dom.gallery.appendChild(emptyState);
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

  const showCaption = dom.lightbox?.dataset.showCaptions !== "false";
  const showCounter = dom.lightbox?.dataset.showCounter !== "false";
  dom.lightboxCaption.textContent = showCaption ? (activeImage.alt || "") : "";
  dom.lightboxCaption.style.display = showCaption ? "block" : "none";
  dom.lightboxCounter.textContent = showCounter ? `${state.currentLightboxPosition + 1} / ${state.availableLightboxItems.length}` : "";
  dom.lightboxCounter.style.display = showCounter ? "block" : "none";
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

function renderGallery(images) {
  if (!dom.gallery) return;

  dom.gallery.innerHTML = "";
  const uniqueImages = normalizeGalleryImages(images).filter((image, index, collection) => {
    const key = image.id || image.src;
    return collection.findIndex((entry) => (entry.id || entry.src) === key) === index;
  });

  if (!uniqueImages.length) {
    renderGalleryEmptyState(getGalleryEmptyStateMessage());
    refreshLightboxItems();
    return;
  }

  uniqueImages.forEach((image) => {
    const article = document.createElement("article");
    article.className = "gallery-item is-revealed";

    const img = document.createElement("img");
    img.src = image.src;
    img.alt = image.alt;
    img.loading = "lazy";
    img.decoding = "async";

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
      openLightboxByImageNode(img);
    });

    article.appendChild(img);
    dom.gallery.appendChild(article);
  });

  refreshLightboxItems();
}

function getActiveFilter() {
  const activeButton = dom.portfolioFilters?.querySelector(".portfolio-filter-btn.active");
  return activeButton?.dataset.filter || "all";
}

function renderForActiveFilter() {
  const activeFilter = getActiveFilter();
  const filteredImages = activeFilter === "all"
    ? state.orderedGalleryImages
    : state.orderedGalleryImages.filter((image) => image.tags.includes(activeFilter));

  renderGallery(filteredImages);
}

function applyPortfolioFiltersFromCollections() {
  if (!dom.portfolioFilters) return;
  const visibleCollections = (state.siteCollections || []).filter((item) => item.show_in_nav !== false);
  if (!visibleCollections.length) return;

  dom.portfolioFilters.innerHTML = '<button class="portfolio-filter-btn active" type="button" data-filter="all">All</button>';
  visibleCollections.forEach((collection) => {
    const button = document.createElement("button");
    button.className = "portfolio-filter-btn";
    button.type = "button";
    button.dataset.filter = normalizeSlug(collection.slug);
    button.textContent = collection.name;
    dom.portfolioFilters.appendChild(button);
  });
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

function applySiteTheme(settings = {}) {
  document.documentElement.style.setProperty("--color-primary", normalizeHexColor(settings.theme_primary_color, DEFAULT_THEME_SETTINGS.primary));
  document.documentElement.style.setProperty("--color-accent", normalizeHexColor(settings.theme_accent_color, DEFAULT_THEME_SETTINGS.accent));
}

function applyAppearanceSettings(settings = {}) {
  state.activeAppearanceSettings = settings || {};
  const root = document.documentElement;

  root.style.setProperty("--gallery-columns-desktop", String(Math.min(6, Math.max(2, Number(settings.desktop_columns || 3)))));
  root.style.setProperty("--gallery-columns-mobile", String(Math.min(4, Math.max(1, Number(settings.mobile_columns || 2)))));
  root.style.setProperty("--gallery-gap-desktop", `${Math.min(60, Math.max(0, Number(settings.desktop_grid_gap || 28)))}px`);
  root.style.setProperty("--gallery-gap-mobile", `${Math.min(30, Math.max(0, Number(settings.mobile_grid_gap || 8)))}px`);
  root.style.setProperty("--lightbox-overlay-opacity", String(Math.min(1, Math.max(0.4, Number(settings.lightbox_bg_opacity || 1)))));

  const headingFont = (settings.heading_font || "Poppins").trim();
  const bodyFont = (settings.body_font || "Poppins").trim();
  root.style.setProperty("--font-heading", `"${headingFont}", Arial, sans-serif`);
  root.style.setProperty("--font-body", `"${bodyFont}", Arial, sans-serif`);

  const title = (settings.site_title || "").trim();
  if (title) {
    if (siteContentNodes.siteTitleLogo) siteContentNodes.siteTitleLogo.textContent = title;
    if (pageType === "home") document.title = (settings.seo_title || `${title} | Photographer`).trim();
    if (pageType === "portfolio") document.title = `Portfolio | ${title}`;
  }

  const description = (settings.seo_description || "").trim();
  const metaDescription = document.querySelector('meta[name="description"]');
  if (description && metaDescription) metaDescription.setAttribute("content", description);

  document.body.dataset.themeMode = (settings.dark_mode_behavior || "system").trim();
  document.body.dataset.headerLayout = (settings.header_layout || "centered").trim();

  if (dom.gallery) {
    const keepRatios = String(settings.keep_original_ratio || "true") === "true";
    dom.gallery.classList.toggle("gallery-fixed-ratio", !keepRatios);
  }

  if (dom.lightbox) {
    const showArrows = String(settings.lightbox_show_arrows || "true") === "true";
    dom.lightbox.dataset.showArrows = showArrows ? "true" : "false";
    dom.lightbox.dataset.arrowPosition = (settings.lightbox_arrow_position || "edges").trim();
    dom.lightbox.dataset.showCaptions = String(settings.lightbox_show_captions || "true");
    dom.lightbox.dataset.showCounter = String(settings.lightbox_show_counter || "true");

    if (dom.lightboxPrevZone) dom.lightboxPrevZone.hidden = !showArrows;
    if (dom.lightboxNextZone) dom.lightboxNextZone.hidden = !showArrows;
  }
}

function applySiteSettings(settings = {}) {
  if (siteContentNodes.siteTitleLogo && settings.site_title) {
    siteContentNodes.siteTitleLogo.textContent = settings.site_title;
  }

  const instagramUrl = (settings.instagram_url || "").trim();
  const instagramLabel = (settings.instagram_label || "").trim();
  const flickrUrl = (settings.flickr_url || "").trim();

  setExternalLink(siteContentNodes.headerInstagramLink, instagramUrl, "#contact");
  setExternalLink(siteContentNodes.mobileInstagramLink, instagramUrl, "#contact");
  setExternalLink(siteContentNodes.headerFlickrLink, flickrUrl, "#contact");
  setExternalLink(siteContentNodes.mobileFlickrLink, flickrUrl, "#contact");

  if (pageType !== "home") return;

  setTextContentWithEmptyState(siteContentNodes.aboutIntro, settings.site_intro_text || settings.about_intro, EMPTY_SITE_COPY.about_intro);
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
  setExternalLink(siteContentNodes.contactEmailLink, email ? `mailto:${email}` : "", "#contact");

  setLinkWithEmptyState(siteContentNodes.contactInstagramLink, instagramUrl, instagramLabel, EMPTY_SITE_COPY.instagram_label);
  setExternalLink(siteContentNodes.contactInstagramLink, instagramUrl, "#contact");

  setTextContentWithEmptyState(siteContentNodes.contactFlickrLink, flickrUrl ? "View on Flickr" : "", EMPTY_SITE_COPY.flickr_url);
  setExternalLink(siteContentNodes.contactFlickrLink, flickrUrl, "#contact");
}

function setMobileMenuOpen(isOpen) {
  if (!dom.menuToggle || !dom.mobileMenu) return;
  dom.menuToggle.classList.toggle("burger--active", isOpen);
  dom.menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  dom.mobileMenu.classList.toggle("open", isOpen);
  dom.mobileMenu.setAttribute("aria-hidden", isOpen ? "false" : "true");
  document.body.style.overflow = isOpen ? "hidden" : "";

  if (isOpen) {
    dom.mobileMenu.querySelector("a")?.focus();
  } else if (document.activeElement && dom.mobileMenu.contains(document.activeElement)) {
    dom.menuToggle.focus();
  }
}

function isMobileMenuOpen() {
  return Boolean(dom.mobileMenu?.classList.contains("open"));
}

function bindGlobalEvents() {
  dom.menuToggle?.addEventListener("click", () => setMobileMenuOpen(!isMobileMenuOpen()));
  dom.mobileMenuClose?.addEventListener("click", () => setMobileMenuOpen(false));
  dom.mobileMenu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setMobileMenuOpen(false)));

  dom.mobileMenu?.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const focusable = dom.mobileMenu.querySelectorAll('a[href], button, [tabindex]:not([tabindex="-1"])');
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

  dom.lightboxClose?.addEventListener("click", (event) => {
    event.stopPropagation();
    closeLightbox();
  });
  dom.lightboxNextZone?.addEventListener("click", (event) => {
    event.stopPropagation();
    showNextImage();
  });
  dom.lightboxPrevZone?.addEventListener("click", (event) => {
    event.stopPropagation();
    showPreviousImage();
  });

  dom.lightbox?.addEventListener("click", (event) => {
    if (!dom.lightbox.classList.contains("open")) return;
    if (event.target.closest(".lightbox-control, .lightbox-tap-zone")) return;
    if (!state.lightboxUiVisible) return revealLightboxUi();
    setLightboxUiVisibility(false);
    clearUiHideTimer();
  });

  dom.lightbox?.addEventListener("pointermove", () => {
    if (dom.lightbox.classList.contains("open")) revealLightboxUi();
  });

  dom.lightbox?.addEventListener("touchstart", (event) => {
    if (!dom.lightbox.classList.contains("open") || !event.touches.length) return;
    state.touchStartX = event.touches[0].clientX;
    state.touchStartY = event.touches[0].clientY;
    revealLightboxUi();
  }, { passive: true });

  dom.lightbox?.addEventListener("touchend", (event) => {
    if (!dom.lightbox.classList.contains("open") || !event.changedTouches.length) return;
    const deltaX = event.changedTouches[0].clientX - state.touchStartX;
    const deltaY = event.changedTouches[0].clientY - state.touchStartY;
    const isHorizontalSwipe = Math.abs(deltaX) > 48 && Math.abs(deltaX) > Math.abs(deltaY);
    if (!isHorizontalSwipe) return revealLightboxUi();
    if (deltaX < 0) showNextImage();
    else showPreviousImage();
  }, { passive: true });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isMobileMenuOpen()) {
      setMobileMenuOpen(false);
      return;
    }

    if (!dom.lightbox?.classList.contains("open")) return;
    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowRight") showNextImage();
    if (event.key === "ArrowLeft") showPreviousImage();
    revealLightboxUi();
  });

  dom.portfolioFilters?.addEventListener("click", (event) => {
    const clicked = event.target.closest(".portfolio-filter-btn");
    if (!clicked) return;
    dom.portfolioFilters.querySelectorAll(".portfolio-filter-btn").forEach((button) => button.classList.toggle("active", button === clicked));
    renderForActiveFilter();
  });
}

function updateActiveNavLink() {
  const navLinks = document.querySelectorAll(".site-nav > a");
  if (!navLinks.length) return;

  if (pageType === "portfolio") {
    navLinks.forEach((link) => {
      const href = link.getAttribute("href") || "";
      link.classList.toggle("active", href === "portfolio.html" || href.endsWith("/portfolio.html"));
    });
    return;
  }

  let currentId = "";
  document.querySelectorAll("section[id]").forEach((section) => {
    if (window.scrollY >= section.offsetTop - 120) currentId = section.id;
  });

  navLinks.forEach((link) => {
    const href = link.getAttribute("href") || "";
    link.classList.toggle("active", href === `#${currentId}` || href.endsWith(`#${currentId}`));
  });
}

function initializeScrollReveal() {
  const revealTargets = document.querySelectorAll(".scroll-reveal");
  if (!("IntersectionObserver" in window)) {
    revealTargets.forEach((node) => node.classList.add("is-revealed"));
    return;
  }

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-revealed");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -12% 0px", threshold: 0.15 });

  revealTargets.forEach((node, index) => {
    node.style.transitionDelay = `${Math.min(index * 40, 240)}ms`;
    revealObserver.observe(node);
  });
}

function alignInitialHashTarget() {
  if (state.hasAlignedInitialHash || pageType !== "home") return;
  if (!window.location.hash) return;
  const target = document.querySelector(window.location.hash);
  if (!target) return;
  target.scrollIntoView({ block: "start", behavior: "auto" });
  state.hasAlignedInitialHash = true;
}

function seededShuffle(array, seedText) {
  const shuffled = [...array];
  let hash = 2166136261;
  for (let i = 0; i < seedText.length; i += 1) {
    hash ^= seedText.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const random = () => {
    hash += 0x6d2b79f5;
    let t = hash;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function loadCollectionsForSite() {
  if (!window.photoDataApi?.fetchCollections) return;
  try {
    state.siteCollections = await window.photoDataApi.fetchCollections();
    applyPortfolioFiltersFromCollections();
  } catch (error) {
    console.warn("[gallery] fetchCollections failed. Falling back to static filters.", error);
  }
}

async function loadSiteSettingsForSite() {
  if (!window.photoDataApi?.fetchSiteSettings) return;

  try {
    const settings = await window.photoDataApi.fetchSiteSettings();
    applySiteTheme(settings);
    applyAppearanceSettings(settings);
    applySiteSettings(settings);
  } catch (error) {
    console.warn("[gallery] fetchSiteSettings failed. Using static content defaults.", error);
    applySiteTheme({});
    applyAppearanceSettings({});
  }
}

function normalizePublishedPhotosForPage(photos) {
  const filtered = Array.isArray(photos)
    ? photos.filter((photo) => {
        if (!photo || !photo.is_published) return false;
        return pageType === "home" ? Boolean(photo.show_on_home) : true;
      })
    : [];
  return normalizeGalleryImages(filtered);
}

async function loadGalleryFromSupabase() {
  if (!window.photoDataApi?.hasValidSupabaseConfig || !window.photoDataApi.hasValidSupabaseConfig()) {
    state.orderedGalleryImages = normalizeGalleryImages(seededShuffle(state.galleryImages, "v1"));
    return;
  }

  const photos = await window.photoDataApi.fetchPublishedPhotos({ showOnHomeOnly: pageType === "home" });
  const publishedPhotos = normalizePublishedPhotosForPage(photos);
  state.orderedGalleryImages = publishedPhotos.length
    ? publishedPhotos
    : normalizeGalleryImages(seededShuffle(state.galleryImages, "v1"));
}

async function initializeGallery() {
  if (dom.yearNode) dom.yearNode.textContent = new Date().getFullYear();

  bindGlobalEvents();
  updateActiveNavLink();
  window.addEventListener("scroll", updateActiveNavLink, { passive: true });

  await loadSiteSettingsForSite();
  await loadCollectionsForSite();

  try {
    await loadGalleryFromSupabase();
  } catch (error) {
    state.orderedGalleryImages = normalizeGalleryImages(seededShuffle(state.galleryImages, "v1"));
    console.warn("[gallery] fetchPublishedPhotos request failed. Falling back to local galleryImages.", error);
  }

  renderForActiveFilter();
  initializeScrollReveal();
  requestAnimationFrame(alignInitialHashTarget);
}

initializeGallery();
window.addEventListener("load", alignInitialHashTarget);
