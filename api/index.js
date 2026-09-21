require('dotenv').config();
const express = require('express');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'default-nairalook-key';
const ALLOWED_EXTENSION_ID = process.env.ALLOWED_EXTENSION_ID || '';

const corsOptions = {
    origin: function (origin, callback) {
        // If an extension ID is configured, strictly enforce requests come from it
        if (ALLOWED_EXTENSION_ID) {
            const allowedOrigin = `chrome-extension://${ALLOWED_EXTENSION_ID}`;
            if (origin === allowedOrigin) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS. Invalid Chrome Extension ID.'));
            }
        } else {
            // If no ID configured, allow anything (for local testing)
            callback(null, true);
        }
    }
};

app.use(cors(corsOptions));
app.use(express.json());

// Middleware to check API Key
const requireApiKey = (req, res, next) => {
    const key = req.headers['x-api-key'] || req.query.api_key;
    if (!key || key !== API_KEY) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or missing API Key' });
    }
    next();
};

let cachedRates = null;
let lastFetchTime = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes cache

async function fetchRatesFromNairaToday() {
    try {
        const response = await fetch('https://api.codetabs.com/v1/proxy/?quest=https://nairatoday.com/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status} - ${response.statusText}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        const rates = {
            parallel: {},
            ie_window: {}
        };

        // Grab all rate cards
        $('.currency-card').each((i, element) => {
            const card = $(element);
            const nameText = card.find('.cc-name').text().trim();
            const m = nameText.match(/\(([A-Z]{3})\)/);

            if (m) {
                const currency = m[1];

                // Parallel sell rate
                const sellText = card.find('.cc-sell').text().trim();
                const sellMatch = sellText.match(/([\d,.]+)/);
                if (sellMatch) {
                    rates.parallel[currency] = parseFloat(sellMatch[1].replace(/,/g, ''));
                }

                // Official CBN rate
                const cbnText = card.find('.cc-cbn').text().trim();
                const cbnMatch = cbnText.match(/([\d,.]+)/);
                if (cbnMatch) {
                    rates.ie_window[currency] = parseFloat(cbnMatch[1].replace(/,/g, ''));
                }
            }
        });

        return rates;
    } catch (error) {
        console.error('Error fetching rates:', error);
        throw error;
    }
}

app.get('/api/rates', requireApiKey, async (req, res) => {
    try {
        const now = Date.now();
        if (cachedRates && lastFetchTime && (now - lastFetchTime < CACHE_TTL)) {
            return res.json({
                success: true,
                source: 'cache',
                lastUpdated: lastFetchTime,
                rates: cachedRates
            });
        }

        const rates = await fetchRatesFromNairaToday();

        cachedRates = rates;
        lastFetchTime = now;

        res.json({
            success: true,
            source: 'live',
            lastUpdated: lastFetchTime,
            rates: cachedRates
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch rates',
            details: error.message
        });
    }
});

// Only start server locally. Vercel automatically maps exported app.
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`NairaLook API is running on http://localhost:${PORT}`);
        console.log(`API Key: ${API_KEY}`);
    });
}

module.exports = app;
