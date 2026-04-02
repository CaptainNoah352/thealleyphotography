const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");
const loginForm = document.getElementById("loginForm");
const logoutBtn = document.getElementById("logoutBtn");
const adminMessage = document.getElementById("adminMessage");
const activeSectionTitle = document.getElementById("activeSectionTitle");

const photoForm = document.getElementById("photoForm");
const photoFormTitle = document.getElementById("photoFormTitle");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const photoTableBody = document.getElementById("photoTableBody");
const imagePreview = document.getElementById("imagePreview");
const searchInput = document.getElementById("searchInput");
const adminCategoryFilter = document.getElementById("adminCategoryFilter");
const adminOrientationFilter = document.getElementById("adminOrientationFilter");
const adminTagFilter = document.getElementById("adminTagFilter");
const bulkImageUrls = document.getElementById("bulkImageUrls");
const addBulkUrlsBtn = document.getElementById("addBulkUrlsBtn");
const cloudinaryUploadBtn = document.getElementById("cloudinaryUploadBtn");
const cloudinaryFile = document.getElementById("cloudinaryFile");
const cloudinaryCloudName = document.getElementById("cloudinaryCloudName");
const cloudinaryUploadPreset = document.getElementById("cloudinaryUploadPreset");
const selectAllPhotos = document.getElementById("selectAllPhotos");
const bulkPublishBtn = document.getElementById("bulkPublishBtn");
const bulkHideBtn = document.getElementById("bulkHideBtn");
const bulkDeleteBtn = document.getElementById("bulkDeleteBtn");

const collectionCreateForm = document.getElementById("collectionCreateForm");
const newCollectionName = document.getElementById("newCollectionName");
const collectionList = document.getElementById("collectionList");

const appearanceForm = document.getElementById("appearanceForm");
const settingsForm = document.getElementById("settingsForm");

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

const tabLabels = {
  photos: "Photos",
  collections: "Collections",
  appearance: "Appearance",
  settings: "Settings",
};

let allPhotos = [];
let allCollections = [];
let selectedPhotoIds = new Set();
let dragSourceId = "";
let dragCollectionSlug = "";

function showMessage(text, type = "") {
  adminMessage.textContent = text || "";
  adminMessage.classList.remove("error", "success");
  if (type) adminMessage.classList.add(type);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function boolToString(value) {
  return value ? "true" : "false";
}

function stringToBool(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return fallback;
  return value.toLowerCase() === "true";
}

function setAuthUi(session) {
  const loggedIn = Boolean(session);
  loginSection.hidden = loggedIn;
  dashboardSection.hidden = !loggedIn;
  logoutBtn.hidden = !loggedIn;
}

function getCollectionPhotoCounts() {
  return allPhotos.reduce((acc, photo) => {
    const slug = (photo?.category || "").trim();
    if (!slug) return acc;
    acc[slug] = (acc[slug] || 0) + 1;
    return acc;
  }, {});
}

function updatePreview() {
  const src = (fields.imageUrl.value || "").trim();
  if (!src) {
    imagePreview.removeAttribute("src");
    return;
  }
  imagePreview.src = src;
}

function resetForm() {
  photoForm.reset();
  fields.id.value = "";
  fields.sortOrder.value = "0";
  fields.isPublished.checked = true;
  fields.orientation.value = "auto";
  photoFormTitle.textContent = "Add Photo";
  cancelEditBtn.hidden = true;
  updatePreview();
}

function syncCollectionDropdowns() {
  const options = allCollections.length
    ? allCollections
    : (window.photoDataApi.defaultCategories || []).map((item, index) => ({ ...item, sort_order: index }));

  const markup = options
    .slice()
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((collection) => `<option value="${escapeHtml(collection.slug)}">${escapeHtml(collection.name)}</option>`)
    .join("");

  fields.category.innerHTML = markup;
  adminCategoryFilter.innerHTML = '<option value="all">All categories</option>' + markup;
}

function photoToPayload() {
  return {
    image_url: fields.imageUrl.value.trim(),
    title: fields.title.value.trim(),
    caption: fields.caption.value.trim(),
    description: fields.caption.value.trim(),
    alt_text: fields.altText.value.trim(),
    category: fields.category.value,
    tags: fields.tags.value.split(",").map((v) => v.trim().toLowerCase()).filter(Boolean),
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
  photoFormTitle.textContent = "Edit Photo";
  cancelEditBtn.hidden = false;
  updatePreview();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function getVisiblePhotos() {
  const q = (searchInput.value || "").trim().toLowerCase();
  const category = adminCategoryFilter.value;
  const orientation = adminOrientationFilter.value;
  const tag = (adminTagFilter.value || "").trim().toLowerCase();

  return allPhotos.filter((photo) => {
    const photoTags = Array.isArray(photo.tags) ? photo.tags : [];
    const matchesSearch = !q || [photo.title, photo.caption, photo.alt_text, photo.image_url].filter(Boolean).join(" ").toLowerCase().includes(q);
    const matchesCategory = category === "all" || photo.category === category;
    const matchesOrientation = orientation === "all" || (photo.orientation || "auto") === orientation;
    const matchesTag = !tag || photoTags.some((value) => value.includes(tag));
    return matchesSearch && matchesCategory && matchesOrientation && matchesTag;
  });
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
  const rows = getVisiblePhotos();
  photoTableBody.innerHTML = "";
  if (!rows.length) {
    photoTableBody.innerHTML = '<tr><td colspan="6">No photos found.</td></tr>';
    return;
  }

  rows.forEach((photo) => {
    const isChecked = selectedPhotoIds.has(photo.id);
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
    photoTableBody.appendChild(row);
  });
}

function renderCollections() {
  collectionList.innerHTML = "";
  const countsBySlug = getCollectionPhotoCounts();

  allCollections
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
        <input type="text" value="${escapeHtml(collection.name)}" data-collection-name="${escapeHtml(collection.slug)}" />
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
      collectionList.appendChild(li);
    });
}

async function loadPhotos() {
  allPhotos = await window.photoDataApi.fetchAllPhotosForAdmin();
  renderPhotoTable();
  renderCollections();
}

async function loadCollections() {
  allCollections = await window.photoDataApi.fetchCollections();
  syncCollectionDropdowns();
  renderCollections();
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

  const values = {};
  (keysByForm[formType] || []).forEach((key) => {
    const node = siteSettingFields[key];
    if (!node) return;
    if (node.type === "checkbox") values[key] = boolToString(node.checked);
    else values[key] = (node.value || "").trim();
  });
  return values;
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
      activeSectionTitle.textContent = tabLabels[active] || "Photos";
      document.querySelectorAll(".admin-panel").forEach((panel) => {
        panel.hidden = panel.dataset.panel !== active;
      });
    });
  });
}

async function uploadToCloudinary() {
  const cloudName = cloudinaryCloudName.value.trim();
  const uploadPreset = cloudinaryUploadPreset.value.trim();
  const file = cloudinaryFile.files?.[0];
  if (!cloudName || !uploadPreset || !file) {
    showMessage("Provide cloud name, upload preset, and image file before upload.", "error");
    return;
  }

  const uploadUrl = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  showMessage("Uploading image...");
  cloudinaryUploadBtn.disabled = true;
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
    cloudinaryUploadBtn.disabled = false;
  }
}

async function runBulkAction(kind) {
  const ids = Array.from(selectedPhotoIds);
  if (!ids.length) return showMessage("Select at least one photo first.", "error");

  try {
    if (kind === "show") await window.photoDataApi.bulkUpdatePhotos(ids, { is_published: true });
    if (kind === "hide") await window.photoDataApi.bulkUpdatePhotos(ids, { is_published: false });
    if (kind === "delete") {
      if (!window.confirm(`Delete ${ids.length} selected photos?`)) return;
      await window.photoDataApi.bulkDeletePhotos(ids);
    }
    selectedPhotoIds = new Set();
    if (selectAllPhotos) selectAllPhotos.checked = false;
    await loadPhotos();
    showMessage(`Bulk ${kind} action complete.`, "success");
  } catch (error) {
    showMessage(error.message || "Bulk action failed.", "error");
  }
}

async function initializeAdmin() {
  if (!window.photoDataApi?.hasValidSupabaseConfig || !window.photoDataApi.hasValidSupabaseConfig()) {
    showMessage("Add your Supabase URL and anon key in supabase-config.js before using admin.", "error");
    return;
  }

  const session = await window.photoDataApi.getCurrentSession();
  setAuthUi(session);
  if (session) {
    await loadCollections();
    await loadPhotos();
    await loadSiteSettings();
  }

  window.photoDataApi.onAuthStateChange(async (nextSession) => {
    setAuthUi(nextSession);
    if (nextSession) {
      await loadCollections();
      await loadPhotos();
      await loadSiteSettings();
    }
  });
}

setupTabNavigation();

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage("Signing in...");
  try {
    await window.photoDataApi.signInWithEmail(document.getElementById("loginEmail").value.trim(), document.getElementById("loginPassword").value);
    showMessage("Signed in.", "success");
  } catch (error) {
    showMessage(error.message || "Unable to sign in.", "error");
  }
});

logoutBtn?.addEventListener("click", async () => {
  try {
    await window.photoDataApi.signOutAdmin();
    showMessage("Logged out.", "success");
  } catch (error) {
    showMessage(error.message || "Unable to logout.", "error");
  }
});

fields.imageUrl?.addEventListener("input", updatePreview);
cloudinaryUploadBtn?.addEventListener("click", uploadToCloudinary);
cancelEditBtn?.addEventListener("click", resetForm);

photoForm?.addEventListener("submit", async (event) => {
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

photoTableBody?.addEventListener("click", async (event) => {
  const actionButton = event.target.closest("button[data-action]");
  if (actionButton) {
    const id = actionButton.dataset.id;
    const action = actionButton.dataset.action;
    const photo = allPhotos.find((entry) => entry.id === id);
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
  if (check) {
    if (check.checked) selectedPhotoIds.add(check.dataset.photoSelect);
    else selectedPhotoIds.delete(check.dataset.photoSelect);
  }
});

photoTableBody?.addEventListener("dragstart", (event) => {
  const row = event.target.closest("tr[data-id]");
  if (!row) return;
  dragSourceId = row.dataset.id;
  row.classList.add("is-dragging");
});

photoTableBody?.addEventListener("dragend", (event) => {
  event.target.closest("tr[data-id]")?.classList.remove("is-dragging");
  photoTableBody.querySelectorAll("tr.drag-over").forEach((row) => row.classList.remove("drag-over"));
});

photoTableBody?.addEventListener("dragover", (event) => {
  event.preventDefault();
  const row = event.target.closest("tr[data-id]");
  if (!row || row.dataset.id === dragSourceId) return;
  photoTableBody.querySelectorAll("tr.drag-over").forEach((node) => node.classList.remove("drag-over"));
  row.classList.add("drag-over");
});

photoTableBody?.addEventListener("drop", async (event) => {
  event.preventDefault();
  const target = event.target.closest("tr[data-id]");
  const dragged = photoTableBody.querySelector(`tr[data-id="${dragSourceId}"]`);
  if (!target || !dragged || target === dragged) return;

  const after = event.clientY > target.getBoundingClientRect().top + target.offsetHeight / 2;
  if (after) target.after(dragged); else target.before(dragged);

  const reorderedIds = Array.from(photoTableBody.querySelectorAll("tr[data-id]")).map((row) => row.dataset.id);

  await window.photoDataApi.reorderPhotos(reorderedIds);
  await loadPhotos();
  showMessage("Photo order saved.", "success");
});

selectAllPhotos?.addEventListener("change", () => {
  const checked = selectAllPhotos.checked;
  selectedPhotoIds = new Set();
  photoTableBody.querySelectorAll("input[data-photo-select]").forEach((node) => {
    node.checked = checked;
    if (checked) selectedPhotoIds.add(node.dataset.photoSelect);
  });
});

bulkPublishBtn?.addEventListener("click", () => runBulkAction("show"));
bulkHideBtn?.addEventListener("click", () => runBulkAction("hide"));
bulkDeleteBtn?.addEventListener("click", () => runBulkAction("delete"));

[searchInput, adminCategoryFilter, adminOrientationFilter, adminTagFilter].forEach((node) => {
  node?.addEventListener(node.tagName === "SELECT" ? "change" : "input", renderPhotoTable);
});

addBulkUrlsBtn?.addEventListener("click", async () => {
  const urls = (bulkImageUrls.value || "").split(/\n|,/).map((item) => item.trim()).filter(Boolean);
  if (!urls.length) return showMessage("No valid URLs found.", "error");

  try {
    for (const imageUrl of urls) {
      await window.photoDataApi.createPhoto({
        image_url: imageUrl,
        title: "",
        caption: "",
        description: "",
        alt_text: "",
        category: fields.category.value,
        tags: [],
        orientation: "auto",
        sort_order: 0,
        show_on_home: fields.showOnHome.checked,
        is_featured: fields.isFeatured.checked,
        is_published: fields.isPublished.checked,
      });
    }
    bulkImageUrls.value = "";
    await loadPhotos();
    showMessage(`Added ${urls.length} photo URL${urls.length === 1 ? "" : "s"}.`, "success");
  } catch (error) {
    showMessage(error.message || "Bulk add failed.", "error");
  }
});

collectionCreateForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await window.photoDataApi.createCollection(newCollectionName.value.trim());
    newCollectionName.value = "";
    await loadCollections();
    showMessage("Collection created.", "success");
  } catch (error) {
    showMessage(error.message || "Unable to create collection.", "error");
  }
});

collectionList?.addEventListener("click", async (event) => {
  const save = event.target.closest("button[data-collection-save]");
  if (save) {
    const slug = save.dataset.collectionSave;
    const nameInput = collectionList.querySelector(`input[data-collection-name="${slug}"]`);
    const navInput = collectionList.querySelector(`input[data-collection-nav="${slug}"]`);
    try {
      await window.photoDataApi.updateCollection(slug, { name: nameInput.value.trim(), show_in_nav: navInput.checked });
      await loadCollections();
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

collectionList?.addEventListener("dragstart", (event) => {
  const row = event.target.closest("li[data-slug]");
  if (!row) return;
  dragCollectionSlug = row.dataset.slug;
  row.classList.add("is-dragging");
});

collectionList?.addEventListener("dragend", (event) => {
  event.target.closest("li[data-slug]")?.classList.remove("is-dragging");
});

collectionList?.addEventListener("dragover", (event) => event.preventDefault());

collectionList?.addEventListener("drop", async (event) => {
  event.preventDefault();
  const target = event.target.closest("li[data-slug]");
  const dragged = collectionList.querySelector(`li[data-slug="${dragCollectionSlug}"]`);
  if (!target || !dragged || target === dragged) return;

  const after = event.clientY > target.getBoundingClientRect().top + target.offsetHeight / 2;
  if (after) target.after(dragged); else target.before(dragged);

  const orderedSlugs = Array.from(collectionList.querySelectorAll("li[data-slug]")).map((node) => node.dataset.slug);
  await window.photoDataApi.reorderCollections(orderedSlugs);
  await loadCollections();
  showMessage("Collection order updated.", "success");
});

appearanceForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await window.photoDataApi.saveSiteSettings(collectSettings("appearance"));
    showMessage("Appearance settings saved.", "success");
  } catch (error) {
    showMessage(error.message || "Unable to save appearance settings.", "error");
  }
});

settingsForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await window.photoDataApi.saveSiteSettings(collectSettings("settings"));
    showMessage("Settings saved.", "success");
  } catch (error) {
    showMessage(error.message || "Unable to save settings.", "error");
  }
});

initializeAdmin().catch((error) => showMessage(error.message || "Admin failed to initialize.", "error"));
