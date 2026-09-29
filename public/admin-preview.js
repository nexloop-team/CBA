/**
 * Preview pane for /admin -> Projects.
 *
 * Decap's default preview draws every image at full size, so a 3600px photo
 * fills the pane and reads as a zoomed-in crop. This shows the project roughly
 * the way the site does instead: the main image fitted to the pane, then the
 * gallery as a numbered grid, with anything past the 6-image limit marked.
 *
 * Loaded by src/app/admin/route.ts before CMS.init.
 */
(function () {
  var CMS = window.CMS;
  var h = window.h;
  var createClass = window.createClass;
  if (!CMS || !h || !createClass) return;

  var MAX_IMAGES = 6;

  CMS.registerPreviewStyle(
    [
      "body { margin: 0; font: 15px/1.5 system-ui, sans-serif; color: #1a2333; background: #f4f3f0; }",
      ".p { padding: 28px; max-width: 920px; }",
      ".p h1 { font-size: 30px; font-weight: 600; margin: 0 0 6px; }",
      ".meta { margin: 0 0 20px; color: #6b7280; text-transform: uppercase; letter-spacing: .12em; font-size: 11px; }",
      ".label { margin: 26px 0 10px; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #6b7280; }",
      ".hero { display: block; width: 100%; aspect-ratio: 16 / 10; object-fit: cover; border-radius: 6px; background: #ddd; }",
      ".grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }",
      ".grid figure { margin: 0; }",
      ".grid img { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 4px; background: #ddd; }",
      ".grid figcaption { margin-top: 4px; font-size: 12px; color: #6b7280; }",
      ".grid .off img { opacity: .35; }",
      ".grid .off figcaption { color: #b42318; }",
      ".summary { font-size: 18px; margin: 20px 0 0; }",
      ".body { margin-top: 16px; }",
      ".empty { padding: 40px; text-align: center; border: 1px dashed #c4c8cf; border-radius: 6px; color: #6b7280; }",
    ].join("\n"),
    { raw: true },
  );

  var ProjectPreview = createClass({
    render: function () {
      var entry = this.props.entry;
      var getAsset = this.props.getAsset;
      var get = function (key) {
        return entry.getIn(["data", key]);
      };
      var src = function (path) {
        var asset = path ? getAsset(path) : null;
        return asset ? asset.toString() : "";
      };

      var hero = get("hero");
      var galleryList = get("gallery");
      var gallery = galleryList && galleryList.toJS ? galleryList.toJS() : [];
      // The main image counts towards the limit.
      var limit = get("allImages") ? Infinity : MAX_IMAGES - 1;
      var status = get("status") === "ongoing" ? "In progress" : "Completed";
      var meta = [get("category"), status, get("location")].filter(Boolean).join("  ·  ");

      return h(
        "div",
        { className: "p" },
        h("h1", {}, get("title") || "Untitled project"),
        h("p", { className: "meta" }, meta),
        hero
          ? h("img", { className: "hero", src: src(hero), alt: "" })
          : h("div", { className: "empty" }, "No main image yet"),
        get("summary") ? h("p", { className: "summary" }, get("summary")) : null,
        h("p", { className: "label" }, "Gallery (" + gallery.length + ")"),
        gallery.length
          ? h(
              "div",
              { className: "grid" },
              gallery.map(function (path, i) {
                var off = i >= limit;
                return h(
                  "figure",
                  { key: i, className: off ? "off" : "" },
                  h("img", { src: src(path), alt: "" }),
                  h("figcaption", {}, i + 2 + (off ? " - not shown (6-image limit)" : "")),
                );
              }),
            )
          : h("div", { className: "empty" }, "No gallery images"),
        h("div", { className: "body" }, this.props.widgetFor("body")),
      );
    },
  });

  CMS.registerPreviewTemplate("projects", ProjectPreview);
})();
