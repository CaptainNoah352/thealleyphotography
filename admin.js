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

  function getLocationName(slug) {
    if (!slug) return 'Unassigned';
    if (typeof LOCATIONS_DATA === 'undefined') return slug;
    const location = LOCATIONS_DATA.find(function (item) {
      return item.slug === slug;
    });
    return location ? location.name : slug;
  }

  function getFlickrUrl(photo) {
    const metadata = typeof FLICKR_METADATA !== 'undefined' ? FLICKR_METADATA[photo.id] || {} : {};
    if (metadata.flickrId) {
      return 'https://www.flickr.com/photos/204244048@N05/' + metadata.flickrId + '/';
    }
    const match = String(photo.src || '').match(/\/65535\/(\d+)_/);
    return match ? 'https://www.flickr.com/photos/204244048@N05/' + match[1] + '/' : '';
  }

  function buildCodexPrompt(photo) {
    return 'Update photo #' + photo.id + ': ';
  }

  const selectedPhotoIds = new Set();

  function getProjectOptions() {
    if (typeof GALLERY_IMAGES === 'undefined') return ['herons'];
    return [...new Set(GALLERY_IMAGES.map(function (photo) { return photo.project || ''; }))].sort();
  }

  function getLocationOptions() {
    if (typeof GALLERY_IMAGES === 'undefined') return [''];
    return [...new Set(GALLERY_IMAGES.map(function (photo) { return photo.location || ''; }))].sort();
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

  function buildLocationFilter() {
    const select = document.getElementById('filterLocation');
    if (!select || typeof GALLERY_IMAGES === 'undefined') return;

    const locations = getLocationOptions();
    locations.forEach(function (location) {
      const option = document.createElement('option');
      option.value = location;
      option.textContent = getLocationName(location);
      select.appendChild(option);
    });
  }

  function buildBadges(photo) {
    const badges = [];
    badges.push('<span class="admin-badge admin-badge--location">' + escapeHtml(getLocationName(photo.location)) + '</span>');
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
      article.dataset.location = photo.location || '';
      article.dataset.featured = photo.is_featured ? 'true' : 'false';

      const thumb = thumbUrl(photo.src);
      const flickrUrl = getFlickrUrl(photo);
      const codexPrompt = buildCodexPrompt(photo);

      article.innerHTML =
        '<div class="admin-card-id">' +
          '<div class="admin-id-main">' +
            '<span class="admin-id-label">Photo</span>' +
            '<span class="admin-id-number">#' + photo.id + '</span>' +
          '</div>' +
          '<button class="admin-copy-btn admin-copy-btn--header" type="button" data-copy-text="' + escapeAttr(String(photo.id)) + '">Copy #</button>' +
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
          '<dl class="admin-details">' +
            '<div><dt>ID</dt><dd>#' + photo.id + '</dd></div>' +
            '<div><dt>Location</dt><dd>' + escapeHtml(getLocationName(photo.location)) + '</dd></div>' +
            '<div><dt>Project</dt><dd>' + escapeHtml(photo.project || 'None') + '</dd></div>' +
            '<div><dt>Featured</dt><dd>' + (photo.is_featured ? 'Yes' : 'No') + '</dd></div>' +
          '</dl>' +
          '<div class="admin-copy-actions">' +
            '<button class="admin-copy-btn admin-add-prompt-btn" type="button" data-photo-id="' + photo.id + '">Add to prompt</button>' +
            '<button class="admin-copy-btn" type="button" data-copy-text="' + escapeAttr(String(photo.id)) + '">Copy #</button>' +
            '<button class="admin-copy-btn" type="button" data-copy-text="' + escapeAttr(codexPrompt) + '">Copy prompt</button>' +
            (flickrUrl ? '<button class="admin-copy-btn" type="button" data-copy-text="' + escapeAttr(flickrUrl) + '">Copy Flickr</button>' : '') +
          '</div>' +
          '<div class="admin-meta-url">' +
            '<code class="admin-url-text">' + escapeHtml(photo.src) + '</code>' +
            '<button class="admin-copy-btn" type="button" data-copy-text="' + escapeAttr(photo.src) + '">Copy image URL</button>' +
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
    const locationFilter = document.getElementById('filterLocation').value;
    const featuredFilter = document.getElementById('filterFeatured').value;

    document.querySelectorAll('.admin-card').forEach(function (card) {
      const matchProject = projectFilter === 'all' || card.dataset.project === projectFilter;
      const matchLocation = locationFilter === 'all' || card.dataset.location === locationFilter;
      const matchFeatured = featuredFilter === 'all' || card.dataset.featured === featuredFilter;
      card.hidden = !(matchProject && matchLocation && matchFeatured);
    });
    updateCount();
  }

  function updateCount() {
    const total = document.querySelectorAll('.admin-card').length;
    const visible = document.querySelectorAll('.admin-card:not([hidden])').length;
    const el = document.getElementById('adminCount');
    if (el) el.textContent = 'Showing ' + visible + ' of ' + total + ' photos';
  }

  // Prompt builder

  function setPromptValueOptions() {
    const action = document.getElementById('promptAction');
    const value = document.getElementById('promptValue');
    if (!action || !value) return;

    let options = [];
    if (action.value === 'project') {
      options = getProjectOptions().map(function (project) {
        return { value: project, label: project || 'No project' };
      });
    } else if (action.value === 'location') {
      options = getLocationOptions().map(function (location) {
        return { value: location, label: getLocationName(location) };
      });
    } else {
      options = [
        { value: 'true', label: 'Featured' },
        { value: 'false', label: 'Not featured' }
      ];
    }

    value.innerHTML = options.map(function (option) {
      return '<option value="' + escapeAttr(option.value) + '">' + escapeHtml(option.label) + '</option>';
    }).join('');
  }

  function selectedIdsText() {
    return Array.from(selectedPhotoIds)
      .sort(function (a, b) { return Number(a) - Number(b); })
      .map(function (id) { return '#' + id; })
      .join(', ');
  }

  function buildGroupPrompt() {
    const action = document.getElementById('promptAction');
    const value = document.getElementById('promptValue');
    if (!action || !value || !selectedPhotoIds.size) return '';

    const ids = selectedIdsText();
    if (action.value === 'project') {
      return 'Update photos ' + ids + ': set project to ' + (value.value || 'none') + '.';
    }
    if (action.value === 'location') {
      return 'Update photos ' + ids + ': set location to ' + getLocationName(value.value) + '.';
    }
    return 'Update photos ' + ids + ': set featured to ' + (value.value === 'true' ? 'true' : 'false') + '.';
  }

  function updatePromptPanel() {
    const count = document.getElementById('promptCount');
    const text = document.getElementById('promptText');
    if (count) count.textContent = selectedPhotoIds.size + ' selected';
    if (text) text.value = buildGroupPrompt();

    document.querySelectorAll('.admin-card').forEach(function (card) {
      const isSelected = selectedPhotoIds.has(card.dataset.id);
      card.dataset.selected = isSelected ? 'true' : 'false';
      const button = card.querySelector('.admin-add-prompt-btn');
      if (button) button.textContent = isSelected ? 'Remove from prompt' : 'Add to prompt';
    });
  }

  function togglePromptPhoto(photoId) {
    if (selectedPhotoIds.has(photoId)) {
      selectedPhotoIds.delete(photoId);
    } else {
      selectedPhotoIds.add(photoId);
    }
    updatePromptPanel();
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

    const addPromptBtn = event.target.closest('.admin-add-prompt-btn');
    if (addPromptBtn) {
      togglePromptPhoto(addPromptBtn.dataset.photoId);
      return;
    }

    const copyBtn = event.target.closest('.admin-copy-btn');
    if (!copyBtn) return;
    const text = copyBtn.dataset.copyText;
    if (!text) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        flashCopied(copyBtn);
      }).catch(function () {
        copyTextFallback(text);
        flashCopied(copyBtn);
      });
      return;
    }

    // Older browsers need a temporary textarea for clipboard copy.
    copyTextFallback(text);
    flashCopied(copyBtn);
  });

  // Initialization

  const filterProject = document.getElementById('filterProject');
  const filterLocation = document.getElementById('filterLocation');
  const filterFeatured = document.getElementById('filterFeatured');
  const promptAction = document.getElementById('promptAction');
  const promptValue = document.getElementById('promptValue');
  const copyPromptGroup = document.getElementById('copyPromptGroup');
  const clearPromptGroup = document.getElementById('clearPromptGroup');
  if (filterProject) filterProject.addEventListener('change', applyFilters);
  if (filterLocation) filterLocation.addEventListener('change', applyFilters);
  if (filterFeatured) filterFeatured.addEventListener('change', applyFilters);
  if (promptAction) {
    promptAction.addEventListener('change', function () {
      setPromptValueOptions();
      updatePromptPanel();
    });
  }
  if (promptValue) promptValue.addEventListener('change', updatePromptPanel);
  if (copyPromptGroup) {
    copyPromptGroup.addEventListener('click', function () {
      const text = document.getElementById('promptText');
      if (!text || !text.value) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text.value).then(function () {
          flashCopied(copyPromptGroup);
        }).catch(function () {
          copyTextFallback(text.value);
          flashCopied(copyPromptGroup);
        });
        return;
      }
      copyTextFallback(text.value);
      flashCopied(copyPromptGroup);
    });
  }
  if (clearPromptGroup) {
    clearPromptGroup.addEventListener('click', function () {
      selectedPhotoIds.clear();
      updatePromptPanel();
    });
  }

  buildProjectFilter();
  buildLocationFilter();
  setPromptValueOptions();
  renderCards();
  updatePromptPanel();
}());
