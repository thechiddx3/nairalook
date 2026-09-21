# Nairalook

Nairalook is a project combining an exchange rate API and a Chrome extension for easy access to Nigerian Naira (NGN) exchange rates. 

## Features

### 1. Nairalook API
A Node.js & Express API that fetches and caches live exchange rates.
- **Exchange Rates:** Scrapes and provides real-time Parallel (Black Market) and Official (I&E Window) exchange rates for USD, GBP, and EUR to NGN.
- **Caching:** Implements a 30-minute caching mechanism to reduce external requests.
- **CORS & Security:** Secures endpoints using API keys and restricts CORS to the specific Chrome Extension ID.

### 2. Chrome Extension
A convenient browser extension to view real-time Naira exchange rates without leaving your current tab.
- **Popup UI:** Quickly displays the latest Parallel and I&E rates.
- **Settings:** Allows users to toggle between different rate types.
- **Backend Integration:** Communicates directly with the Nairalook API to fetch live data.

## Installation & Setup

### Setting up the API
1. Navigate to the `api` directory:
   ```bash
   cd api
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables by creating a `.env` file:
   ```env
   PORT=3000
   API_KEY=your_api_key_here
   ALLOWED_EXTENSION_ID=your_chrome_extension_id
   ```
4. Start the server:
   ```bash
   npm run dev
   ```

### Installing the Chrome Extension
1. Before installing, open `Extension/background.js` in a text editor.
2. Replace the placeholder `API_URL` and `API_KEY` with your own hosted API URL and key:
   ```javascript
   const API_URL = 'http://localhost:3000/api/rates'; 
   const API_KEY = 'your_api_key_here';
   ```
3. Open Google Chrome and navigate to `chrome://extensions/`.
4. Enable **Developer mode** in the top right corner.
5. Click **Load unpacked** and select the `Extension` directory from this repository.
6. The extension icon will appear in your toolbar.

## Tech Stack
- **Frontend:** HTML, CSS, JavaScript
- **API (Backend):** Node.js, Express, Cheerio (for scraping)
- **Extension:** Chrome Extensions API (Manifest V3/V2)

## License
MIT License
