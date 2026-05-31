(function () {
  'use strict';

  // Shared helpers

  function thumbUrl(src) {
    return src.replace(/_[a-z]\.jpg$/i, '_m.jpg');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function escapeAttr(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;');
  }

  function formatFlickrDate(value) {
    if (!value) return '';
    const date = new Date(String(value).replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  // Metadata rendering

  function getPhotoMetadata(photo) {
    const flickr = typeof FLICKR_METADATA !== 'undefined' ? FLICKR_METADATA[photo.id] || {} : {};
    const camera = typeof FLICKR_CAMERA_METADATA !== 'undefined' ? FLICKR_CAMERA_METADATA[photo.id] || {} : {};
    return Object.assign({}, flickr, camera);
  }

  function buildMetadataRows(photo) {
    const metadata = getPhotoMetadata(photo);
    const dimensions = metadata.width && metadata.height ? metadata.width + ' x ' + metadata.height : '';
    const rows = [
      ['Camera', metadata.camera],
      ['Lens', metadata.lens],
      ['Shutter', metadata.shutter],
      ['Aperture', metadata.aperture],
      ['ISO', metadata.iso],
      ['Focal length', metadata.focalLength],
      ['Mode', metadata.exposureMode],
      ['Metering', metadata.meteringMode],
      ['White balance', metadata.whiteBalance],
      ['Flash', metadata.flash],
      ['Flickr title', metadata.title],
      ['Date taken', formatFlickrDate(metadata.dateTaken)],
      ['Dimensions', dimensions],
      ['Flickr ID', metadata.flickrId]
    ].filter(function (row) {
      return row[1];
    });

    if (!rows.length) {
      return '<p class="admin-photo-metadata-empty">No Flickr metadata saved for this photo.</p>';
    }

    return rows.map(function (row) {
      return '<div class="admin-photo-metadata-row">' +
        '<span>' + escapeHtml(row[0]) + '</span>' +
        '<strong>' + escapeHtml(row[1]) + '</strong>' +
      '</div>';
    }).join('');
  }

  // Card rendering and filters

  function buildProjectFilter() {
    const select = document.getElementById('filterProject');
    if (!select || typeof GALLERY_IMAGES === 'undefined') return;

    const projects = [...new Set(GALLERY_IMAGES.map(function (photo) { return photo.project || ''; }))].sort();
    projects.forEach(function (project) {
      const option = document.createElement('option');
      option.value = project;
      option.textContent = project || '(No project)';
      select.appendChild(option);
    });
  }

  function buildBadges(photo) {
    const badges = [];
    if (photo.is_featured) {
      badges.push('<span class="admin-badge admin-badge--featured">Featured</span>');
    }
    if (photo.project) {
      badges.push('<span class="admin-badge admin-badge--project">' + escapeHtml(photo.project) + '</span>');
    }
    return badges.join('');
  }

  function renderCards() {
    const grid = document.getElementById('adminGrid');
    if (!grid) return;

    if (typeof GALLERY_IMAGES === 'undefined' || !GALLERY_IMAGES.length) {
      grid.innerHTML =
        '<p class="admin-empty">Photo data not loaded — check that ' +
        '<code>photo-data.js</code> is present and contains a valid ' +
        '<code>GALLERY_IMAGES</code> array.</p>';
      updateCount();
      return;
    }

    GALLERY_IMAGES.forEach(function (photo) {
      const article = document.createElement('article');
      article.className = 'admin-card';
      article.dataset.id = photo.id;
      article.dataset.project = photo.project || '';
      article.dataset.featured = photo.is_featured ? 'true' : 'false';

      const thumb = thumbUrl(photo.src);

      article.innerHTML =
        '<div class="admin-card-id">' +
          '<div class="admin-id-main">' +
            '<span class="admin-id-label">Photo</span>' +
            '<span class="admin-id-number">#' + photo.id + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="admin-card-thumb">' +
          '<img src="' + thumb + '" alt="' + escapeAttr(photo.alt) + '" loading="lazy" data-full="' + escapeAttr(photo.src) + '" data-loading="true">' +
          '<button class="admin-metadata-toggle" type="button" aria-expanded="false" aria-label="Show metadata for photo #' + photo.id + '" data-photo-id="' + photo.id + '">i</button>' +
        '</div>' +
        '<div class="admin-card-meta">' +
          '<div class="admin-photo-metadata" id="adminMetadata' + photo.id + '" hidden>' + buildMetadataRows(photo) + '</div>' +
          '<p class="admin-meta-alt">' + escapeHtml(photo.alt) + '</p>' +
          '<div class="admin-badges">' + buildBadges(photo) + '</div>' +
          (photo.species ? '<p class="admin-meta-species">' + escapeHtml(photo.species) + '</p>' : '') +
          '<div class="admin-meta-url">' +
            '<code class="admin-url-text">' + escapeHtml(photo.src) + '</code>' +
            '<button class="admin-copy-btn" type="button" data-url="' + escapeAttr(photo.src) + '">Copy URL</button>' +
          '</div>' +
        '</div>';

      const img = article.querySelector('.admin-card-thumb img');
      img.addEventListener('load', function () {
        this.removeAttribute('data-loading');
      });
      img.addEventListener('error', function () {
        this.src = photo.src;
        this.removeAttribute('data-loading');
        this.onerror = null;
      });

      grid.appendChild(article);
    });

    updateCount();
  }

  function applyFilters() {
    const projectFilter = document.getElementById('filterProject').value;
    const featuredFilter = document.getElementById('filterFeatured').value;

    document.querySelectorAll('.admin-card').forEach(function (card) {
      const matchProject = projectFilter === 'all' || card.dataset.project === projectFilter;
      const matchFeatured = featuredFilter === 'all' || card.dataset.featured === featuredFilter;
      card.hidden = !(matchProject && matchFeatured);
    });
    updateCount();
  }

  function updateCount() {
    const total = document.querySelectorAll('.admin-card').length;
    const visible = document.querySelectorAll('.admin-card:not([hidden])').length;
    const el = document.getElementById('adminCount');
    if (el) el.textContent = 'Showing ' + visible + ' of ' + total + ' photos';
  }

  // Interactions

  function flashCopied(btn) {
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(function () { btn.textContent = originalText; }, 1500);
  }

  function copyTextFallback(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }

  document.addEventListener('click', function (event) {
    const metadataBtn = event.target.closest('.admin-metadata-toggle');
    if (metadataBtn) {
      const card = metadataBtn.closest('.admin-card');
      const panel = card ? card.querySelector('.admin-photo-metadata') : null;
      if (!panel) return;
      const willOpen = panel.hidden;
      panel.hidden = !willOpen;
      metadataBtn.setAttribute('aria-expanded', String(willOpen));
      metadataBtn.setAttribute('aria-label', (willOpen ? 'Hide' : 'Show') + ' metadata for photo #' + metadataBtn.dataset.photoId);
      return;
    }

    const copyBtn = event.target.closest('.admin-copy-btn');
    if (!copyBtn) return;
    const url = copyBtn.dataset.url;
    if (!url) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        flashCopied(copyBtn);
      });
      return;
    }

    // Older browsers need a temporary textarea for clipboard copy.
    copyTextFallback(url);
    flashCopied(copyBtn);
  });

  // Initialization

  const filterProject = document.getElementById('filterProject');
  const filterFeatured = document.getElementById('filterFeatured');
  if (filterProject) filterProject.addEventListener('change', applyFilters);
  if (filterFeatured) filterFeatured.addEventListener('change', applyFilters);

  buildProjectFilter();
  renderCards();
}());
