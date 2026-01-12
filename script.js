// Constants
const CONSTANTS = {
    SHOWER_KWH: 6,
    BATH_KWH: 8,
    BATH_LITERS: 160,
    WATER_COST_PER_CUBIC_METER: 30, // kr/m³
    DEFAULT_AREA: 'SE4',
    STORAGE_KEY: 'vadkostarbadet_area'
};

// Get stored area or use default
function getSelectedArea() {
    const stored = localStorage.getItem(CONSTANTS.STORAGE_KEY);
    return stored || CONSTANTS.DEFAULT_AREA;
}

// Save selected area
function saveSelectedArea(area) {
    localStorage.setItem(CONSTANTS.STORAGE_KEY, area);
}

// Get today's date in format YYYY/MM-DD
function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}/${month}-${day}`;
}

// Get current hour (0-23) in Europe/Stockholm timezone
function getCurrentHour() {
    const now = new Date();
    const stockholmTime = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Stockholm',
        hour: 'numeric',
        hour12: false
    }).formatToParts(now);
    return parseInt(stockholmTime.find(part => part.type === 'hour').value);
}

// Fetch electricity prices
async function fetchPrices(area) {
    const date = getTodayDate();
    const url = `https://www.elprisetjustnu.se/api/v1/prices/${date}_${area}.json`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching prices:', error);
        throw error;
    }
}

// Calculate water cost for bath (160 liters = 0.16 m³)
function calculateWaterCost() {
    const cubicMeters = CONSTANTS.BATH_LITERS / 1000;
    return cubicMeters * CONSTANTS.WATER_COST_PER_CUBIC_METER;
}

// Calculate cost for shower or bath
function calculateCost(kwh, pricePerKwhInSEK) {
    return kwh * pricePerKwhInSEK; // Price is in SEK per kWh
}

// Calculate total bath cost (electricity + water)
function calculateBathCost(pricePerKwhInSEK) {
    const electricityCost = calculateCost(CONSTANTS.BATH_KWH, pricePerKwhInSEK);
    const waterCost = calculateWaterCost();
    return electricityCost + waterCost;
}

// Format price to 2 decimals
function formatPrice(price) {
    return price.toFixed(2) + ' kr';
}

// Determine badge class based on price
function getBadgeClass(price, minPrice, maxPrice) {
    const range = maxPrice - minPrice;
    if (range === 0) return 'normal';
    
    const position = (price - minPrice) / range;
    if (position < 0.33) return 'cheap';
    if (position > 0.67) return 'expensive';
    return 'normal';
}

// Update UI with prices
function updateUI(prices) {
    // Get current hour in Stockholm timezone
    const currentHour = getCurrentHour();
    
    // Find the price entry that matches current hour
    // Prices array contains objects with time_start in ISO format
    // We need to find the entry where the hour (in Stockholm timezone) matches current hour
    const currentPrice = prices.find(p => {
        const priceDate = new Date(p.time_start);
        // Get hour in Stockholm timezone from the price entry
        const priceHourParts = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Europe/Stockholm',
            hour: 'numeric',
            hour12: false
        }).formatToParts(priceDate);
        const priceHour = parseInt(priceHourParts.find(part => part.type === 'hour').value);
        return priceHour === currentHour;
    });
    
    if (!currentPrice) {
        showError('Kunde inte hitta pris för aktuell timme');
        return;
    }

    // Find min and max prices
    const priceValues = prices.map(p => p.SEK_per_kWh);
    const minPrice = Math.min(...priceValues);
    const maxPrice = Math.max(...priceValues);
    const minIndex = priceValues.indexOf(minPrice);
    const maxIndex = priceValues.indexOf(maxPrice);

    // Calculate costs
    const showerNow = calculateCost(CONSTANTS.SHOWER_KWH, currentPrice.SEK_per_kWh);
    const showerCheap = calculateCost(CONSTANTS.SHOWER_KWH, minPrice);
    const showerExpensive = calculateCost(CONSTANTS.SHOWER_KWH, maxPrice);

    const bathNow = calculateBathCost(currentPrice.SEK_per_kWh);
    const bathCheap = calculateBathCost(minPrice);
    const bathExpensive = calculateBathCost(maxPrice);

    // Update price displays
    document.getElementById('shower-now').textContent = formatPrice(showerNow);
    document.getElementById('shower-cheap').textContent = formatPrice(showerCheap);
    document.getElementById('shower-expensive').textContent = formatPrice(showerExpensive);

    document.getElementById('bath-now').textContent = formatPrice(bathNow);
    document.getElementById('bath-cheap').textContent = formatPrice(bathCheap);
    document.getElementById('bath-expensive').textContent = formatPrice(bathExpensive);

    // Format time from time_start (e.g., "2024-01-15T14:00:00+01:00" -> "14:00")
    function formatTime(timeStart) {
        const date = new Date(timeStart);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    // Update badges
    const badgeClass = getBadgeClass(currentPrice.SEK_per_kWh, minPrice, maxPrice);
    const badgesHTML = `
        <div class="badge ${badgeClass}">
            Just nu: ${badgeClass === 'cheap' ? 'Billigt' : badgeClass === 'expensive' ? 'Dyrt' : 'Normalt'}
        </div>
        <div class="badge cheap">
            Billigast: ${formatTime(prices[minIndex].time_start)}
        </div>
        <div class="badge expensive">
            Dyrast: ${formatTime(prices[maxIndex].time_start)}
        </div>
    `;
    document.getElementById('price-badges').innerHTML = badgesHTML;
}

// Show status message
function showStatus(message, type) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
}

// Show error
function showError(message) {
    showStatus(message, 'error');
}

// Show loading
function showLoading() {
    showStatus('Hämtar elpriser...', 'loading');
}

// Hide status
function hideStatus() {
    const statusEl = document.getElementById('status');
    statusEl.className = 'status';
}

// Convert latitude to Swedish elområde
function latToElområde(latitude) {
    // Simple latitude-based mapping for Swedish elområden
    // SE1: Norra Sverige (Norrbotten, Västerbotten) - lat >= 63
    // SE2: Norra Mellansverige - lat >= 60 && lat < 63
    // SE3: Södra Mellansverige - lat >= 58 && lat < 60
    // SE4: Södra Sverige (Skåne, etc.) - lat < 58
    if (latitude >= 63) {
        return 'SE1';
    } else if (latitude >= 60) {
        return 'SE2';
    } else if (latitude >= 58) {
        return 'SE3';
    } else {
        return 'SE4';
    }
}

// Detect elområde using geolocation
function detectElområde() {
    console.log('detectElområde called');
    const detectBtn = document.getElementById('detect-area-btn');
    const areaSelect = document.getElementById('area-select');
    
    if (!detectBtn || !areaSelect) {
        console.error('Could not find detect button or area select');
        return;
    }
    
    // Check if geolocation is supported
    if (!navigator.geolocation) {
        showError('Din webbläsare stödjer inte geolocation. Välj elområde manuellt.');
        return;
    }
    
    // Disable button while detecting
    detectBtn.disabled = true;
    showStatus('Hämtar din position...', 'loading');
    
    // Request position
    navigator.geolocation.getCurrentPosition(
        (position) => {
            // Success - convert to elområde
            const latitude = position.coords.latitude;
            const detectedArea = latToElområde(latitude);
            
            // Update dropdown
            areaSelect.value = detectedArea;
            
            // Save to localStorage
            saveSelectedArea(detectedArea);
            
            // Re-enable button
            detectBtn.disabled = false;
            
            // Hide current status (loadPrices will show its own loading message)
            hideStatus();
            
            // Load prices for detected area
            loadPrices(detectedArea);
        },
        (error) => {
            // Error handling
            detectBtn.disabled = false;
            let errorMessage = 'Kunde inte hämta din position. ';
            
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += 'Du nekarde åtkomst till position. Välj elområde manuellt.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += 'Position kunde inte hittas. Välj elområde manuellt.';
                    break;
                case error.TIMEOUT:
                    errorMessage += 'Tidsgränsen nåddes. Välj elområde manuellt.';
                    break;
                default:
                    errorMessage += 'Ett fel uppstod. Välj elområde manuellt.';
                    break;
            }
            
            showError(errorMessage);
        },
        {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 300000 // Cache position for 5 minutes
        }
    );
}

// Load and display prices
async function loadPrices(area) {
    showLoading();
    try {
        const prices = await fetchPrices(area);
        hideStatus();
        updateUI(prices);
    } catch (error) {
        showError('Kunde inte hämta elpriser. Försök igen senare.');
        console.error(error);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set selected area from storage
    const savedArea = getSelectedArea();
    const areaSelect = document.getElementById('area-select');
    areaSelect.value = savedArea;

    // Load initial prices
    loadPrices(savedArea);

    // Handle area change
    areaSelect.addEventListener('change', (e) => {
        const selectedArea = e.target.value;
        saveSelectedArea(selectedArea);
        loadPrices(selectedArea);
    });

    // Handle detect area button
    const detectBtn = document.getElementById('detect-area-btn');
    console.log('Detect button found:', detectBtn);
    if (detectBtn) {
        detectBtn.addEventListener('click', detectElområde);
        console.log('Event listener added to detect button');
    } else {
        console.error('Detect button not found in DOM');
    }
});
