if (!self.define) {
  let e,
    i = {};
  const n = (n, s) => (
    (n = new URL(n + ".js", s).href),
    i[n] ||
      new Promise((i) => {
        if ("document" in self) {
          const e = document.createElement("script");
          (e.src = n), (e.onload = i), document.head.appendChild(e);
        } else (e = n), importScripts(n), i();
      }).then(() => {
        let e = i[n];
        if (!e) throw new Error(`Module ${n} didn’t register its module`);
        return e;
      })
  );
  self.define = (s, r) => {
    const o =
      e ||
      ("document" in self ? document.currentScript.src : "") ||
      location.href;
    if (i[o]) return;
    let d = {};
    const t = (e) => n(e, o),
      c = { module: { uri: o }, exports: d, require: t };
    i[o] = Promise.all(s.map((e) => c[e] || t(e))).then((e) => (r(...e), d));
  };
}
define(["./workbox-8c29f6e4"], function (e) {
  "use strict";
  self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        { url: "registerSW.js", revision: "1872c500de691dce40960bb85481de07" },
        { url: "index.html", revision: "99911e555baf56cebbe3fea30ef2d2e7" },
        { url: "assets/index-DPU09_oB.css", revision: null },
        { url: "assets/index-Bl_uu6DK.js", revision: null },
        { url: "favicon.ico", revision: "95c7cd424d9f366d28686a4f89b2deb5" },
        {
          url: "maskable-icon-512x512.png",
          revision: "98f32033002e434a4f8537ccdab4c1b2",
        },
        {
          url: "pwa-192x192.png",
          revision: "d3d9b52e39301f3d0f005e905b0e9406",
        },
        {
          url: "pwa-512x512.png",
          revision: "ac9e109c0b26553498df0024bd601415",
        },
        { url: "pwa-64x64.png", revision: "abadecd8b7d8e4d9cbb5870affe3df3d" },
        {
          url: "manifest.webmanifest",
          revision: "b928a42e1498797c23b92e736606330a",
        },
      ],
      {}
    ),
    e.cleanupOutdatedCaches(),
    e.registerRoute(
      new e.NavigationRoute(e.createHandlerBoundToURL("index.html"))
    );
});

self.addEventListener("push", function (event) {
  if (!event.data) return;

  const data = event.data.json();

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
    })
  );
});
