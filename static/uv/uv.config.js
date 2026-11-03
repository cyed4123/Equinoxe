self.__uv$config = {
  prefix: "/edu/",
  bare: "/bare/",
  encodeUrl: Ultraviolet.codec.xor.encode,
  decodeUrl: Ultraviolet.codec.xor.decode,
  handler: "/uv/uv.handler.js",
  bundle: "/uv/uv.bundle.js",
  config: "/uv/uv.config.js",
  sw: "/uv/uv.sw.js",
};

// This file is injected into every proxied page, so it is also where the client
// has to patch popups. Ultraviolet rewrites location, history, fetch and element
// attributes, but not window.open(): a popup opened by the proxied site resolves
// its URL against the proxy's own origin (https://your-app/login) and lands on a
// page that does not exist, which looks like the new tab "just does nothing".
(function () {
  // The service worker imports this file too, where there is no DOM.
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (self.__uvOpenHooked) return;

  const config = self.__uv$config;
  if (!config || typeof config.encodeUrl !== "function") return;
  self.__uvOpenHooked = true;

  const nativeOpen = self.open;

  function realBase() {
    try {
      if (self.__uv && self.__uv.meta && self.__uv.meta.url && self.__uv.meta.url.href) {
        return self.__uv.meta.url.href;
      }
    } catch (error) {
      // Fall through to the address bar below.
    }
    return self.location.href;
  }

  function proxify(url) {
    if (typeof url !== "string") return url;

    const trimmed = url.trim();
    if (!trimmed || trimmed === "about:blank") return url;
    // Already a proxied URL.
    if (config.prefix && trimmed.startsWith(config.prefix)) return url;

    let absolute;
    try {
      absolute = new URL(trimmed, realBase());
    } catch (error) {
      return url;
    }

    if (absolute.protocol !== "http:" && absolute.protocol !== "https:") return url;

    return config.prefix + config.encodeUrl(absolute.href);
  }

  self.open = function (url, target, features) {
    if (url === undefined) return nativeOpen.call(self, url, target, features);
    return nativeOpen.call(self, proxify(String(url)), target, features);
  };

  // Links that would open a new tab outside the proxy. UV usually rewrites the
  // href already, in which case proxify() is a no-op and the default runs.
  document.addEventListener(
    "click",
    function (event) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = event.target && event.target.closest ? event.target.closest("a[href]") : null;
      if (!anchor) return;

      const target = anchor.getAttribute("target");
      if (!target || target === "_self") return;

      const href = anchor.href;
      if (!href || typeof href !== "string") return;

      const proxied = proxify(href);
      if (proxied === href) return;

      event.preventDefault();
      nativeOpen.call(self, proxied, target, "noopener");
    },
    true
  );
})();
