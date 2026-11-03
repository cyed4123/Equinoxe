let tabCount = 1;
let activeTab = 1; // Track the active tab
const originalUrls = {}; // Object to store original URLs for each tab

function createNewTab() {
    tabCount++;

    const tabbar = document.getElementById('tabbar');
    const iframeContainer = document.getElementById('iframe-container');

    const newTab = document.createElement('div');
    newTab.className = 'tabbox';
    newTab.id = 'tabbox';
    newTab.setAttribute('data-tab', tabCount);

    const newtInfo = document.createElement('span');
    newtInfo.textContent = 'New Tab';
    newtInfo.className = 'tab';
    newTab.appendChild(newtInfo);
    newTab.onclick = function () { switchTab(tabCount); };
    tabbar.appendChild(newTab);

    const newIframe = document.createElement('iframe');
    newIframe.style.display = 'none';
    newIframe.style.height = '100%';
    newIframe.style.width = '100%';
    newIframe.style.border = 'none';
    newIframe.src = '/search.html';
    newIframe.setAttribute('data-tab', tabCount);
    newIframe.onload = function () {
        updateTabTitle(tabCount, newIframe);
        updateURLBar(newIframe.src, tabCount);
    };
    iframeContainer.appendChild(newIframe);

    tabbar.style.display = 'flex';

    switchTab(tabCount);
}

function switchTab(tabNumber) {
    console.log(`Switching to tab ${tabNumber}`);
    activeTab = tabNumber; // Update the active tab
    const iframes = document.querySelectorAll('#iframe-container iframe');
    iframes.forEach(iframe => {
        if (iframe.getAttribute('data-tab') == tabNumber) {
            iframe.style.display = 'block';
            updateTabTitle(tabNumber, iframe);
            updateURLBar(iframe.src, tabNumber);
        } else {
            iframe.style.display = 'none';
        }
    });

    const tabs = document.querySelectorAll('.tabbox .tab');
    tabs.forEach(tab => {
        if (tab.parentElement.getAttribute('data-tab') == tabNumber) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
}

function updateURLBar(url, tabNumber) {
    console.log(`Updating URL bar for tab ${tabNumber} with URL: ${url}`);
    let formattedUrl = url;
    if (url.includes('search.html')) {
        formattedUrl = 'eq://search';
    } else if (originalUrls[tabNumber]) {
        formattedUrl = originalUrls[tabNumber];
    }
    document.getElementById('search').value = formattedUrl;
}

function updateTabTitle(tabNumber, iframe) {
    try {
        const title = iframe.contentDocument.title || 'New Tab';
        const tabbox = document.querySelector(`.tabbox[data-tab="${tabNumber}"]`);
        if (tabbox) {
            const tab = tabbox.querySelector('.tab');
            if (tab) {
                tab.textContent = title;
            }
        }

    } catch (error) {
        console.error('Failed to update tab title:', error);
    }
}

// main.js submits the omnibox, so this only decides where the active tab goes.
// It must go through the proxy: setting the iframe to the raw URL loads the site
// straight into the frame, where it refuses to render and bypasses the worker.
function go(searchValue) {
    const activeIframe = document.querySelector(`#iframe-container iframe[data-tab="${activeTab}"]`);
    if (!activeIframe) return;

    const value = (searchValue || '').trim();
    if (!value || value === 'eq://search' || value.includes('search.html')) {
        activeIframe.src = '/search.html';
        return;
    }

    const proxied = proxyUrlFor(value);
    if (!proxied) return;

    originalUrls[activeTab] = value; // Save the original URL

    registerSW().then(worker => {
        if (!worker) {
            alert('This browser is blocking service workers (private window?), which the proxy needs. Try another browser.');
            return;
        }

        activeIframe.src = proxied;
        activeIframe.onload = function () {
            updateURLBar(proxied, activeTab);
            updateTabTitle(activeTab, activeIframe);
        };
    });
}

// `eq://search` is a label for the omnibox only. Setting it as an iframe src
// used to navigate the tab to a URL that cannot load and blank the frame.
function URLCheck() {
    const activeIframe = document.querySelector(`#iframe-container iframe[data-tab="${activeTab}"]`);
    if (!activeIframe) return;

    updateURLBar(activeIframe.src, activeTab);
}

// Run the initial URL check on page load
window.onload = URLCheck;

