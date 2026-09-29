/**
 * Keeps photo uploads from /admin under Vercel's 4.5 MB request limit.
 *
 * On the live site every save goes through /api/github, a Vercel function, and
 * Decap sends each new file as base64 JSON - about a third larger than the
 * file. A typical phone or render JPEG is bigger than the limit, so large
 * images are scaled to at most 3600px (still more than the site's largest
 * 3200px size) and re-encoded as high-quality JPEG before they are sent.
 * Small files and anything that is not an image pass through untouched.
 *
 * Loaded by src/app/admin/route.ts. Does nothing on localhost, where saving
 * goes to decap-server with no size limit.
 */
(function () {
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;

  var LIMIT = 3800000; // base64 characters, leaving room for the JSON around it
  var MAX_SIDE = 3600;
  var nativeFetch = window.fetch.bind(window);

  function toBase64(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve(String(reader.result).split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function fromBase64(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes]);
  }

  async function shrink(b64) {
    var bitmap;
    try {
      bitmap = await createImageBitmap(fromBase64(b64));
    } catch {
      return null; // not an image
    }
    var scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    var canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    for (var quality = 0.92; quality >= 0.6; quality -= 0.06) {
      var blob = await new Promise(function (resolve) {
        canvas.toBlob(resolve, "image/jpeg", quality);
      });
      var out = await toBase64(blob);
      if (out.length <= LIMIT) return out;
    }
    return null;
  }

  window.fetch = async function (input, init) {
    var url = typeof input === "string" ? input : input && input.url;
    var method = ((init && init.method) || "GET").toUpperCase();
    if (
      method === "POST" &&
      url &&
      url.indexOf("/api/github/") !== -1 &&
      url.indexOf("/git/blobs") !== -1 &&
      init &&
      typeof init.body === "string" &&
      init.body.length > LIMIT
    ) {
      try {
        var body = JSON.parse(init.body);
        if (body.encoding === "base64" && body.content) {
          var smaller = await shrink(body.content);
          if (smaller) {
            body.content = smaller;
            init = Object.assign({}, init, { body: JSON.stringify(body) });
          } else {
            alert(
              "This file is too large to upload here (over about 3 MB). Please use a smaller image.",
            );
          }
        }
      } catch {
        // Leave the request as it was.
      }
    }
    return nativeFetch(input, init);
  };
})();
