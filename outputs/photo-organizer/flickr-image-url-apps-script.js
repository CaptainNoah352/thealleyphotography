/**
 * Returns a live.staticflickr.com thumbnail URL for a Flickr photo page URL.
 *
 * Install in Google Sheets:
 * 1. Open the imported Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Paste this file's contents into Code.gs and save.
 * 4. Return to the sheet. New rows can use =FLICKR_IMAGE_URL(B2).
 */
function FLICKR_IMAGE_URL(input) {
  if (Array.isArray(input)) {
    return input.map(function(row) {
      return row.map(function(value) {
        return flickrImageUrl_(value);
      });
    });
  }
  return flickrImageUrl_(input);
}

function flickrImageUrl_(url) {
  url = String(url || '').trim();
  if (!url) return '';
  if (/live\.staticflickr\.com/.test(url)) {
    return url.replace(/_[a-z]\.jpg$/i, '_m.jpg');
  }
  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var html = response.getContentText();
  var match = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  if (!match) match = html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
  return match ? match[1].replace(/_[a-z]\.jpg$/i, '_m.jpg') : '';
}
