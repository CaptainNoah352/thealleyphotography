(function initSupabaseHelpers() {
  const defaultCategories = [
    { slug: "wildlife", name: "Wildlife", sort_order: 0, show_in_nav: true },
    { slug: "landscape", name: "Landscape", sort_order: 1, show_in_nav: true },
    { slug: "portrait", name: "Portrait", sort_order: 2, show_in_nav: true },
    { slug: "street", name: "Street", sort_order: 3, show_in_nav: true },
  ];

  const defaultSiteSettings = {
    site_title: "Brandon Alley Photography",
    site_intro_text: "A self-taught photographer from Connecticut, now based in Ocala, Florida — finding beauty in stillness, wildlife, and the quiet moments in between.",
    seo_title: "Brandon | Photographer",
    seo_description:
      "Brandon is a self-taught wildlife and nature photographer based in Ocala, Florida, shooting film, DSLR, and mirrorless with a patient, honest approach.",
    about_intro: "",
    about_paragraph_1: "",
    about_paragraph_2: "",
    about_pullquote: "",
    about_paragraph_3: "",
    about_paragraph_4: "",
    about_paragraph_5: "",
    contact_title: "",
    contact_subtitle: "",
    contact_email: "",
    instagram_url: "",
    instagram_label: "",
    flickr_url: "",
    location_text: "",
    availability_text: "",
    response_time_text: "",
    theme_primary_color: "#5f6f52",
    theme_accent_color: "#8a6442",
    heading_font: "Poppins",
    body_font: "Poppins",
    dark_mode_behavior: "system",
    header_layout: "centered",
    desktop_columns: "3",
    mobile_columns: "2",
    desktop_grid_gap: "28",
    mobile_grid_gap: "8",
    keep_original_ratio: "true",
    lightbox_show_arrows: "true",
    lightbox_arrow_position: "edges",
    lightbox_show_captions: "true",
    lightbox_show_counter: "true",
    lightbox_bg_opacity: "1",
  };

  let client = null;

  function getConfig() {
    return window.SUPABASE_CONFIG || { url: "", anonKey: "" };
  }

  function hasValidSupabaseConfig() {
    const { url, anonKey } = getConfig();
    return (
      typeof url === "string" &&
      typeof anonKey === "string" &&
      url.startsWith("https://") &&
      !url.includes("YOUR_SUPABASE_URL") &&
      !anonKey.includes("YOUR_SUPABASE_ANON_KEY")
    );
  }

  function getSupabaseClient() {
    if (client) return client;
    if (!hasValidSupabaseConfig()) return null;
    if (!window.supabase || !window.supabase.createClient) return null;

    const { url, anonKey } = getConfig();
    client = window.supabase.createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });

    return client;
  }

  function toSlug(value) {
    return (value || "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function mapPhotoRow(row = {}) {
    const title = row.title || "";
    const description = row.description || row.caption || "";
    const category = row.category || "uncategorized";
    const tagList = Array.isArray(row.tags)
      ? row.tags
      : (row.tags || "")
          .split(",")
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean);

    return {
      id: row.id,
      src: row.image_url,
      image_url: row.image_url,
      title,
      caption: row.caption || row.description || "",
      description,
      alt: row.alt_text || title || description || "Portfolio photo",
      alt_text: row.alt_text || "",
      category,
      tags: tagList.length ? tagList : [category],
      orientation: row.orientation || "auto",
      show_on_home: Boolean(row.show_on_home),
      is_featured: Boolean(row.is_featured ?? row.show_on_home),
      is_published: Boolean(row.is_published),
      sort_order: Number.isFinite(row.sort_order) ? row.sort_order : 0,
      created_at: row.created_at || null,
    };
  }

  async function fetchPublishedPhotos(options = {}) {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) throw new Error("Supabase client is not configured.");

    let query = supabaseClient
      .from("photos")
      .select("*")
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (options.showOnHomeOnly) query = query.eq("show_on_home", true);
    if (options.category) query = query.eq("category", options.category);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapPhotoRow);
  }

  async function fetchAllPhotosForAdmin() {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) throw new Error("Supabase client is not configured.");

    const { data, error } = await supabaseClient
      .from("photos")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(mapPhotoRow);
  }

  async function createPhoto(payload) {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) throw new Error("Supabase client is not configured.");

    const { error } = await supabaseClient.from("photos").insert(payload);
    if (error) throw error;
  }

  async function updatePhoto(id, payload) {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) throw new Error("Supabase client is not configured.");

    const { error } = await supabaseClient.from("photos").update(payload).eq("id", id);
    if (error) throw error;
  }

  async function bulkUpdatePhotos(ids, payload) {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) throw new Error("Supabase client is not configured.");
    if (!Array.isArray(ids) || !ids.length) return;

    const { error } = await supabaseClient.from("photos").update(payload).in("id", ids);
    if (error) throw error;
  }

  async function deletePhoto(id) {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) throw new Error("Supabase client is not configured.");

    const { error } = await supabaseClient.from("photos").delete().eq("id", id);
    if (error) throw error;
  }

  async function bulkDeletePhotos(ids) {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) throw new Error("Supabase client is not configured.");
    if (!Array.isArray(ids) || !ids.length) return;

    const { error } = await supabaseClient.from("photos").delete().in("id", ids);
    if (error) throw error;
  }

  async function reorderPhotos(photoIds) {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) throw new Error("Supabase client is not configured.");
    if (!Array.isArray(photoIds) || !photoIds.length) return;

    const updates = photoIds.map((id, index) => ({ id, sort_order: index }));
    const { error } = await supabaseClient.from("photos").upsert(updates, { onConflict: "id" });
    if (error) throw error;
  }

  async function fetchCollections() {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) return [...defaultCategories];

    const { data, error } = await supabaseClient
      .from("collections")
      .select("slug,name,sort_order,show_in_nav")
      .order("sort_order", { ascending: true });

    if (error) {
      if (error.code === "42P01") return [...defaultCategories];
      throw error;
    }

    return (data || []).map((row, index) => ({
      slug: toSlug(row.slug || row.name || `category-${index}`),
      name: row.name || row.slug || `Category ${index + 1}`,
      sort_order: Number.isFinite(row.sort_order) ? row.sort_order : index,
      show_in_nav: row.show_in_nav !== false,
    }));
  }

  async function createCollection(name) {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) throw new Error("Supabase client is not configured.");
    const slug = toSlug(name);
    if (!slug) throw new Error("Collection name is required.");

    const existing = await fetchCollections();
    const sortOrder = existing.length;
    const { error } = await supabaseClient
      .from("collections")
      .insert({ slug, name: name.trim(), sort_order: sortOrder, show_in_nav: true });
    if (error) throw error;
    return slug;
  }

  async function updateCollection(slug, payload) {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) throw new Error("Supabase client is not configured.");

    const nextPayload = { ...payload };
    const requestedSlug = toSlug(nextPayload.slug || slug);
    const nextName = (nextPayload.name || "").trim();
    const nextShowInNav = nextPayload.show_in_nav !== false;
    delete nextPayload.slug;

    if (!requestedSlug) throw new Error("Collection slug is required.");

    if (requestedSlug === slug) {
      const { error } = await supabaseClient
        .from("collections")
        .update({
          ...nextPayload,
          name: nextName || slug,
          show_in_nav: nextShowInNav,
        })
        .eq("slug", slug);
      if (error) throw error;
      return requestedSlug;
    }

    const { data: existingCollection, error: currentCollectionError } = await supabaseClient
      .from("collections")
      .select("sort_order")
      .eq("slug", slug)
      .maybeSingle();
    if (currentCollectionError) throw currentCollectionError;

    const { error: insertError } = await supabaseClient.from("collections").insert({
      slug: requestedSlug,
      name: nextName || requestedSlug,
      show_in_nav: nextShowInNav,
      sort_order: Number.isFinite(nextPayload.sort_order)
        ? nextPayload.sort_order
        : (Number.isFinite(existingCollection?.sort_order) ? existingCollection.sort_order : 0),
    });
    if (insertError) throw insertError;

    const { error: photosError } = await supabaseClient
      .from("photos")
      .update({ category: requestedSlug })
      .eq("category", slug);
    if (photosError) throw photosError;

    const { error: deleteError } = await supabaseClient.from("collections").delete().eq("slug", slug);
    if (deleteError) throw deleteError;

    return requestedSlug;
  }

  async function deleteCollection(slug) {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) throw new Error("Supabase client is not configured.");
    const { error } = await supabaseClient.from("collections").delete().eq("slug", slug);
    if (error) throw error;
  }

  async function reorderCollections(slugs) {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) throw new Error("Supabase client is not configured.");
    if (!Array.isArray(slugs) || !slugs.length) return;

    const rows = slugs.map((slug, index) => ({ slug, sort_order: index }));
    const { error } = await supabaseClient.from("collections").upsert(rows, { onConflict: "slug" });
    if (error) throw error;
  }

  function normalizeSiteSettings(rows) {
    const normalized = { ...defaultSiteSettings };
    (rows || []).forEach((row) => {
      if (!row || typeof row.setting_key !== "string") return;
      normalized[row.setting_key] = row.setting_value || "";
    });
    return normalized;
  }

  async function fetchSiteSettings() {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) return { ...defaultSiteSettings };

    const { data, error } = await supabaseClient.from("site_settings").select("setting_key,setting_value");

    if (error) {
      if (error.code === "42P01") return { ...defaultSiteSettings };
      throw error;
    }

    return normalizeSiteSettings(data);
  }

  async function saveSiteSettings(settings) {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) throw new Error("Supabase client is not configured.");

    const rows = Object.entries(settings || {}).map(([setting_key, setting_value]) => ({
      setting_key,
      setting_value: setting_value == null ? "" : String(setting_value),
    }));

    if (!rows.length) return;
    const { error } = await supabaseClient.from("site_settings").upsert(rows, { onConflict: "setting_key" });
    if (error) throw error;
  }

  async function signInWithEmail(email, password) {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) throw new Error("Supabase client is not configured.");

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOutAdmin() {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) throw new Error("Supabase client is not configured.");

    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
  }

  async function getCurrentSession() {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) return null;

    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  function onAuthStateChange(callback) {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) return null;

    const result = supabaseClient.auth.onAuthStateChange((_event, session) => callback(session));
    return result?.data?.subscription || null;
  }

  window.photoDataApi = {
    defaultCategories,
    defaultSiteSettings,
    hasValidSupabaseConfig,
    getSupabaseClient,
    fetchPublishedPhotos,
    fetchAllPhotosForAdmin,
    createPhoto,
    updatePhoto,
    bulkUpdatePhotos,
    deletePhoto,
    bulkDeletePhotos,
    reorderPhotos,
    fetchCollections,
    createCollection,
    updateCollection,
    deleteCollection,
    reorderCollections,
    fetchSiteSettings,
    saveSiteSettings,
    signInWithEmail,
    signOutAdmin,
    getCurrentSession,
    onAuthStateChange,
  };
})();
