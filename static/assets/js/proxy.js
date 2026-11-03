const msg = document.getElementById("m");
const frame = document.getElementById("ifr");
const loadingScreen = document.getElementById("loadingScreen");

function searchEngineUrl(query) {
    const q = encodeURIComponent(query);
    switch (localStorage.getItem("equinox||search")) {
        case "ddg":
            return `https://duckduckgo.com/?q=${q}`;
        case "brave":
            return `https://search.brave.com/search?q=${q}`;
        case "yahoo":
            return `https://search.yahoo.com/search?p=${q}`;
        default:
        case "google":
            return `https://www.google.com/search?q=${q}`;
    }
}

// Turn whatever the user typed into a URL the service worker can serve.
function proxyUrlFor(input) {
    const value = (input || "").trim();
    if (!value) return null;

    if (isUrl(value)) {
        const url = /^https?:\/\//i.test(value) ? value : "https://" + value;
        return resolveURL(url);
    }

    return resolveURL(searchEngineUrl(value));
}

function searchurl(url) {
    proxy(searchEngineUrl(url));
}

function go(url) {
    if (!isUrl(url)) searchurl(url);
    else {
        if (!(url.startsWith("https://") || url.startsWith("http://"))) url = "http://" + url;
        proxy(url);
    }
}

function isUrl(val = "") {
    if (/^http(s?):\/\//.test(val) || val.includes(".") && val.substr(0, 1) !== " ") return true;
    return false;
}

function resolveURL(url) {
    switch (localStorage.getItem("equinox||proxy")) {
        case "dy":
            return "/study/" + Ultraviolet.codec.xor.decode(url);
        default:
        case "uv":
            return __uv$config.prefix + __uv$config.encodeUrl(url);
    }
}

function proxy(url) {
    registerSW().then(worker => {
        if (!worker) {
            msg.innerHTML = "Error: Your browser does not support service workers or is blocking them (private browsing mode?), try using a different browser";
            return;
        }

        frame.src = resolveURL(url);
    });
}
