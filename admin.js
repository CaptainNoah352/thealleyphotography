const dom = {
  loginSection: document.getElementById("loginSection"),
  dashboardSection: document.getElementById("dashboardSection"),
  loginForm: document.getElementById("loginForm"),
  logoutBtn: document.getElementById("logoutBtn"),
  adminMessage: document.getElementById("adminMessage"),
  activeSectionTitle: document.getElementById("activeSectionTitle"),
  photoForm: document.getElementById("photoForm"),
  photoFormTitle: document.getElementById("photoFormTitle"),
  cancelEditBtn: document.getElementById("cancelEditBtn"),
  photoTableBody: document.getElementById("photoTableBody"),
  imagePreview: document.getElementById("imagePreview"),
  searchInput: document.getElementById("searchInput"),
  adminCategoryFilter: document.getElementById("adminCategoryFilter"),
  adminOrientationFilter: document.getElementById("adminOrientationFilter"),
  adminTagFilter: document.getElementById("adminTagFilter"),
  bulkImageUrls: document.getElementById("bulkImageUrls"),
  addBulkUrlsBtn: document.getElementById("addBulkUrlsBtn"),
  cloudinaryUploadBtn: document.getElementById("cloudinaryUploadBtn"),
  cloudinaryFile: document.getElementById("cloudinaryFile"),
  cloudinaryCloudName: document.getElementById("cloudinaryCloudName"),
  cloudinaryUploadPreset: document.getElementById("cloudinaryUploadPreset"),
  selectAllPhotos: document.getElementById("selectAllPhotos"),
  bulkPublishBtn: document.getElementById("bulkPublishBtn"),
  bulkHideBtn: document.getElementById("bulkHideBtn"),
  bulkDeleteBtn: document.getElementById("bulkDeleteBtn"),
  collectionCreateForm: document.getElementById("collectionCreateForm"),
  newCollectionName: document.getElementById("newCollectionName"),
  collectionList: document.getElementById("collectionList"),
  appearanceForm: document.getElementById("appearanceForm"),
  settingsForm: document.getElementById("settingsForm"),
};

const fields = {
  id: document.getElementById("photoId"),
  imageUrl: document.getElementById("imageUrl"),
  title: document.getElementById("title"),
  caption: document.getElementById("caption"),
  altText: document.getElementById("altText"),
  category: document.getElementById("category"),
  tags: document.getElementById("tags"),
  orientation: document.getElementById("orientation"),
  sortOrder: document.getElementById("sortOrder"),
  showOnHome: document.getElementById("showOnHome"),
  isFeatured: document.getElementById("isFeatured"),
  isPublished: document.getElementById("isPublished"),
};

const siteSettingFields = {
  site_title: document.getElementById("setting_site_title"),
  site_intro_text: document.getElementById("setting_site_intro_text"),
  heading_font: document.getElementById("setting_heading_font"),
  body_font: document.getElementById("setting_body_font"),
  theme_primary_color: document.getElementById("setting_theme_primary_color"),
  theme_accent_color: document.getElementById("setting_theme_accent_color"),
  dark_mode_behavior: document.getElementById("setting_dark_mode_behavior"),
  header_layout: document.getElementById("setting_header_layout"),
  desktop_columns: document.getElementById("setting_desktop_columns"),
  mobile_columns: document.getElementById("setting_mobile_columns"),
  desktop_grid_gap: document.getElementById("setting_desktop_grid_gap"),
  mobile_grid_gap: document.getElementById("setting_mobile_grid_gap"),
  keep_original_ratio: document.getElementById("setting_keep_original_ratio"),
  lightbox_show_arrows: document.getElementById("setting_lightbox_show_arrows"),
  lightbox_arrow_position: document.getElementById("setting_lightbox_arrow_position"),
  lightbox_show_captions: document.getElementById("setting_lightbox_show_captions"),
  lightbox_show_counter: document.getElementById("setting_lightbox_show_counter"),
  lightbox_bg_opacity: document.getElementById("setting_lightbox_bg_opacity"),
  contact_title: document.getElementById("setting_contact_title"),
  contact_subtitle: document.getElementById("setting_contact_subtitle"),
  contact_email: document.getElementById("setting_contact_email"),
  instagram_url: document.getElementById("setting_instagram_url"),
  instagram_label: document.getElementById("setting_instagram_label"),
  flickr_url: document.getElementById("setting_flickr_url"),
  location_text: document.getElementById("setting_location_text"),
  availability_text: document.getElementById("setting_availability_text"),
  response_time_text: document.getElementById("setting_response_time_text"),
  seo_title: document.getElementById("setting_seo_title"),
  seo_description: document.getElementById("setting_seo_description"),
};

const tabLabels = { photos: "Photos", collections: "Collections", appearance: "Appearance", settings: "Settings" };

const state = {
  allPhotos: [],
  allCollections: [],
  selectedPhotoIds: new Set(),
  dragSourceId: "",
  dragCollectionSlug: "",
};

function showMessage(text, type = "") {
  if (!dom.adminMessage) return;
  dom.adminMessage.textContent = text || "";
  dom.adminMessage.classList.remove("error", "success");
  if (type) dom.adminMessage.classList.add(type);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeSlug(value) {
  return (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function stringToBool(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return fallback;
  return value.toLowerCase() === "true";
}

function setAuthUi(session) {
  const loggedIn = Boolean(session);
  if (dom.loginSection) dom.loginSection.hidden = loggedIn;
  if (dom.dashboardSection) dom.dashboardSection.hidden = !loggedIn;
  if (dom.logoutBtn) dom.logoutBtn.hidden = !loggedIn;
}

function updatePreview() {
  if (!dom.imagePreview || !fields.imageUrl) return;
  const src = (fields.imageUrl.value || "").trim();
  if (!src) dom.imagePreview.removeAttribute("src");
  else dom.imagePreview.src = src;
}

function resetForm() {
  dom.photoForm?.reset();
  if (fields.id) fields.id.value = "";
  if (fields.sortOrder) fields.sortOrder.value = "0";
  if (fields.isPublished) fields.isPublished.checked = true;
  if (fields.orientation) fields.orientation.value = "auto";
  if (dom.photoFormTitle) dom.photoFormTitle.textContent = "Add Photo";
  if (dom.cancelEditBtn) dom.cancelEditBtn.hidden = true;
  updatePreview();
}

function getCollectionPhotoCounts() {
  return state.allPhotos.reduce((acc, photo) => {
    const slug = (photo?.category || "").trim();
    if (!slug) return acc;
    acc[slug] = (acc[slug] || 0) + 1;
    return acc;
  }, {});
}

function syncCollectionDropdowns() {
  if (!fields.category || !dom.adminCategoryFilter) return;
  const currentFormCategory = fields.category.value;
  const currentFilterCategory = dom.adminCategoryFilter.value;

  const options = state.allCollections.length
    ? state.allCollections
    : (window.photoDataApi.defaultCategories || []).map((item, index) => ({ ...item, sort_order: index }));

  const markup = options
    .slice()
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((collection) => `<option value="${escapeHtml(collection.slug)}">${escapeHtml(collection.name)}</option>`)
    .join("");

  fields.category.innerHTML = markup;
  dom.adminCategoryFilter.innerHTML = '<option value="all">All categories</option>' + markup;

  if (currentFormCategory && fields.category.querySelector(`option[value="${CSS.escape(currentFormCategory)}"]`)) {
    fields.category.value = currentFormCategory;
  }

  if (currentFilterCategory === "all" || dom.adminCategoryFilter.querySelector(`option[value="${CSS.escape(currentFilterCategory)}"]`)) {
    dom.adminCategoryFilter.value = currentFilterCategory;
  }
}

function photoToPayload() {
  return {
    image_url: fields.imageUrl.value.trim(),
    title: fields.title.value.trim(),
    caption: fields.caption.value.trim(),
    description: fields.caption.value.trim(),
    alt_text: fields.altText.value.trim(),
    category: normalizeSlug(fields.category.value) || "uncategorized",
    tags: fields.tags.value.split(",").map((v) => normalizeSlug(v)).filter(Boolean),
    orientation: fields.orientation.value,
    sort_order: Number(fields.sortOrder.value || 0),
    show_on_home: fields.showOnHome.checked,
    is_featured: fields.isFeatured.checked,
    is_published: fields.isPublished.checked,
  };
}

function fillForm(photo) {
  fields.id.value = photo.id;
  fields.imageUrl.value = photo.image_url;
  fields.title.value = photo.title || "";
  fields.caption.value = photo.caption || photo.description || "";
  fields.altText.value = photo.alt_text || photo.alt || "";
  fields.category.value = photo.category || "";
  fields.tags.value = Array.isArray(photo.tags) ? photo.tags.join(", ") : "";
  fields.orientation.value = photo.orientation || "auto";
  fields.sortOrder.value = String(photo.sort_order || 0);
  fields.showOnHome.checked = Boolean(photo.show_on_home);
  fields.isFeatured.checked = Boolean(photo.is_featured);
  fields.isPublished.checked = Boolean(photo.is_published);
  dom.photoFormTitle.textContent = "Edit Photo";
  dom.cancelEditBtn.hidden = false;
  updatePreview();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function getVisiblePhotos() {
  const q = (dom.searchInput?.value || "").trim().toLowerCase();
  const category = dom.adminCategoryFilter?.value || "all";
  const orientation = dom.adminOrientationFilter?.value || "all";
  const tag = (dom.adminTagFilter?.value || "").trim().toLowerCase();

  return state.allPhotos.filter((photo) => {
    const photoTags = Array.isArray(photo.tags) ? photo.tags : [];
    const matchesSearch = !q || [photo.title, photo.caption, photo.alt_text, photo.image_url, photoTags.join(" ")].filter(Boolean).join(" ").toLowerCase().includes(q);
    const matchesCategory = category === "all" || photo.category === category;
    const matchesOrientation = orientation === "all" || (photo.orientation || "auto") === orientation;
    const matchesTag = !tag || photoTags.some((value) => value.includes(tag));
    return matchesSearch && matchesCategory && matchesOrientation && matchesTag;
  });
}

function syncSelectAllState() {
  if (!dom.selectAllPhotos || !dom.photoTableBody) return;
  const visibleRows = dom.photoTableBody.querySelectorAll('input[data-photo-select]');
  if (!visibleRows.length) {
    dom.selectAllPhotos.checked = false;
    dom.selectAllPhotos.indeterminate = false;
    return;
  }

  const checkedCount = Array.from(visibleRows).filter((node) => node.checked).length;
  dom.selectAllPhotos.checked = checkedCount === visibleRows.length;
  dom.selectAllPhotos.indeterminate = checkedCount > 0 && checkedCount < visibleRows.length;
}

function buildPhotoBadges(photo) {
  const badges = [];
  badges.push(`<span class="badge ${photo.is_published ? "badge-visible" : "badge-hidden"}">${photo.is_published ? "Visible" : "Hidden"}</span>`);
  if (photo.is_featured) badges.push('<span class="badge badge-featured">Featured</span>');
  if (photo.show_on_home) badges.push('<span class="badge badge-home">Homepage</span>');
  badges.push(`<span class="badge badge-category">${escapeHtml(photo.category || "uncategorized")}</span>`);
  return badges.join("");
}

function renderPhotoTable() {
  if (!dom.photoTableBody) return;
  const rows = getVisiblePhotos();
  dom.photoTableBody.innerHTML = "";

  if (!rows.length) {
    dom.photoTableBody.innerHTML = '<tr><td colspan="6">No photos found.</td></tr>';
    syncSelectAllState();
    return;
  }

  rows.forEach((photo) => {
    const isChecked = state.selectedPhotoIds.has(photo.id);
    const row = document.createElement("tr");
    row.draggable = true;
    row.dataset.id = photo.id;
    row.innerHTML = `
      <td><input type="checkbox" data-photo-select="${photo.id}" ${isChecked ? "checked" : ""}/></td>
      <td><span class="drag-handle" aria-hidden="true">⋮⋮</span></td>
      <td><img class="admin-thumb" src="${escapeHtml(photo.image_url)}" alt="${escapeHtml(photo.alt || photo.title || "Photo")}" /></td>
      <td>
        <div class="detail-title">${escapeHtml(photo.title || "Untitled")}</div>
        <div class="detail-caption">${escapeHtml(photo.caption || "No caption")}</div>
      </td>
      <td><div class="badge-row">${buildPhotoBadges(photo)}</div></td>
      <td>
        <div class="action-stack">
          <button class="admin-btn admin-btn-secondary" data-action="edit" data-id="${photo.id}" type="button">Edit</button>
          <button class="admin-btn admin-btn-secondary" data-action="hide" data-id="${photo.id}" type="button">${photo.is_published ? "Hide" : "Show"}</button>
          <button class="admin-btn admin-btn-secondary" data-action="delete" data-id="${photo.id}" type="button">Delete</button>
        </div>
      </td>`;
    dom.photoTableBody.appendChild(row);
  });

  syncSelectAllState();
}

function renderCollections() {
  if (!dom.collectionList) return;
  dom.collectionList.innerHTML = "";
  const countsBySlug = getCollectionPhotoCounts();

  state.allCollections
    .slice()
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .forEach((collection, index) => {
      const photoCount = countsBySlug[collection.slug] || 0;
      const li = document.createElement("li");
      li.className = "collection-item";
      li.draggable = true;
      li.dataset.slug = collection.slug;
      li.innerHTML = `
        <span class="drag-handle" aria-hidden="true">⋮⋮</span>
        <input type="text" value="${escapeHtml(collection.name)}" data-collection-name="${escapeHtml(collection.slug)}" placeholder="Collection name" />
        <input type="text" value="${escapeHtml(collection.slug)}" data-collection-slug="${escapeHtml(collection.slug)}" placeholder="collection-slug" />
        <label class="check-row"><input type="checkbox" data-collection-nav="${escapeHtml(collection.slug)}" ${collection.show_in_nav ? "checked" : ""}/> Show in navigation</label>
        <div class="action-stack">
          <button class="admin-btn admin-btn-secondary" data-collection-save="${escapeHtml(collection.slug)}" type="button">Save</button>
          <button class="admin-btn admin-btn-secondary" data-collection-delete="${escapeHtml(collection.slug)}" type="button">Delete</button>
        </div>
        <div class="collection-meta">
          <span class="badge badge-category">Slug: ${escapeHtml(collection.slug)}</span>
          <span class="badge">Sort: ${index + 1}</span>
          <span class="badge">Photos: ${photoCount}</span>
          <span class="badge ${collection.show_in_nav ? "badge-visible" : "badge-hidden"}">${collection.show_in_nav ? "Visible in nav" : "Hidden in nav"}</span>
        </div>
      `;
      dom.collectionList.appendChild(li);
    });
}

async function loadPhotos() {
  state.allPhotos = await window.photoDataApi.fetchAllPhotosForAdmin();
  renderPhotoTable();
}

async function loadCollections() {
  state.allCollections = await window.photoDataApi.fetchCollections();
  syncCollectionDropdowns();
  renderCollections();
}

async function loadDataForDashboard() {
  await loadCollections();
  await loadPhotos();
  await loadSiteSettings();
}

function collectSettings(formType) {
  const keysByForm = {
    appearance: [
      "site_title", "site_intro_text", "heading_font", "body_font", "theme_primary_color", "theme_accent_color",
      "dark_mode_behavior", "header_layout", "desktop_columns", "mobile_columns", "desktop_grid_gap", "mobile_grid_gap",
      "keep_original_ratio", "lightbox_show_arrows", "lightbox_arrow_position", "lightbox_show_captions", "lightbox_show_counter", "lightbox_bg_opacity",
    ],
    settings: [
      "contact_title", "contact_subtitle", "contact_email", "instagram_url", "instagram_label", "flickr_url", "location_text",
      "availability_text", "response_time_text", "seo_title", "seo_description",
    ],
  };

  return (keysByForm[formType] || []).reduce((values, key) => {
    const node = siteSettingFields[key];
    if (!node) return values;
    values[key] = node.type === "checkbox" ? String(node.checked) : (node.value || "").trim();
    return values;
  }, {});
}

function fillSiteSettingsForm(settings) {
  Object.entries(siteSettingFields).forEach(([key, node]) => {
    if (!node) return;
    const raw = settings[key] ?? "";
    if (node.type === "checkbox") node.checked = stringToBool(raw);
    else node.value = raw;
  });
}

async function loadSiteSettings() {
  const settings = await window.photoDataApi.fetchSiteSettings();
  fillSiteSettingsForm(settings);
}

function setupTabNavigation() {
  document.querySelectorAll(".admin-nav-btn").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".admin-nav-btn").forEach((node) => node.classList.toggle("active", node === tab));
      const active = tab.dataset.tab;
      if (dom.activeSectionTitle) dom.activeSectionTitle.textContent = tabLabels[active] || "Photos";
      document.querySelectorAll(".admin-panel").forEach((panel) => {
        panel.hidden = panel.dataset.panel !== active;
      });
    });
  });
}

async function uploadToCloudinary() {
  const cloudName = dom.cloudinaryCloudName?.value.trim() || "";
  const uploadPreset = dom.cloudinaryUploadPreset?.value.trim() || "";
  const file = dom.cloudinaryFile?.files?.[0];
  if (!cloudName || !uploadPreset || !file) return showMessage("Provide cloud name, upload preset, and image file before upload.", "error");

  const uploadUrl = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  showMessage("Uploading image...");
  if (dom.cloudinaryUploadBtn) dom.cloudinaryUploadBtn.disabled = true;

  try {
    const response = await fetch(uploadUrl, { method: "POST", body: formData });
    const data = await response.json();
    if (!response.ok || !data.secure_url) throw new Error(data?.error?.message || "Cloudinary upload failed.");
    fields.imageUrl.value = data.secure_url;
    updatePreview();
    showMessage("Cloudinary upload complete.", "success");
  } catch (error) {
    showMessage(error.message || "Cloudinary upload failed.", "error");
  } finally {
    if (dom.cloudinaryUploadBtn) dom.cloudinaryUploadBtn.disabled = false;
  }
}

async function runBulkAction(kind) {
  const ids = Array.from(state.selectedPhotoIds);
  if (!ids.length) return showMessage("Select at least one photo first.", "error");

  try {
    if (kind === "show") await window.photoDataApi.bulkUpdatePhotos(ids, { is_published: true });
    if (kind === "hide") await window.photoDataApi.bulkUpdatePhotos(ids, { is_published: false });
    if (kind === "delete") {
      if (!window.confirm(`Delete ${ids.length} selected photos?`)) return;
      await window.photoDataApi.bulkDeletePhotos(ids);
    }

    state.selectedPhotoIds = new Set();
    if (dom.selectAllPhotos) dom.selectAllPhotos.checked = false;
    await loadPhotos();
    showMessage(`Bulk ${kind} action complete.`, "success");
  } catch (error) {
    showMessage(error.message || "Bulk action failed.", "error");
  }
}

function buildReorderedPhotoIds(draggedId, targetId, placeAfter) {
  const ids = state.allPhotos.map((photo) => photo.id);
  const fromIndex = ids.indexOf(draggedId);
  const targetIndexRaw = ids.indexOf(targetId);
  if (fromIndex < 0 || targetIndexRaw < 0) return ids;

  const [dragged] = ids.splice(fromIndex, 1);
  const targetIndex = ids.indexOf(targetId);
  const insertAt = placeAfter ? targetIndex + 1 : targetIndex;
  ids.splice(insertAt, 0, dragged);
  return ids;
}

async function initializeAdmin() {
  if (!window.photoDataApi?.hasValidSupabaseConfig || !window.photoDataApi.hasValidSupabaseConfig()) {
    showMessage("Add your Supabase URL and anon key in supabase-config.js before using admin.", "error");
    return;
  }

  const session = await window.photoDataApi.getCurrentSession();
  setAuthUi(session);
  if (session) await loadDataForDashboard();

  window.photoDataApi.onAuthStateChange(async (nextSession) => {
    setAuthUi(nextSession);
    if (nextSession) await loadDataForDashboard();
    else {
      state.selectedPhotoIds = new Set();
      resetForm();
    }
  });
}

setupTabNavigation();

dom.loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage("Signing in...");
  try {
    await window.photoDataApi.signInWithEmail(document.getElementById("loginEmail").value.trim(), document.getElementById("loginPassword").value);
    showMessage("Signed in.", "success");
  } catch (error) {
    showMessage(error.message || "Unable to sign in.", "error");
  }
});

dom.logoutBtn?.addEventListener("click", async () => {
  try {
    await window.photoDataApi.signOutAdmin();
    showMessage("Logged out.", "success");
  } catch (error) {
    showMessage(error.message || "Unable to logout.", "error");
  }
});

fields.imageUrl?.addEventListener("input", updatePreview);
dom.cloudinaryUploadBtn?.addEventListener("click", uploadToCloudinary);
dom.cancelEditBtn?.addEventListener("click", resetForm);

dom.photoForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = photoToPayload();
  if (!payload.image_url) return showMessage("Image URL is required.", "error");

  try {
    if (fields.id.value) {
      await window.photoDataApi.updatePhoto(fields.id.value, payload);
      showMessage("Photo updated.", "success");
    } else {
      await window.photoDataApi.createPhoto(payload);
      showMessage("Photo added.", "success");
    }
    resetForm();
    await loadPhotos();
  } catch (error) {
    showMessage(error.message || "Unable to save photo.", "error");
  }
});

dom.photoTableBody?.addEventListener("click", async (event) => {
  const actionButton = event.target.closest("button[data-action]");
  if (actionButton) {
    const id = actionButton.dataset.id;
    const action = actionButton.dataset.action;
    const photo = state.allPhotos.find((entry) => entry.id === id);
    if (!photo) return;

    try {
      if (action === "edit") fillForm(photo);
      if (action === "hide") await window.photoDataApi.updatePhoto(id, { is_published: !photo.is_published });
      if (action === "delete" && window.confirm("Delete this photo permanently?")) await window.photoDataApi.deletePhoto(id);
      if (action !== "edit") {
        await loadPhotos();
        showMessage(action === "delete" ? "Photo deleted." : "Photo visibility updated.", "success");
      }
    } catch (error) {
      showMessage(error.message || "Unable to process action.", "error");
    }
    return;
  }

  const check = event.target.closest("input[data-photo-select]");
  if (!check) return;

  if (check.checked) state.selectedPhotoIds.add(check.dataset.photoSelect);
  else state.selectedPhotoIds.delete(check.dataset.photoSelect);
  syncSelectAllState();
});

dom.photoTableBody?.addEventListener("dragstart", (event) => {
  const row = event.target.closest("tr[data-id]");
  if (!row) return;
  state.dragSourceId = row.dataset.id;
  row.classList.add("is-dragging");
});

dom.photoTableBody?.addEventListener("dragend", (event) => {
  event.target.closest("tr[data-id]")?.classList.remove("is-dragging");
  dom.photoTableBody.querySelectorAll("tr.drag-over").forEach((row) => row.classList.remove("drag-over"));
});

dom.photoTableBody?.addEventListener("dragover", (event) => {
  event.preventDefault();
  const row = event.target.closest("tr[data-id]");
  if (!row || row.dataset.id === state.dragSourceId) return;
  dom.photoTableBody.querySelectorAll("tr.drag-over").forEach((node) => node.classList.remove("drag-over"));
  row.classList.add("drag-over");
});

dom.photoTableBody?.addEventListener("drop", async (event) => {
  event.preventDefault();
  const target = event.target.closest("tr[data-id]");
  if (!target || target.dataset.id === state.dragSourceId) return;

  const placeAfter = event.clientY > target.getBoundingClientRect().top + target.offsetHeight / 2;
  const reorderedIds = buildReorderedPhotoIds(state.dragSourceId, target.dataset.id, placeAfter);

  try {
    await window.photoDataApi.reorderPhotos(reorderedIds);
    await loadPhotos();
    showMessage("Photo order saved.", "success");
  } catch (error) {
    showMessage(error.message || "Unable to reorder photos.", "error");
  }
});

dom.selectAllPhotos?.addEventListener("change", () => {
  const checked = dom.selectAllPhotos.checked;
  dom.photoTableBody?.querySelectorAll("input[data-photo-select]").forEach((node) => {
    node.checked = checked;
    if (checked) state.selectedPhotoIds.add(node.dataset.photoSelect);
    else state.selectedPhotoIds.delete(node.dataset.photoSelect);
  });
  syncSelectAllState();
});

dom.bulkPublishBtn?.addEventListener("click", () => runBulkAction("show"));
dom.bulkHideBtn?.addEventListener("click", () => runBulkAction("hide"));
dom.bulkDeleteBtn?.addEventListener("click", () => runBulkAction("delete"));

[dom.searchInput, dom.adminCategoryFilter, dom.adminOrientationFilter, dom.adminTagFilter].forEach((node) => {
  node?.addEventListener(node.tagName === "SELECT" ? "change" : "input", renderPhotoTable);
});

dom.addBulkUrlsBtn?.addEventListener("click", async () => {
  const urls = (dom.bulkImageUrls?.value || "").split(/\n|,/).map((item) => item.trim()).filter(Boolean);
  if (!urls.length) return showMessage("No valid URLs found.", "error");

  try {
    for (const imageUrl of urls) {
      await window.photoDataApi.createPhoto({
        image_url: imageUrl,
        title: "",
        caption: "",
        description: "",
        alt_text: "",
        category: normalizeSlug(fields.category.value) || "uncategorized",
        tags: [],
        orientation: "auto",
        sort_order: 0,
        show_on_home: fields.showOnHome.checked,
        is_featured: fields.isFeatured.checked,
        is_published: fields.isPublished.checked,
      });
    }

    if (dom.bulkImageUrls) dom.bulkImageUrls.value = "";
    await loadPhotos();
    showMessage(`Added ${urls.length} photo URL${urls.length === 1 ? "" : "s"}.`, "success");
  } catch (error) {
    showMessage(error.message || "Bulk add failed.", "error");
  }
});

dom.collectionCreateForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await window.photoDataApi.createCollection(dom.newCollectionName.value.trim());
    dom.newCollectionName.value = "";
    await loadCollections();
    renderPhotoTable();
    showMessage("Collection created.", "success");
  } catch (error) {
    showMessage(error.message || "Unable to create collection.", "error");
  }
});

dom.collectionList?.addEventListener("click", async (event) => {
  const save = event.target.closest("button[data-collection-save]");
  if (save) {
    const slug = save.dataset.collectionSave;
    const nameInput = dom.collectionList.querySelector(`input[data-collection-name="${CSS.escape(slug)}"]`);
    const slugInput = dom.collectionList.querySelector(`input[data-collection-slug="${CSS.escape(slug)}"]`);
    const navInput = dom.collectionList.querySelector(`input[data-collection-nav="${CSS.escape(slug)}"]`);
    const nextSlug = normalizeSlug(slugInput?.value || "");

    if (!nextSlug) return showMessage("Collection slug cannot be empty.", "error");

    try {
      await window.photoDataApi.updateCollection(slug, { slug: nextSlug, name: nameInput.value.trim(), show_in_nav: navInput.checked });
      await loadCollections();
      await loadPhotos();
      showMessage("Collection updated.", "success");
    } catch (error) {
      showMessage(error.message || "Unable to update collection.", "error");
    }
  }

  const del = event.target.closest("button[data-collection-delete]");
  if (del) {
    const slug = del.dataset.collectionDelete;
    if (!window.confirm("Delete this collection? Photos in this category will keep their category slug until reassigned.")) return;
    try {
      await window.photoDataApi.deleteCollection(slug);
      await loadCollections();
      showMessage("Collection deleted.", "success");
    } catch (error) {
      showMessage(error.message || "Unable to delete collection.", "error");
    }
  }
});

dom.collectionList?.addEventListener("dragstart", (event) => {
  const row = event.target.closest("li[data-slug]");
  if (!row) return;
  state.dragCollectionSlug = row.dataset.slug;
  row.classList.add("is-dragging");
});

dom.collectionList?.addEventListener("dragend", (event) => {
  event.target.closest("li[data-slug]")?.classList.remove("is-dragging");
});

dom.collectionList?.addEventListener("dragover", (event) => event.preventDefault());

dom.collectionList?.addEventListener("drop", async (event) => {
  event.preventDefault();
  const target = event.target.closest("li[data-slug]");
  const dragged = dom.collectionList.querySelector(`li[data-slug="${CSS.escape(state.dragCollectionSlug)}"]`);
  if (!target || !dragged || target === dragged) return;

  const after = event.clientY > target.getBoundingClientRect().top + target.offsetHeight / 2;
  if (after) target.after(dragged);
  else target.before(dragged);

  const orderedSlugs = Array.from(dom.collectionList.querySelectorAll("li[data-slug]")).map((node) => node.dataset.slug);

  try {
    await window.photoDataApi.reorderCollections(orderedSlugs);
    await loadCollections();
    showMessage("Collection order updated.", "success");
  } catch (error) {
    showMessage(error.message || "Unable to reorder collections.", "error");
  }
});

dom.appearanceForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await window.photoDataApi.saveSiteSettings(collectSettings("appearance"));
    showMessage("Appearance settings saved.", "success");
  } catch (error) {
    showMessage(error.message || "Unable to save appearance settings.", "error");
  }
});

dom.settingsForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await window.photoDataApi.saveSiteSettings(collectSettings("settings"));
    showMessage("Settings saved.", "success");
  } catch (error) {
    showMessage(error.message || "Unable to save settings.", "error");
  }
});

initializeAdmin().catch((error) => showMessage(error.message || "Admin failed to initialize.", "error"));
