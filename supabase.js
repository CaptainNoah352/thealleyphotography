(function initSupabaseHelpers() {
  const categories = ["wildlife", "landscape", "portrait", "street"];
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
    hasValidSupabaseConfig,
    getSupabaseClient,
    fetchPublishedPhotos,
    fetchAllPhotosForAdmin,
    createPhoto,
    updatePhoto,
    deletePhoto,
    signInWithEmail,
    signOutAdmin,
    getCurrentSession,
    onAuthStateChange,
  };
})();
