// Project galleries and species modal behavior.

function renderProjectGallery(projectSlug) {
  const container = dom.projectGallery;
  if (!container) return;

  const projectImages = state.orderedGalleryImages.filter(
    (img) => img.project === projectSlug
  );

  container.innerHTML = "";

  if (!projectImages.length) {
    const emptyState = document.createElement("div");
    emptyState.className = "gallery-empty-state";
    emptyState.setAttribute("role", "status");
    emptyState.innerHTML = `<h3>No photos yet</h3><p>Photos will appear here as species are documented.</p>`;
    container.appendChild(emptyState);
    refreshLightboxItems();
    return;
  }

  projectImages.forEach((image) => {
    const article = document.createElement("article");
    article.className = "gallery-item";

    const img = document.createElement("img");
    img.src = image.src;
    img.alt = image.alt;
    img.loading = "lazy";
    img.decoding = "async";
    applyLightboxData(img, image);
    if (image.species) img.dataset.species = image.species;

    img.addEventListener("load", () => {
      img.classList.add("is-visible");
      refreshLightboxItems();
      hydrateSpeciesCards();
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
    container.appendChild(article);
  });

  refreshLightboxItems();
  hydrateSpeciesCards();
}

function openSpeciesModal(scientificName, openerEl) {
  const data = SPECIES_DATA[scientificName];
  if (!data || !dom.speciesModal) return;

  state.speciesModalOpener = openerEl || null;

  const commonName = openerEl
    ? (openerEl.querySelector(".species-common")?.textContent || scientificName)
    : scientificName;

  if (dom.speciesModalTitle) dom.speciesModalTitle.textContent = commonName;
  if (dom.speciesModalScientific) dom.speciesModalScientific.textContent = scientificName;

  if (dom.speciesModalConservation) {
    dom.speciesModalConservation.textContent = data.conservation;
    dom.speciesModalConservation.dataset.status = data.conservation
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[()]/g, "");
  }

  const matchingImgNode = dom.projectGallery
    ? Array.from(dom.projectGallery.querySelectorAll(".gallery-item img[data-species]")).find(
        (img) => img.dataset.species === scientificName && img.dataset.broken !== "true" && img.complete && img.naturalWidth
      )
    : null;

  if (dom.speciesModalDocumented) {
    dom.speciesModalDocumented.textContent = matchingImgNode ? "Documented" : "Not yet photographed";
    dom.speciesModalDocumented.dataset.state = matchingImgNode ? "documented" : "pending";
  }

  if (dom.speciesModalPhotoWrap) {
    dom.speciesModalPhotoWrap.innerHTML = "";
    if (matchingImgNode) {
      const img = document.createElement("img");
      img.src = matchingImgNode.src;
      img.alt = commonName;
      img.className = "species-modal-photo";
      if (matchingImgNode.naturalWidth > matchingImgNode.naturalHeight) {
        img.classList.add("species-modal-photo--landscape");
      }
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "species-modal-view-btn";
      btn.textContent = "View photo →";
      btn.addEventListener("click", () => {
        closeSpeciesModal();
        openLightboxByImageNode(matchingImgNode);
      });
      dom.speciesModalPhotoWrap.appendChild(img);
      dom.speciesModalPhotoWrap.appendChild(btn);
    }
  }

  if (dom.speciesModalDetails) {
    const fields = [
      { label: "Range", value: data.range },
      { label: "Habitat", value: data.habitat },
      { label: "Diet", value: data.diet },
      { label: "Field marks", value: data.fieldMarks },
      { label: "Behavior", value: data.behavior },
      { label: "Did you know", value: data.funFact },
    ];
    dom.speciesModalDetails.innerHTML = fields
      .map(({ label, value }) => `<dt>${label}</dt><dd>${value}</dd>`)
      .join("");
  }

  dom.speciesModal.classList.add("open");
  dom.speciesModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  const focusTarget = dom.speciesModalClose;
  if (focusTarget) requestAnimationFrame(() => focusTarget.focus());
}

function closeSpeciesModal() {
  if (!dom.speciesModal) return;
  dom.speciesModal.classList.remove("open");
  dom.speciesModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  if (state.speciesModalOpener) {
    state.speciesModalOpener.focus();
    state.speciesModalOpener = null;
  }
}

function initSpeciesCardClicks() {
  document.querySelectorAll(".species-card[data-species]").forEach((card) => {
    if (card.dataset.modalWired) return;
    card.dataset.modalWired = "true";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.style.cursor = "pointer";
    card.addEventListener("click", (event) => {
      if (event.target.closest(".species-thumb")) return;
      openSpeciesModal(card.dataset.species, card);
    });
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openSpeciesModal(card.dataset.species, card);
      }
    });
  });
}

function hydrateSpeciesCards() {
  if (!dom.projectGallery) return;
  const cards = document.querySelectorAll(".species-card[data-species]");
  if (!cards.length) return;

  const galleryImgs = Array.from(
    dom.projectGallery.querySelectorAll(".gallery-item img[data-species]")
  );

  cards.forEach((card) => {
    if (card.dataset.hydrated) return;
    const speciesKey = card.dataset.species;
    const matchingImg = galleryImgs.find(
      (img) => img.dataset.species === speciesKey && img.dataset.broken !== "true"
    );
    if (!matchingImg || !matchingImg.complete || !matchingImg.naturalWidth) return;

    card.classList.remove("species-card--pending");
    card.classList.add("species-card--complete");
    card.dataset.hydrated = "true";
    card.style.cursor = "pointer";

    const thumb = document.createElement("img");
    thumb.src = matchingImg.src;
    thumb.alt = "";
    thumb.className = "species-thumb";
    thumb.loading = "lazy";
    thumb.decoding = "async";
    thumb.setAttribute("aria-hidden", "true");
    thumb.title = "View photo";
    card.insertBefore(thumb, card.querySelector(".species-status-dot"));

    thumb.addEventListener("click", (event) => {
      event.stopPropagation();
      openLightboxByImageNode(matchingImg);
    });
  });
}

function updateProjectProgress(projectSlug, totalSpecies) {
  const projectImages = state.orderedGalleryImages.filter(
    (img) => img.project === projectSlug && img.species
  );
  const documentedSpecies = new Set(projectImages.map((img) => img.species));
  const count = documentedSpecies.size;
  const pct = totalSpecies > 0 ? Math.round((count / totalSpecies) * 100) : 0;

  const countEl = document.getElementById("heronProgressCount");
  const barEl = document.querySelector(".project-progress-bar");
  const fillEl = document.querySelector(".project-progress-fill");

  if (countEl) countEl.textContent = `${count} of ${totalSpecies} species documented`;
  if (fillEl) fillEl.style.width = `${pct}%`;
  if (barEl) {
    barEl.setAttribute("aria-valuenow", String(count));
    barEl.setAttribute("aria-valuemax", String(totalSpecies));
  }
}
