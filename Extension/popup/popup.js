document.addEventListener('DOMContentLoaded', () => {
    const radios = document.querySelectorAll('input[name="rateType"]');
    const rateDisplay = document.getElementById('rate-display');

    chrome.runtime.sendMessage({ type: 'GET_RATES' }, (data) => {
        if (data && data.rateType) {
            const radio = document.querySelector(`input[value="${data.rateType}"]`);
            if (radio) radio.checked = true;
        }
        updateRateDisplay(data ? data.rates : null, data ? data.rateType : 'parallel');
    });

    radios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const newType = e.target.value;
            chrome.storage.local.set({ rateType: newType });

            chrome.runtime.sendMessage({ type: 'GET_RATES' }, (data) => {
                updateRateDisplay(data ? data.rates : null, newType);
            });
        });
    });

    function updateRateDisplay(rates, type) {
        if (!rates || !rates[type]) {
            rateDisplay.textContent = 'Rates unavailable. Trying to fetch...';
            return;
        }
        const currentRates = rates[type];

        rateDisplay.innerHTML = `
      <strong>Current ${type === 'parallel' ? 'Parallel' : 'I&E'} Rates:</strong><br><br>
      $1 <span style="color:#aaa;">=</span> ₦${currentRates.USD}<br>
      £1 <span style="color:#aaa;">=</span> ₦${currentRates.GBP}<br>
      €1 <span style="color:#aaa;">=</span> ₦${currentRates.EUR}
    `;
    }
});
