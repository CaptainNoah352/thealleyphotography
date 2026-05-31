// Location cards and location-specific galleries.

function getLocationsData() {
  return Array.isArray(window.LOCATIONS_DATA) ? window.LOCATIONS_DATA : [];
}

function getLocationImages(locationSlug) {
  return state.orderedGalleryImages.filter((img) => img.location === locationSlug);
}

function getLocationCover(location, locationImages) {
  if (!location) return null;
  return state.orderedGalleryImages.find((img) => img.id === location.coverImageId)
    || locationImages[0]
    || state.orderedGalleryImages[0]
    || null;
}

function createLocationCard(location, options = {}) {
  const locationImages = getLocationImages(location.slug);
  const cover = getLocationCover(location, locationImages);
  const article = document.createElement("article");
  article.className = "location-card scroll-reveal";

  const href = options.compact
    ? `locations.html#${location.slug}`
    : `#${location.slug}`;

  article.innerHTML = `
    <a class="location-card-link" href="${href}" aria-label="View photos from ${location.name}">
      <figure class="location-card-figure">
        ${cover ? `<img src="${cover.src}" alt="${cover.alt || location.name}" loading="lazy" decoding="async">` : ""}
      </figure>
      <div class="location-card-body">
        <p class="location-card-kicker">${location.status || "Location"}</p>
        <h3>${location.name}</h3>
        <p class="location-card-region">${location.region || ""}</p>
        <p class="location-card-summary">${location.summary || ""}</p>
        <span class="location-card-count">${locationImages.length} ${locationImages.length === 1 ? "photo" : "photos"}</span>
      </div>
    </a>
  `;

  return article;
}

function renderHomeLocationPreview() {
  if (!dom.homeLocationsGrid) return;
  const locations = getLocationsData();
  dom.homeLocationsGrid.innerHTML = "";

  locations.slice(0, 3).forEach((location) => {
    dom.homeLocationsGrid.appendChild(createLocationCard(location, { compact: true }));
  });
}

function renderLocationsPage() {
  const locations = getLocationsData();
  if (!locations.length) return;

  if (dom.locationsGrid && !dom.locationsGrid.children.length) {
    locations.forEach((location) => {
      dom.locationsGrid.appendChild(createLocationCard(location));
    });
  }

  const activeSlug = normalizeSlug(window.location.hash.replace("#", ""), locations[0].slug);
  const activeLocation = locations.find((location) => location.slug === activeSlug) || locations[0];
  const locationImages = getLocationImages(activeLocation.slug);

  if (dom.locationGalleryTitle) dom.locationGalleryTitle.textContent = activeLocation.name;
  if (dom.locationGalleryIntro) dom.locationGalleryIntro.textContent = activeLocation.description || activeLocation.summary || "";
  if (dom.locationGalleryCount) {
    dom.locationGalleryCount.textContent = `${locationImages.length} ${locationImages.length === 1 ? "photo" : "photos"}`;
  }

  if (!dom.locationGallery) return;
  dom.locationGallery.innerHTML = "";

  if (!locationImages.length) {
    const emptyState = document.createElement("div");
    emptyState.className = "gallery-empty-state";
    emptyState.setAttribute("role", "status");
    emptyState.innerHTML = `<h3>No photos yet</h3><p>Tag photos with <code>location: "${activeLocation.slug}"</code> in photo-data.js to populate this place gallery.</p>`;
    dom.locationGallery.appendChild(emptyState);
    refreshLightboxItems();
    return;
  }

  locationImages.forEach((image) => {
    const article = document.createElement("article");
    article.className = "gallery-item";

    const img = document.createElement("img");
    img.src = image.src;
    img.alt = image.alt;
    img.loading = "lazy";
    img.decoding = "async";
    applyLightboxData(img, image);

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
    dom.locationGallery.appendChild(article);
  });

  refreshLightboxItems();
}
