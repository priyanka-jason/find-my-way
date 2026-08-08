const PANEL_ID = 'find-my-way-panel';

function getPanel() {
    return document.getElementById(PANEL_ID);
}

function ensurePanel() {
    let panel = getPanel();
    if (panel) {
        return panel;
    }

    panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.className = 'find-my-way-overlay';
    panel.setAttribute('role', 'status');
    panel.setAttribute('aria-live', 'polite');
    panel.innerHTML = [
        '<div class="find-my-way-overlay__title">Find my Way</div>',
        '<div class="find-my-way-overlay__message">Ready to plan your route.</div>'
    ].join('');

    document.body.appendChild(panel);
    return panel;
}

function updatePanel(message) {
    const panel = ensurePanel();
    const body = panel.querySelector('.find-my-way-overlay__message');
    if (body) {
        body.textContent = message;
    }
    panel.classList.add('is-visible');
}

function hidePanel() {
    const panel = getPanel();
    if (panel) {
        panel.classList.remove('is-visible');
    }
}

function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function isLikelyLocation(value) {
    const text = normalizeText(value);
    if (!text || text.length < 2) {
        return false;
    }

    if (/^(search|directions|route|maps|add destination|starting point|choose destination|enter destination)$/i.test(text)) {
        return false;
    }

    if (/^\d+(?:\.\d+)?$/i.test(text)) {
        return false;
    }

    return true;
}

function collectLocationsFromUrl() {
    const href = window.location.href;
    const locations = [];
    const pathMatch = href.match(/\/dir\/([^?#]+)/i);

    if (pathMatch) {
        const raw = decodeURIComponent(pathMatch[1]).replace(/\+/g, ' ');
        const segments = raw.split('/').map(normalizeText).filter(Boolean);
        segments.forEach(function (segment) {
            if (isLikelyLocation(segment)) {
                locations.push(segment);
            }
        });
    }

    const searchParams = new URLSearchParams(window.location.search);
    ['origin', 'destination', 'daddr', 'saddr', 'waypoints'].forEach(function (key) {
        const rawValue = searchParams.get(key);
        if (!rawValue) {
            return;
        }

        const decoded = decodeURIComponent(rawValue).replace(/\+/g, ' ');
        const parts = decoded.split('|').map(normalizeText).filter(Boolean);
        parts.forEach(function (part) {
            if (isLikelyLocation(part)) {
                locations.push(part);
            }
        });
    });

    return locations;
}

function collectLocationsFromDom() {
    const locations = [];
    const seen = new Set();
    const elements = Array.from(document.querySelectorAll('input, textarea, [role="button"], [data-value]'));

    elements.forEach(function (element) {
        const candidate = normalizeText(
            element.value ||
            element.getAttribute('aria-label') ||
            element.getAttribute('placeholder') ||
            element.getAttribute('data-value') ||
            element.textContent
        );

        if (!isLikelyLocation(candidate)) {
            return;
        }

        const key = candidate.toLowerCase();
        if (seen.has(key)) {
            return;
        }

        seen.add(key);
        locations.push(candidate);
    });

    return locations;
}

function collectWaypointLocations(numberDestinations) {
    const urlLocations = collectLocationsFromUrl();
    const domLocations = collectLocationsFromDom();
    const orderedLocations = [];
    const seen = new Set();

    [...urlLocations, ...domLocations].forEach(function (location) {
        const key = location.toLowerCase();
        if (seen.has(key)) {
            return;
        }

        seen.add(key);
        orderedLocations.push(location);
    });

    return orderedLocations.slice(0, Number(numberDestinations) || orderedLocations.length);
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message?.action === 'setWaypointPlan') {
        const numberDestinations = Number.parseInt(message.numberDestinations, 10);
        if (!Number.isInteger(numberDestinations) || numberDestinations < 3 || numberDestinations > 20) {
            sendResponse({ success: false, error: 'Invalid destination count.' });
            return true;
        }

        const locations = collectWaypointLocations(numberDestinations);
        const options = [
            `Plan for ${numberDestinations} destinations`,
            message.fixedStart ? 'fixed start enabled' : 'fixed start disabled',
            message.fixedEnd ? 'fixed end enabled' : 'fixed end disabled'
        ].join(' • ');

        updatePanel(options);

        const plan = {
            numberDestinations,
            fixedStart: Boolean(message.fixedStart),
            fixedEnd: Boolean(message.fixedEnd),
            locations,
            collectedCount: locations.length
        };

        console.log('[FindMyWay] Route plan request', plan);
        console.log('[FindMyWay] Collected locations', locations);

        sendResponse({
            success: locations.length > 0,
            numberDestinations,
            fixedStart: Boolean(message.fixedStart),
            fixedEnd: Boolean(message.fixedEnd),
            plan,
            error: locations.length > 0 ? null : 'No route locations were found on the Google Maps page. Please make sure the route panel is visible and try again.'
        });
        return true;
    }

    if (message?.action === 'clearWaypointPlan') {
        hidePanel();
        sendResponse({ success: true });
        return true;
    }

    return false;
});

window.addEventListener('DOMContentLoaded', function () {
    ensurePanel();
});