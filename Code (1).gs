/**
 * Photo drift: album reader.
 * Deploy this as a web app. The slideshow page you host elsewhere calls it
 * to turn a shared Google Photos album link into a list of photos.
 */

function doGet(e) {
  var p = (e && e.parameter) || {};
  var out;
  try {
    out = p.album ? getAlbum(p.album) : { ok: true, message: 'Photo drift album reader is running.' };
  } catch (err) {
    out = { error: String(err && err.message ? err.message : err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

function getAlbum(url) {
  url = String(url || '').trim();
  if (!/^https:\/\/(photos\.app\.goo\.gl|photos\.google\.com)\//.test(url)) {
    throw new Error('Paste a Google Photos shared album link (it starts with photos.app.goo.gl).');
  }

  var res = UrlFetchApp.fetch(url, {
    followRedirects: true,
    muteHttpExceptions: true,
    headers: {
      'Accept-Language': 'en-US,en;q=0.9',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
    }
  });
  if (res.getResponseCode() !== 200) {
    throw new Error('Google Photos answered with code ' + res.getResponseCode() + '. Make sure the album is shared by link.');
  }

  var html = res.getContentText();

  var title = (html.match(/<meta property="og:title" content="([^"]*)"/) || [])[1] || 'Album';
  title = title.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+·\s+.*$/, '');

  // Every photo in a shared album is served from lh3.googleusercontent.com/pw/<id>.
  var re = /lh3\.googleusercontent\.com\\?\/pw\\?\/([\w-]+)/g;
  var seen = {}, photos = [], m;
  while ((m = re.exec(html))) {
    if (seen[m[1]]) continue;
    seen[m[1]] = true;
    photos.push({ u: 'https://lh3.googleusercontent.com/pw/' + m[1] });
  }

  if (!photos.length) {
    throw new Error('No photos found. The album may not be shared by link, or Google changed its page.');
  }
  return { title: title, photos: photos };
}

/** Run once from the editor to check an album loads. See the Execution log. */
function test() {
  var r = getAlbum('https://photos.app.goo.gl/zG6669fj3GGeZTj17');
  Logger.log(r.title + ': ' + r.photos.length + ' photos found');
}
