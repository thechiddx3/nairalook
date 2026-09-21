// content.js

const currencySymbols = {
    '$': 'USD', 'USD': 'USD',
    '€': 'EUR', 'EUR': 'EUR',
    '£': 'GBP', 'GBP': 'GBP'
};

const regexPattern = /([$€£]|USD|EUR|GBP)\s*([\d,]+(?:\.\d+)?\s*[km]?)|([\d,]+(?:\.\d+)?\s*[km]?)\s*([$€£]|USD|EUR|GBP)/gi;

let extensionRates = {};
let currentRateType = 'parallel';

function init() {
    chrome.runtime.sendMessage({ type: 'GET_RATES' }, (response) => {
        if (response) {
            extensionRates = response.rates;
            currentRateType = response.rateType;
            scanDocument();
            createTooltipElement();
            observeDOM();
        }
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.rateType) {
            currentRateType = changes.rateType.newValue;
        }
    });
}

function createTooltipElement() {
    let tooltip = document.getElementById('nairalook-fx-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'nairalook-fx-tooltip';
        tooltip.style.display = 'none';
        document.body.appendChild(tooltip);
    }

    document.addEventListener('mouseover', (e) => {
        if (e.target.classList.contains('nairalook-trigger')) {
            const currency = e.target.getAttribute('data-currency').toUpperCase();
            const amountRaw = e.target.getAttribute('data-amount');

            let multiplier = 1;
            if (/k/i.test(amountRaw)) multiplier = 1000;
            if (/m/i.test(amountRaw)) multiplier = 1000000;

            const amountStr = amountRaw.replace(/,/g, '').replace(/[km\s]/gi, '');
            const amount = parseFloat(amountStr) * multiplier;

            const standardCurrency = currencySymbols[currency] || currency;
            const rate = extensionRates[currentRateType][standardCurrency];

            if (rate && !isNaN(amount)) {
                const ngnValue = (amount * rate).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' });
                tooltip.innerHTML = `<strong>${ngnValue}</strong> <span class="nl-rate-type">(${currentRateType === 'parallel' ? 'Parallel' : 'I&E'} Rate)</span>`;
                tooltip.style.display = 'block';

                const rect = e.target.getBoundingClientRect();
                tooltip.style.top = (rect.bottom + window.scrollY + 5) + 'px';
                tooltip.style.left = (rect.left + window.scrollX) + 'px';
            }
        }
    });

    document.addEventListener('mouseout', (e) => {
        if (e.target.classList.contains('nairalook-trigger')) {
            tooltip.style.display = 'none';
        }
    });
}

function processTextNode(node) {
    const text = node.nodeValue;
    if (!text) return;

    const matches = [...text.matchAll(regexPattern)];
    if (matches.length === 0) return;

    const parent = node.parentNode;

    // Create a document fragment to hold the new spans and text
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;

    matches.forEach(match => {
        const fullMatch = match[0];
        const matchIndex = match.index;

        // Currency before amount
        let currency = match[1];
        let amount = match[2];

        // Amount before currency
        if (!currency) {
            amount = match[3];
            currency = match[4];
        }

        if (!currency || !amount) return;

        // Text before the match
        if (matchIndex > lastIndex) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex, matchIndex)));
        }

        // Creating the wrapped span for the tooltip trigger
        const span = document.createElement('span');
        span.className = 'nairalook-trigger';
        span.setAttribute('data-currency', currency);
        span.setAttribute('data-amount', amount);
        span.textContent = fullMatch;

        fragment.appendChild(span);
        lastIndex = matchIndex + fullMatch.length;
    });

    // Remaining text
    if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    parent.replaceChild(fragment, node);
}

function walkDOM(node) {
    if (
        node.nodeType === 1 &&
        ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT'].includes(node.nodeName)
    ) {
        return;
    }

    // If it's a text node and not empty
    if (node.nodeType === 3 && node.nodeValue.trim() !== '') {
        if (node.parentNode && !node.parentNode.classList.contains('nairalook-trigger')) {
            processTextNode(node);
        }
        return;
    }

    // Recursively process children
    let child = node.firstChild;
    while (child) {
        let next = child.nextSibling; // save next before modifying DOM
        walkDOM(child);
        child = next;
    }
}

function scanDocument() {
    walkDOM(document.body);
}

function observeDOM() {
    const observer = new MutationObserver((mutations) => {
        for (let mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.id !== 'nairalook-fx-tooltip' && !node.classList?.contains('nairalook-trigger')) {
                        walkDOM(node);
                    } else if (node.nodeType === 3) {
                        if (node.parentNode && !node.parentNode.classList?.contains('nairalook-trigger')) {
                            processTextNode(node);
                        }
                    }
                });
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// Ensure the code runs after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
