(function initSupabaseHelpers() {
  const categories = ["wildlife", "landscape", "portrait", "street"];
  const defaultSiteSettings = {
    about_intro:
      "A self-taught photographer from Connecticut, now based in Ocala, Florida — finding beauty in stillness, wildlife, and the quiet moments in between.",
    about_paragraph_1:
      "Long before I ever picked up a camera of my own, photography was already part of my life. My grandmother carried her Canon everywhere — on weekend road trips to Maine, on family vacations to Florida, and through the quiet towns of Connecticut where I grew up. I remember one trip to Disney World when she accidentally shattered a lens, and instead of being upset, she laughed about it the whole drive home. That moment stuck with me. The camera was never really about the gear — it was about being present, about noticing things, about holding onto moments that might have otherwise passed by.",
    about_paragraph_2:
      "Growing up in Connecticut, I was surrounded by places that felt like they existed in another time — colonial homes, antique storefronts, weathered wood, and soft light coming through old glass. I didn't think much of it back then, but looking back, that environment shaped the way I see the world. I've always been drawn to moments that feel timeless, the kind that carry a quiet weight without needing to say much.",
    about_pullquote: "\"A photograph can't stop time, but it can make it linger just a little longer.\"",
    about_paragraph_3:
      "Florida was always part of that story too. Those trips with my grandparents stayed with me — the wetlands, the birds, the way the light feels softer and heavier at the same time. It felt different from anything I knew growing up. Now living in Ocala, I find myself surrounded by that same feeling every day. The springs, the wildlife, the stillness in certain places — it all reminds me to slow down and really see what's in front of me.",
    about_paragraph_4:
      "Somewhere along the way, photography became my way of doing that. Not in a perfect or technical sense, but in a personal one. It's how I try to hold onto the way something felt in a moment — the light, the atmosphere, the emotion that's easy to miss if you're not paying attention.",
    about_paragraph_5:
      "I'm still early in this, still learning and figuring things out as I go, but that's part of what draws me to it. Shooting film on my Canon A-1 has taught me patience and intention, while digital gives me the freedom to move with the moment — especially when I'm chasing wildlife or changing light. No matter what I'm using, the goal stays simple: to create something that makes someone pause, even briefly, and feel something real.",
    contact_title: "Let's connect",
    contact_subtitle:
      "Whether you're interested in prints, have a collaboration in mind, or just want to say hello — I'd love to hear from you.",
    contact_email: "hello@brandonalley.photography",
    instagram_url: "https://instagram.com/the.alley.photography",
    instagram_label: "@the.alley.photography",
    flickr_url: "https://www.flickr.com/photos/204244048@N05/",
    location_text: "Ocala, Florida",
    availability_text: "Open for prints & collaborations",
    response_time_text: "Usually within 24-48 hours",
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
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });

    return client;
  }

  function normalizeCategory(value) {
    const lower = (value || "").toString().trim().toLowerCase();
    return categories.includes(lower) ? lower : "wildlife";
  }

  function mapPhotoRow(row) {
    const title = row.title || "";
    const description = row.description || "";
    const altText = title || description || "Portfolio photo";
    const category = normalizeCategory(row.category);

    return {
      id: row.id,
      src: row.image_url,
      image_url: row.image_url,
      title,
      description,
      alt: altText,
      category,
      tags: [category],
      show_on_home: Boolean(row.show_on_home),
      is_published: Boolean(row.is_published),
      sort_order: Number.isFinite(row.sort_order) ? row.sort_order : 0,
      created_at: row.created_at || null,
    };
  }

  async function fetchPublishedPhotos(options = {}) {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) {
      throw new Error("Supabase client is not configured.");
    }

    let query = supabaseClient
      .from("photos")
      .select("id,image_url,title,description,category,show_on_home,is_published,sort_order,created_at")
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (options.showOnHomeOnly) {
      query = query.eq("show_on_home", true);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(mapPhotoRow);
  }

  async function fetchAllPhotosForAdmin() {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) {
      throw new Error("Supabase client is not configured.");
    }

    const { data, error } = await supabaseClient
      .from("photos")
      .select("id,image_url,title,description,category,show_on_home,is_published,sort_order,created_at")
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

  async function deletePhoto(id) {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) throw new Error("Supabase client is not configured.");

    const { error } = await supabaseClient.from("photos").delete().eq("id", id);
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
    if (!supabaseClient) {
      return { ...defaultSiteSettings };
    }

    const { data, error } = await supabaseClient
      .from("site_settings")
      .select("setting_key,setting_value");

    if (error) {
      if (error.code === "42P01") {
        return { ...defaultSiteSettings };
      }
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

    const { error } = await supabaseClient
      .from("site_settings")
      .upsert(rows, { onConflict: "setting_key" });

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

    const result = supabaseClient.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });

    return result?.data?.subscription || null;
  }

  window.photoDataApi = {
    categories,
    defaultSiteSettings,
    hasValidSupabaseConfig,
    getSupabaseClient,
    fetchPublishedPhotos,
    fetchAllPhotosForAdmin,
    createPhoto,
    updatePhoto,
    deletePhoto,
    reorderPhotos,
    fetchSiteSettings,
    saveSiteSettings,
    signInWithEmail,
    signOutAdmin,
    getCurrentSession,
    onAuthStateChange,
  };
})();
