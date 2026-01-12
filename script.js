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

    // Update dashboard cards with new structure
    updateDashboardCard('bath', bathNow, bathCheap, bathExpensive, prices[minIndex].time_start, prices[maxIndex].time_start, currentPrice.SEK_per_kWh, minPrice, maxPrice);
    updateDashboardCard('shower', showerNow, showerCheap, showerExpensive, prices[minIndex].time_start, prices[maxIndex].time_start, currentPrice.SEK_per_kWh, minPrice, maxPrice);
    
    // Update insights
    updateInsights(showerNow, showerCheap, bathNow, bathCheap, minPrice, maxPrice);

    // Format time from time_start (e.g., "2024-01-15T14:00:00+01:00" -> "14:00")
    function formatTime(timeStart) {
        const date = new Date(timeStart);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    // Draw price graph
    drawPriceGraph(prices, currentPrice);
}

// Show status message
function showStatus(message, type) {
    const statusEl = document.getElementById('status');
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
}

// Show error with styled alert
function showError(message) {
    const statusEl = document.getElementById('status');
    if (!statusEl) return;
    statusEl.innerHTML = `
        <div class="alert alert-error">
            <strong>Fel:</strong> ${message}
        </div>
    `;
    statusEl.className = 'status error';
}

// Show loading with skeleton
function showLoading() {
    showStatus('Hämtar elpriser...', 'loading');
    // Show loading skeleton in cards
    showCardSkeleton();
}

// Show card skeleton while loading
function showCardSkeleton() {
    const cards = document.querySelectorAll('.dashboard-card .price-large');
    cards.forEach(card => {
        card.textContent = '...';
        card.style.opacity = '0.5';
    });
}

// Hide card skeleton
function hideCardSkeleton() {
    const cards = document.querySelectorAll('.dashboard-card .price-large');
    cards.forEach(card => {
        card.style.opacity = '1';
    });
}

// Hide status
function hideStatus() {
    const statusEl = document.getElementById('status');
    statusEl.className = 'status';
}

// Update dashboard card
function updateDashboardCard(type, now, cheap, expensive, cheapTime, expensiveTime, currentPrice, minPrice, maxPrice) {
    const badgeClass = getBadgeClass(currentPrice, minPrice, maxPrice);
    const badgeText = badgeClass === 'cheap' ? 'Billigt' : badgeClass === 'expensive' ? 'Dyrt' : 'Normalt';
    
    // Format time helper
    function formatTime(timeStart) {
        const date = new Date(timeStart);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }
    
    // Update primary price
    const nowEl = document.getElementById(`${type}-now`);
    if (nowEl) {
        nowEl.style.opacity = '0';
        setTimeout(() => {
            nowEl.textContent = formatPrice(now);
            nowEl.style.transition = 'opacity 0.3s ease';
            nowEl.style.opacity = '1';
        }, 100);
    }
    
    // Update badge
    const badgeEl = document.getElementById(`${type}-badge`);
    if (badgeEl) {
        badgeEl.textContent = badgeText;
        badgeEl.className = `price-badge ${badgeClass}`;
    }
    
    // Update secondary prices
    const cheapEl = document.getElementById(`${type}-cheap`);
    const expensiveEl = document.getElementById(`${type}-expensive`);
    const cheapTimeEl = document.getElementById(`${type}-cheap-time`);
    const expensiveTimeEl = document.getElementById(`${type}-expensive-time`);
    
    if (cheapEl) {
        cheapEl.textContent = formatPrice(cheap);
        if (cheapTimeEl) {
            cheapTimeEl.textContent = `(${formatTime(cheapTime)})`;
        }
    }
    
    if (expensiveEl) {
        expensiveEl.textContent = formatPrice(expensive);
        if (expensiveTimeEl) {
            expensiveTimeEl.textContent = `(${formatTime(expensiveTime)})`;
        }
    }
}

// Update insights section
function updateInsights(showerNow, showerCheap, bathNow, bathCheap, minPrice, maxPrice) {
    const insightsEl = document.getElementById('insights');
    if (!insightsEl) return;
    
    const showerSavings = showerNow - showerCheap;
    const bathSavings = bathNow - bathCheap;
    const priceDiff = ((maxPrice - minPrice) / minPrice) * 100;
    
    let insightsHTML = '';
    
    if (showerSavings > 0 || bathSavings > 0) {
        insightsHTML += `<p>Om du väntar till billigaste timmen sparar du <strong>${formatPrice(bathSavings)}</strong> på ett bad och <strong>${formatPrice(showerSavings)}</strong> på en dusch.</p>`;
    }
    
    insightsHTML += `<p>Skillnad mellan billigast och dyrast idag: <strong>${priceDiff.toFixed(1)}%</strong></p>`;
    
    insightsEl.innerHTML = insightsHTML;
}

// Format price for graph (simpler format for mobile)
function formatPriceForGraph(value, isMobile) {
    if (isMobile) {
        // On mobile, show as öre if less than 1 kr, otherwise as kr
        const ore = Math.round(value * 100);
        if (ore < 100) {
            return `${ore} öre`;
        } else {
            return `${(ore / 100).toFixed(1)} kr`;
        }
    } else {
        return formatPrice(value);
    }
}

// Draw price graph
function drawPriceGraph(prices, currentPrice) {
    const canvas = document.getElementById('price-graph');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;
    const width = container.clientWidth - 32; // Account for padding
    const isMobile = window.innerWidth < 768;
    const height = isMobile ? 250 : 300;
    
    // Adjust padding for mobile
    const padding = isMobile 
        ? { top: 15, right: 10, bottom: 35, left: 40 }
        : { top: 20, right: 20, bottom: 40, left: 50 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;
    
    // Set canvas size
    canvas.width = width;
    canvas.height = height;
    
    // Calculate bath costs for all hours
    const bathCosts = prices.map(p => calculateBathCost(p.SEK_per_kWh));
    const minCost = Math.min(...bathCosts);
    const maxCost = Math.max(...bathCosts);
    const costRange = maxCost - minCost || 1;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Adjust number of grid lines for mobile
    const gridLines = isMobile ? 3 : 5;
    
    // Draw grid lines
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridLines; i++) {
        const y = padding.top + (graphHeight / gridLines) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
    }
    
    // Draw axes
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();
    
    // Draw labels
    ctx.fillStyle = '#6b7280';
    const fontSize = isMobile ? 11 : 12;
    ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    // Y-axis labels (price) - fewer on mobile
    for (let i = 0; i <= gridLines; i++) {
        const value = maxCost - (costRange / gridLines) * i;
        const y = padding.top + (graphHeight / gridLines) * i;
        const priceText = formatPriceForGraph(value, isMobile);
        ctx.fillText(priceText, padding.left - 8, y);
    }
    
    // X-axis labels (time) - fewer and simpler on mobile
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const timeLabels = isMobile ? 5 : 8;
    const labelStep = Math.max(1, Math.floor(prices.length / timeLabels));
    
    for (let i = 0; i < prices.length; i += labelStep) {
        const date = new Date(prices[i].time_start);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const x = padding.left + (graphWidth / (prices.length - 1)) * i;
        
        // On mobile, show only hours (e.g., "12") instead of "12:00"
        const timeText = isMobile ? hours : `${hours}:${minutes}`;
        ctx.fillText(timeText, x, height - padding.bottom + 8);
    }
    
    // Draw line graph
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    prices.forEach((price, index) => {
        const cost = calculateBathCost(price.SEK_per_kWh);
        const x = padding.left + (graphWidth / (prices.length - 1)) * index;
        const y = padding.top + graphHeight - ((cost - minCost) / costRange) * graphHeight;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
    
    // Draw area under curve
    ctx.fillStyle = 'rgba(37, 99, 235, 0.1)';
    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);
    prices.forEach((price, index) => {
        const cost = calculateBathCost(price.SEK_per_kWh);
        const x = padding.left + (graphWidth / (prices.length - 1)) * index;
        const y = padding.top + graphHeight - ((cost - minCost) / costRange) * graphHeight;
        ctx.lineTo(x, y);
    });
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.closePath();
    ctx.fill();
    
    // Draw points
    prices.forEach((price, index) => {
        const cost = calculateBathCost(price.SEK_per_kWh);
        const x = padding.left + (graphWidth / (prices.length - 1)) * index;
        const y = padding.top + graphHeight - ((cost - minCost) / costRange) * graphHeight;
        
        ctx.fillStyle = '#2563eb';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Highlight current hour
        if (price === currentPrice) {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    
    // Store data for interactivity
    canvas.priceData = prices.map((price, index) => ({
        price,
        cost: calculateBathCost(price.SEK_per_kWh),
        x: padding.left + (graphWidth / (prices.length - 1)) * index,
        y: padding.top + graphHeight - ((calculateBathCost(price.SEK_per_kWh) - minCost) / costRange) * graphHeight,
        time: new Date(price.time_start)
    }));
    canvas.padding = padding;
    canvas.graphWidth = graphWidth;
    canvas.isMobile = isMobile;
}

// Resize canvas when window resizes
function resizeCanvas() {
    const canvas = document.getElementById('price-graph');
    if (!canvas || !canvas.priceData) return;
    
    // Get the prices from stored data
    const prices = canvas.priceData.map(d => d.price);
    const currentPrice = prices.find(p => {
        const currentHour = getCurrentHour();
        const priceHour = new Date(p.time_start).toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm', hour: '2-digit', hour12: false });
        return parseInt(priceHour) === currentHour;
    }) || prices[0];
    
    // Redraw graph with new dimensions
    drawPriceGraph(prices, currentPrice);
}

// Handle graph interactivity
function setupGraphInteractivity() {
    const canvas = document.getElementById('price-graph');
    const tooltip = document.getElementById('graph-tooltip');
    
    if (!canvas || !tooltip) return;
    
    function showTooltip(e) {
        if (!canvas.priceData) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
        const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
        
        // Find closest data point
        let closest = null;
        let minDistance = Infinity;
        
        canvas.priceData.forEach(data => {
            const distance = Math.abs(data.x - x);
            if (distance < minDistance) {
                minDistance = distance;
                closest = data;
            }
        });
        
        if (closest && minDistance < 30) {
            const hours = String(closest.time.getHours()).padStart(2, '0');
            const minutes = String(closest.time.getMinutes()).padStart(2, '0');
            const isMobile = window.innerWidth < 768;
            const priceText = formatPriceForGraph(closest.cost, isMobile);
            tooltip.textContent = `${hours}:${minutes} - ${priceText}`;
            tooltip.classList.add('visible');
            
            // Position tooltip
            const tooltipX = Math.min(x, rect.width - tooltip.offsetWidth - 10);
            const tooltipY = y - tooltip.offsetHeight - 15;
            tooltip.style.left = tooltipX + 'px';
            tooltip.style.top = tooltipY + 'px';
        }
    }
    
    function hideTooltip() {
        tooltip.classList.remove('visible');
    }
    
    // Mouse events
    canvas.addEventListener('mousemove', showTooltip);
    canvas.addEventListener('mouseleave', hideTooltip);
    canvas.addEventListener('mouseout', hideTooltip);
    
    // Touch events
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        showTooltip(e);
    });
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        showTooltip(e);
    });
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        setTimeout(hideTooltip, 1000); // Keep tooltip visible for 1 second
    });
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
        hideCardSkeleton();
        updateUI(prices);
    } catch (error) {
        hideCardSkeleton();
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

    // Set version number (using commit hash if available, otherwise version number)
    const versionEl = document.getElementById('version');
    if (versionEl) {
        // Try to get commit hash from meta tag or use version number
        const commitHash = document.querySelector('meta[name="git-commit"]')?.content;
        if (commitHash) {
            versionEl.textContent = commitHash.substring(0, 7);
            versionEl.title = `Commit: ${commitHash}`;
        } else {
            // Fallback to version number with timestamp
            const buildTime = new Date().toISOString().split('T')[0];
            versionEl.textContent = `1.0.0-${buildTime}`;
        }
    }

    // Setup graph interactivity
    setupGraphInteractivity();
    
    // Redraw graph on window resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(resizeCanvas, 250);
    });
});
