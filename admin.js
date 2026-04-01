const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");
const loginForm = document.getElementById("loginForm");
const logoutBtn = document.getElementById("logoutBtn");
const adminMessage = document.getElementById("adminMessage");
const photoForm = document.getElementById("photoForm");
const photoFormTitle = document.getElementById("photoFormTitle");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const photoTableBody = document.getElementById("photoTableBody");
const imagePreview = document.getElementById("imagePreview");
const searchInput = document.getElementById("searchInput");
const adminCategoryFilter = document.getElementById("adminCategoryFilter");
const bulkImageUrls = document.getElementById("bulkImageUrls");
const addBulkUrlsBtn = document.getElementById("addBulkUrlsBtn");
const fields = {
  id: document.getElementById("photoId"),
  imageUrl: document.getElementById("imageUrl"),
  title: document.getElementById("title"),
  description: document.getElementById("description"),
  category: document.getElementById("category"),
  sortOrder: document.getElementById("sortOrder"),
  showOnHome: document.getElementById("showOnHome"),
  isPublished: document.getElementById("isPublished"),
};
let allPhotos = [];
function showMessage(text, type = "") {
  if (!adminMessage) return;
  adminMessage.textContent = text || "";
  adminMessage.classList.remove("error", "success");
  if (type) adminMessage.classList.add(type);
}
function setAuthUi(session) {
  const loggedIn = Boolean(session);
  if (loginSection) loginSection.hidden = loggedIn;
  if (dashboardSection) dashboardSection.hidden = !loggedIn;
  if (logoutBtn) logoutBtn.hidden = !loggedIn;
}
function resetForm() {
  if (!photoForm) return;
  photoForm.reset();
  fields.id.value = "";
  fields.sortOrder.value = "0";
  fields.isPublished.checked = true;
  photoFormTitle.textContent = "Add Photo";
  if (cancelEditBtn) cancelEditBtn.hidden = true;
  updatePreview();
}
function updatePreview() {
  if (!imagePreview || !fields.imageUrl) return;
  const src = fields.imageUrl.value.trim();
  if (!src) {
    imagePreview.removeAttribute("src");
    return;
  }
  imagePreview.src = src;
}
function photoToPayload() {
  return {
    image_url: fields.imageUrl.value.trim(),
    title: fields.title.value.trim(),
    description: fields.description.value.trim(),
    category: fields.category.value,
    sort_order: Number(fields.sortOrder.value || 0),
    show_on_home: fields.showOnHome.checked,
    is_published: fields.isPublished.checked,
  };
}
function fillForm(photo) {
  fields.id.value = photo.id;
  fields.imageUrl.value = photo.image_url;
  fields.title.value = photo.title || "";
  fields.description.value = photo.description || "";
  fields.category.value = photo.category;
  fields.sortOrder.value = String(photo.sort_order || 0);
  fields.showOnHome.checked = Boolean(photo.show_on_home);
  fields.isPublished.checked = Boolean(photo.is_published);
  photoFormTitle.textContent = "Edit Photo";
  if (cancelEditBtn) cancelEditBtn.hidden = false;
  updatePreview();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function getVisiblePhotos() {
  const q = (searchInput?.value || "").trim().toLowerCase();
  const filterCategory = adminCategoryFilter?.value || "all";
  return allPhotos.filter((photo) => {
    const matchesCategory = filterCategory === "all" || photo.category === filterCategory;
    const matchesSearch = !q || (photo.title || "").toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });
}
function renderPhotoTable() {
  if (!photoTableBody) return;
  const rows = getVisiblePhotos();
  photoTableBody.innerHTML = "";
  if (!rows.length) {
    photoTableBody.innerHTML = '<tr><td colspan="8">No photos found.</td></tr>';
    return;
  }
  rows.forEach((photo) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><img class="admin-thumb" src="${photo.image_url}" alt="${photo.title || "Photo"}" /></td>
      <td>${photo.title || "—"}</td>
      <td><a href="${photo.image_url}" target="_blank" rel="noreferrer">Open URL</a></td>
      <td>${photo.category}</td>
      <td>${photo.show_on_home ? "Yes" : "No"}</td>
      <td>${photo.is_published ? "Yes" : "No"}</td>
      <td>${photo.sort_order ?? 0}</td>
      <td>
        <button class="admin-btn admin-btn-secondary" data-action="edit" data-id="${photo.id}" type="button">Edit</button>
        <button class="admin-btn admin-btn-secondary" data-action="delete" data-id="${photo.id}" type="button">Delete</button>
      </td>
    `;
    photoTableBody.appendChild(tr);
  });
}
async function loadPhotos() {
  allPhotos = await window.photoDataApi.fetchAllPhotosForAdmin();
  renderPhotoTable();
}
async function initializeAdmin() {
  if (!window.photoDataApi?.hasValidSupabaseConfig || !window.photoDataApi.hasValidSupabaseConfig()) {
    showMessage("Add your Supabase URL and anon key in supabase-config.js before using admin.", "error");
    return;
  }
  const session = await window.photoDataApi.getCurrentSession();
  setAuthUi(session);
  if (session) {
    await loadPhotos();
  }
  window.photoDataApi.onAuthStateChange(async (nextSession) => {
    setAuthUi(nextSession);
    if (nextSession) {
      await loadPhotos();
    } else {
      resetForm();
      allPhotos = [];
      renderPhotoTable();
    }
  });
}
if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showMessage("Signing in...");
    try {
      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value;
      await window.photoDataApi.signInWithEmail(email, password);
      showMessage("Signed in.", "success");
    } catch (error) {
      showMessage(error.message || "Unable to sign in.", "error");
    }
  });
}
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await window.photoDataApi.signOutAdmin();
      showMessage("Logged out.", "success");
    } catch (error) {
      showMessage(error.message || "Unable to logout.", "error");
    }
  });
}
if (fields.imageUrl) {
  fields.imageUrl.addEventListener("input", updatePreview);
}
if (cancelEditBtn) {
  cancelEditBtn.addEventListener("click", () => {
    resetForm();
  });
}
if (photoForm) {
  photoForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = photoToPayload();
    if (!payload.image_url) {
      showMessage("Image URL is required.", "error");
      return;
    }
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
}
if (photoTableBody) {
  photoTableBody.addEventListener("click", async (event) => {
    const target = event.target.closest("button[data-action]");
    if (!target) return;
    const id = target.dataset.id;
    const action = target.dataset.action;
    const photo = allPhotos.find((entry) => entry.id === id);
    if (!photo) return;
    if (action === "edit") {
      fillForm(photo);
      return;
    }
    if (action === "delete") {
      const confirmed = window.confirm("Delete this photo? This action cannot be undone.");
      if (!confirmed) return;
      try {
        await window.photoDataApi.deletePhoto(id);
        showMessage("Photo deleted.", "success");
        await loadPhotos();
      } catch (error) {
        showMessage(error.message || "Unable to delete photo.", "error");
      }
    }
  });
}
if (searchInput) {
  searchInput.addEventListener("input", renderPhotoTable);
}
if (adminCategoryFilter) {
  adminCategoryFilter.addEventListener("change", renderPhotoTable);
}
if (addBulkUrlsBtn) {
  addBulkUrlsBtn.addEventListener("click", async () => {
    const rawValue = (bulkImageUrls?.value || "").trim();
    if (!rawValue) {
      showMessage("Add at least one URL in the bulk field.", "error");
      return;
    }
    const urls = rawValue
      .split(/\n|,/)
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (!urls.length) {
      showMessage("No valid URLs found.", "error");
      return;
    }
    try {
      let addedCount = 0;
      for (const url of urls) {
        await window.photoDataApi.createPhoto({
          image_url: url,
          title: "",
          description: "",
          category: fields.category.value,
          sort_order: 0,
          show_on_home: fields.showOnHome.checked,
          is_published: fields.isPublished.checked,
        });
        addedCount += 1;
      }
      if (bulkImageUrls) bulkImageUrls.value = "";
      showMessage(`Added ${addedCount} photo URL${addedCount === 1 ? "" : "s"}.`, "success");
      await loadPhotos();
    } catch (error) {
      showMessage(error.message || "Unable to bulk add photo URLs.", "error");
    }
  });
}
initializeAdmin().catch((error) => {
  showMessage(error.message || "Admin failed to initialize.", "error");
});
