// background.js

const API_URL = 'YOUR_HOSTED_API_URL_HERE';
const API_KEY = 'YOUR_API_KEY_HERE';

async function fetchLiveRates() {
  try {
    console.log("Fetching live rates from NairaLook API...");
    const response = await fetch(API_URL, {
      headers: {
        'x-api-key': API_KEY
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.rates) {
        console.log("Rates successfully updated!", data.rates);
        await chrome.storage.local.set({
          rates: data.rates,
          lastUpdated: data.lastUpdated || Date.now()
        });
        return data.rates;
      }
    } else {
      console.error("API Error:", response.status, await response.text());
    }
  } catch (error) {
    console.error('Failed to fetch NairaLook rates:', error);
  }
  return null;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['rateType'], async (result) => {
    if (!result.rateType) {
      chrome.storage.local.set({ rateType: 'parallel' });
    }

    // Fetch fresh rates immediately on install or update
    await fetchLiveRates();

    // Setup an alarm to fetch actively every 30 minutes in the background
    chrome.alarms.create('fetchRatesRefresh', { periodInMinutes: 30 });
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'fetchRatesRefresh') {
    fetchLiveRates();
  }
});

// Listener for content scripts and popup requesting current context
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_RATES') {
    chrome.storage.local.get(['rateType', 'rates'], async (data) => {
      let rates = data.rates;
      let rateType = data.rateType || 'parallel';

      // If local storage is empty for some reason, forcefully grab them
      if (!rates) {
        rates = await fetchLiveRates();
      }

      sendResponse({
        rateType: rateType,
        rates: rates
      });
    });
    return true; // Keep message channel open for async callback
  }
});
