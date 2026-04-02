# The Alley Photography Portfolio

Static photography portfolio site built with plain HTML/CSS/JS and deployable on GitHub Pages.

## Current structure

```text
.
├─ index.html             # Homepage (featured gallery + About + Contact)
├─ portfolio.html         # Full portfolio page with category filters
├─ style.css              # Shared public site styling
├─ script.js              # Mobile menu, public gallery rendering, lightbox, filters, homepage content hydration
├─ supabase-config.js     # Place your Supabase URL and anon key here
├─ supabase.js            # Shared Supabase helpers (public fetch + admin auth/CRUD + site settings)
├─ admin.html             # Protected admin interface page
├─ admin.css              # Admin-specific styling
├─ admin.js               # Admin auth, CRUD, drag/drop ordering, Cloudinary upload, site content editor
└─ README.md              # Setup guide
```

## Supabase setup

### 1) Fill in frontend config

Edit `supabase-config.js`:

```js
window.SUPABASE_CONFIG = {
  url: "YOUR_SUPABASE_URL",
  anonKey: "YOUR_SUPABASE_ANON_KEY",
};
```

Use your project URL and **anon public key** only (never service role in frontend).

### 2) Create `photos` table

Run this SQL in Supabase SQL Editor:

```sql
create extension if not exists pgcrypto;

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  title text,
  description text,
  category text not null check (category in ('wildlife', 'landscape', 'portrait', 'street')),
  show_on_home boolean not null default false,
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
```

### 3) Create `site_settings` table

Run this SQL in Supabase SQL Editor:

```sql
create table if not exists public.site_settings (
  setting_key text primary key,
  setting_value text
);
```

This powers editable homepage text for About and Contact. If this table is missing or empty, the site uses built-in defaults from `supabase.js`.

### 4) Enable RLS + policies

```sql
alter table public.photos enable row level security;
alter table public.site_settings enable row level security;

create policy "Public can read published photos"
on public.photos
for select
using (is_published = true);

create policy "Authenticated users can read all photos"
on public.photos
for select
to authenticated
using (true);

create policy "Authenticated users can insert photos"
on public.photos
for insert
to authenticated
with check (true);

create policy "Authenticated users can update photos"
on public.photos
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete photos"
on public.photos
for delete
to authenticated
using (true);

create policy "Public can read site settings"
on public.site_settings
for select
using (true);

create policy "Authenticated users can write site settings"
on public.site_settings
for all
to authenticated
using (true)
with check (true);
```

> For stricter security later, replace generic `authenticated` policies with checks tied to a specific admin user list/role.

### 5) Enable email/password auth

In Supabase Dashboard:

1. Go to **Authentication → Providers → Email**.
2. Enable Email provider.
3. (Recommended) Disable open self-signup after creating your first admin user.

### 6) Create your first admin user

Use one of these:

- **Authentication → Users → Add user** (create confirmed user), or
- temporary sign-up flow from Supabase dashboard tooling.

Then sign in at `/admin.html`.

## Cloudinary unsigned upload setup (admin)

You can upload local files directly from the admin panel without a backend.

1. In Cloudinary, create/select a product environment (your cloud).
2. Go to **Settings → Upload**.
3. Create an **Unsigned upload preset**.
4. In `/admin.html`, enter:
   - **Cloud name**
   - **Unsigned upload preset**
5. Choose a file and click **Upload to Cloudinary**.
6. On success, the returned `secure_url` is inserted into the photo Image URL field and preview updates.

Important:

- Only cloud name + unsigned preset are needed in admin UI.
- **Never** place Cloudinary API secret or other secret keys in frontend files.

## Admin workflow (`/admin.html`)

After login:

- Add photo URL, title, description, category, homepage flag, publish status, and sort order.
- Upload an image file to Cloudinary (unsigned) and auto-fill the image URL.
- Add photo URLs in bulk (one per line).
- Drag and drop rows in the photo table to reorder photos (saves `sort_order` immediately).
- Edit/delete photos.
- Filter admin list by category and search by title.
- Edit About/Contact content fields and click **Save Site Content**.

## How public pages work

- `index.html` fetches published photos where `show_on_home = true`, ordered by `sort_order` ascending then `created_at` descending.
- `portfolio.html` fetches published photos, ordered by `sort_order` ascending then `created_at` descending.
- Homepage About + Contact copy also loads from `site_settings` when available.
- If Supabase is not configured yet, gallery falls back to existing local `galleryImages` in `script.js`.
- If `site_settings` table is missing/unavailable, homepage falls back to the current built-in default copy.

## Deploy with GitHub Pages

No build step needed. Keep using branch/root deploy:

1. Push to GitHub.
2. Go to **Settings → Pages**.
3. Source: **Deploy from a branch**.
4. Select branch and root (`/`).
