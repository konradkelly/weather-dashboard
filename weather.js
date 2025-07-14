let currentTempCelsius = null;
let isFahrenheit = false;
let currentForecastData = null; // Store forecast data for unit conversion
let savedLocations = []; // Store saved locations

function celsiusToFahrenheit(celsius) {
    return (celsius * 9/5) + 32;
}

function fahrenheitToCelsius(fahrenheit) {
    return (fahrenheit - 32) * 5/9;
}

// Fixed getCurrentLocation function
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            resolve,
            (error) => {
                const geolocationError = new Error('Location access denied or unavailable');
                geolocationError.name = 'GeolocationError';
                reject(geolocationError);
            },
            { timeout: 10000, enableHighAccuracy: true }
        );
    });
}

// Location Management Functions
function saveLocation(city, country = '', lat = null, lon = null) {
    const location = {
        city,
        country,
        lat,
        lon,
        id: Date.now(), // Simple ID generation
        savedAt: new Date().toISOString()
    };
    
    // Check if location already exists
    const existingIndex = savedLocations.findIndex(loc => 
        loc.city.toLowerCase() === city.toLowerCase()
    );
    
    if (existingIndex !== -1) {
        // Update existing location
        savedLocations[existingIndex] = location;
    } else {
        // Add new location
        savedLocations.push(location);
    }
    
    // Save to localStorage (or send to server)
    localStorage.setItem('weatherAppLocations', JSON.stringify(savedLocations));
    
    console.log('Location saved:', location);
    return location;
}

function loadSavedLocations() {
    try {
        const stored = localStorage.getItem('weatherAppLocations');
        if (stored) {
            savedLocations = JSON.parse(stored);
        }
    } catch (error) {
        console.error('Error loading saved locations:', error);
        savedLocations = [];
    }
}

function removeLocation(locationId) {
    savedLocations = savedLocations.filter(loc => loc.id !== locationId);
    localStorage.setItem('weatherAppLocations', JSON.stringify(savedLocations));
    
    // Refresh the locations display if it's currently shown
    const modal = document.getElementById('locationsModal');
    if (modal && modal.style.display === 'block') {
        showMyLocations();
    }
}

function createLocationModal() {
    // Remove existing modal if it exists
    const existingModal = document.getElementById('locationsModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'locationsModal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeLocationsModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2>My Locations</h2>
                    <button class="close-btn" onclick="closeLocationsModal()">×</button>
                </div>
                <div class="modal-body">
                    <div class="current-location-section">
                        <button class="location-item current-location" onclick="getWeatherByLocation(); closeLocationsModal();">
                            <span class="location-icon">📍</span>
                            <span class="location-name">Current Location</span>
                        </button>
                    </div>
                    <div class="saved-locations-section">
                        <div class="section-header">
                            <h3>Saved Locations</h3>
                            <button class="add-current-btn" onclick="addCurrentLocationToSaved()" title="Save current location">
                                <span class="add-icon">+</span>
                            </button>
                        </div>
                        <div id="savedLocationsList">
                            <!-- Saved locations will be populated here -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal styles
    const style = document.createElement('style');
    style.textContent = `
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            backdrop-filter: blur(5px);
        }
        
        .modal-content {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
            max-width: 400px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            border: 1px solid rgba(255, 255, 255, 0.3);
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 25px;
            border-bottom: 1px solid rgba(116, 185, 255, 0.2);
        }
        
        .modal-header h2 {
            margin: 0;
            color: #2d3436;
            font-size: 1.5em;
        }
        
        .close-btn {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #636e72;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.3s ease;
        }
        
        .close-btn:hover {
            background: rgba(231, 76, 60, 0.1);
            color: #e74c3c;
        }
        
        .modal-body {
            padding: 20px 25px;
        }
        
        .current-location-section {
            margin-bottom: 25px;
        }
        
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .section-header h3 {
            margin: 0;
            color: #2d3436;
            font-size: 1.2em;
        }
        
        .add-current-btn {
            background: linear-gradient(45deg, #00b894, #00a085);
            color: white;
            border: none;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            cursor: pointer;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            box-shadow: 0 2px 10px rgba(0, 184, 148, 0.3);
        }
        
        .add-current-btn:hover {
            transform: scale(1.1);
            box-shadow: 0 4px 15px rgba(0, 184, 148, 0.4);
        }
        
        .location-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 15px;
            background: rgba(255, 255, 255, 0.6);
            border: 1px solid rgba(116, 185, 255, 0.2);
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-bottom: 10px;
            width: 100%;
            text-align: left;
        }
        
        .location-item:hover {
            background: rgba(116, 185, 255, 0.1);
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(116, 185, 255, 0.2);
        }
        
        .location-item.current-location {
            background: linear-gradient(45deg, rgba(116, 185, 255, 0.1), rgba(9, 132, 227, 0.1));
            border-color: rgba(116, 185, 255, 0.3);
        }
        
        .location-icon {
            font-size: 18px;
            width: 20px;
            text-align: center;
        }
        
        .location-name {
            flex: 1;
            font-weight: 500;
            color: #2d3436;
        }
        
        .location-actions {
            display: flex;
            gap: 5px;
        }
        
        .delete-btn {
            background: rgba(231, 76, 60, 0.1);
            color: #e74c3c;
            border: none;
            border-radius: 6px;
            padding: 6px 8px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.3s ease;
        }
        
        .delete-btn:hover {
            background: rgba(231, 76, 60, 0.2);
            transform: scale(1.1);
        }
        
        .empty-state {
            text-align: center;
            color: #636e72;
            font-style: italic;
            padding: 20px;
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(modal);
    
    return modal;
}

function populateLocationsList() {
    const savedLocationsList = document.getElementById('savedLocationsList');
    
    if (savedLocations.length === 0) {
        savedLocationsList.innerHTML = '<div class="empty-state">No saved locations yet</div>';
        return;
    }
    
    savedLocationsList.innerHTML = savedLocations.map(location => `
        <div class="location-item" onclick="loadLocationWeather('${location.city}', ${location.lat}, ${location.lon});">
            <span class="location-icon">🏙️</span>
            <span class="location-name">${location.city}${location.country ? ', ' + location.country : ''}</span>
            <div class="location-actions">
                <button class="delete-btn" onclick="event.stopPropagation(); removeLocation(${location.id});" title="Remove location">
                    🗑️
                </button>
            </div>
        </div>
    `).join('');
}

function showMyLocations() {
    loadSavedLocations();
    createLocationModal();
    populateLocationsList();
    
    const modal = document.getElementById('locationsModal');
    modal.style.display = 'block';
}

function closeLocationsModal() {
    const modal = document.getElementById('locationsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function addCurrentLocationToSaved() {
    const currentLocation = document.getElementById('location').textContent;
    
    if (!currentLocation || currentLocation === '') {
        alert('Please load a location first before saving it.');
        return;
    }
    
    // Extract city name (remove any country part)
    const cityName = currentLocation.split(',')[0].trim();
    
    saveLocation(cityName);
    populateLocationsList();
    
    // Show success feedback
    const addBtn = document.querySelector('.add-current-btn');
    if (addBtn) {
        const originalText = addBtn.innerHTML;
        addBtn.innerHTML = '✓';
        addBtn.style.background = '#00b894';
        setTimeout(() => {
            addBtn.innerHTML = originalText;
            addBtn.style.background = 'linear-gradient(45deg, #00b894, #00a085)';
        }, 1000);
    }
}

function loadLocationWeather(city, lat = null, lon = null) {
    closeLocationsModal();
    
    // Set the input field
    document.getElementById('cityInput').value = city;

    // Load weather for the selected location
    if (lat && lon) {
        getWeatherByCoordinates(lat, lon);
    } else {
        getWeatherData();
    }
}

// New function to get weather by coordinates
async function getWeatherByCoordinates(lat, lon) {
    const temperature = document.getElementById('temperature');
    const location = document.getElementById('location');
    const description = document.getElementById('description');
    const weatherIcon = document.getElementById('weatherIcon');
    const toggleContainer = document.getElementById('tempToggleContainer');
    const precipitation = document.getElementById('precipitation');
    const humidity = document.getElementById('humidity');
    const windSpeed = document.getElementById('windSpeed');

    // Show loading state
    temperature.innerHTML = 'Loading weather data...';
    location.innerHTML = '';
    description.innerHTML = '';
    weatherIcon.innerHTML = '';
    precipitation.innerHTML = '--';
    humidity.innerHTML = '--';
    windSpeed.innerHTML = '--';
    toggleContainer.style.display = 'none';

    // Hide forecast while loading
    const forecastContainer = document.getElementById('forecastContainer');
    if (forecastContainer) {
        forecastContainer.style.display = 'none';
    }

    try {
        const url = `/api/weather/coordinates?lat=${lat}&lon=${lon}`;
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
            currentTempCelsius = data.temperature;

            weatherIcon.innerHTML = `<img src="https://openweathermap.org/img/wn/${data.icon}@2x.png" alt="${data.description}" />`;

            if (isFahrenheit) {
                const tempF = Math.round(celsiusToFahrenheit(currentTempCelsius));
                temperature.innerHTML = `${tempF}°F`;
            } else {
                temperature.innerHTML = `${Math.round(currentTempCelsius)}°C`;
            }

            location.innerHTML = `${data.city}`;
            description.innerHTML = `${data.description}`;

            updateRecentSearches(data.city);

            precipitation.innerHTML = `${data.precipitation || 0}mm`;
            humidity.innerHTML = `${data.humidity || 0}%`;
            windSpeed.innerHTML = `${data.windSpeed || 0}km/h`;

            updateToggleButtons();

            // Fetch forecast
            await getForecast(null, lat, lon);

        } else {
            weatherIcon.innerHTML = '';
            temperature.innerHTML = `Error: ${data.error}`;
            location.innerHTML = '';
            description.innerHTML = '';
            precipitation.innerHTML = '--';
            humidity.innerHTML = '--';
            windSpeed.innerHTML = '--';
            toggleContainer.style.display = 'none';
            currentTempCelsius = null;
            
            if (forecastContainer) {
                forecastContainer.style.display = 'none';
            }
        }

    } catch (error) {
        weatherIcon.innerHTML = '';
        temperature.innerHTML = `Error: ${error.message}`;
        location.innerHTML = '';
        description.innerHTML = '';
        precipitation.innerHTML = '--';
        humidity.innerHTML = '--';
        windSpeed.innerHTML = '--';
        toggleContainer.style.display = 'none';
        currentTempCelsius = null;
        
        if (forecastContainer) {
            forecastContainer.style.display = 'none';
        }
    }
}

// Your original Google-style toggle function
function switchToUnit(unit) {
    if (currentTempCelsius === null || unit === (isFahrenheit ? 'fahrenheit' : 'celsius')) {
        return; // No data or already selected
    }

    const celsiusBtn = document.getElementById('celsius');
    const fahrenheitBtn = document.getElementById('fahrenheit');
    const temperature = document.getElementById('temperature');

    if (unit === 'celsius') {
        celsiusBtn.classList.remove('inactive');
        celsiusBtn.classList.add('active');
        fahrenheitBtn.classList.remove('active');
        fahrenheitBtn.classList.add('inactive');
        
        temperature.innerHTML = `${Math.round(currentTempCelsius)}°C`;
        isFahrenheit = false;
    } else {
        fahrenheitBtn.classList.remove('inactive');
        fahrenheitBtn.classList.add('active');
        celsiusBtn.classList.remove('active');
        celsiusBtn.classList.add('inactive');
        
        const tempF = Math.round(celsiusToFahrenheit(currentTempCelsius));
        temperature.innerHTML = `${tempF}°F`;
        isFahrenheit = true;
    }

    // Update forecast display when unit changes
    updateForecastDisplay();
}

// Your original helper function to update toggle button states
function updateToggleButtons() {
    const celsiusBtn = document.getElementById('celsius');
    const fahrenheitBtn = document.getElementById('fahrenheit');
    const toggleContainer = document.getElementById('tempToggleContainer');
    
    if (currentTempCelsius === null) {
        toggleContainer.style.display = 'none';
        return;
    }
    
    toggleContainer.style.display = 'flex';
    
    if (isFahrenheit) {
        celsiusBtn.classList.remove('active');
        celsiusBtn.classList.add('inactive');
        fahrenheitBtn.classList.remove('inactive');
        fahrenheitBtn.classList.add('active');
    } else {
        celsiusBtn.classList.remove('inactive');
        celsiusBtn.classList.add('active');
        fahrenheitBtn.classList.remove('active');
        fahrenheitBtn.classList.add('inactive');
    }
}

// FIXED: Function to display forecast data - now works with your HTML structure
function displayForecast(forecastData) {
    const forecastContainer = document.getElementById('forecastContainer');
    const forecastGrid = document.getElementById('forecastGrid');
    
    if (!forecastContainer || !forecastGrid) {
        console.warn('Forecast container or grid not found in HTML');
        return;
    }

    if (!forecastData || !forecastData.forecasts) {
        forecastContainer.style.display = 'none';
        return;
    }

    // Store forecast data for unit conversion
    currentForecastData = forecastData;

    // Show the forecast container
    forecastContainer.style.display = 'block';

    let forecastHTML = '';
    
    forecastData.forecasts.forEach((forecast, index) => {
        const date = new Date(forecast.date);
        const dayName = index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
        
        // Convert temperatures based on current unit preference
        let minTemp, maxTemp;
        if (isFahrenheit) {
            minTemp = Math.round(celsiusToFahrenheit(forecast.minTemp));
            maxTemp = Math.round(celsiusToFahrenheit(forecast.maxTemp));
        } else {
            minTemp = Math.round(forecast.minTemp);
            maxTemp = Math.round(forecast.maxTemp);
        }
        
        const tempUnit = isFahrenheit ? '°F' : '°C';
        
        forecastHTML += `
            <div class="forecast-day">
                <div class="forecast-date">${dayName}</div>
                <div class="forecast-icon">
                    <img src="https://openweathermap.org/img/wn/${forecast.icon}@2x.png" alt="Weather" />
                </div>
                <div class="forecast-temps">
                    <span class="temp-high">${maxTemp}${tempUnit}</span>
                    <span class="temp-low">${minTemp}${tempUnit}</span>
                </div>
            </div>
        `;
    });
    
    // Insert into the forecast grid, not the container
    forecastGrid.innerHTML = forecastHTML;
}

// NEW: Function to update forecast display when units change
function updateForecastDisplay() {
    if (currentForecastData) {
        displayForecast(currentForecastData);
    }
}

// FIXED: Function to fetch and display forecast - now calls the forecast after weather data loads
async function getForecast(cityName = null, lat = null, lon = null) {
    try {
        let url;
        if (cityName) {
            url = `/api/forecast/${encodeURIComponent(cityName)}`;
        } else if (lat && lon) {
            url = `/api/forecast/coordinates?lat=${lat}&lon=${lon}`;
        } else {
            return;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
            displayForecast(data);
        } else {
            console.error('Forecast error:', data.error);
            const forecastContainer = document.getElementById('forecastContainer');
            if (forecastContainer) {
                forecastContainer.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error fetching forecast:', error);
        const forecastContainer = document.getElementById('forecastContainer');
        if (forecastContainer) {
            forecastContainer.style.display = 'none';
        }
    }
}

async function getWeatherByLocation() {
    const temperature = document.getElementById('temperature');
    const location = document.getElementById('location');
    const description = document.getElementById('description');
    const weatherIcon = document.getElementById('weatherIcon');
    const toggleContainer = document.getElementById('tempToggleContainer');
    const precipitation = document.getElementById('precipitation');
    const humidity = document.getElementById('humidity');
    const windSpeed = document.getElementById('windSpeed');

    // Show loading state
    temperature.innerHTML = 'Getting your location...';
    location.innerHTML = '';
    description.innerHTML = '';
    weatherIcon.innerHTML = '';
    precipitation.innerHTML = '--';
    humidity.innerHTML = '--';
    windSpeed.innerHTML = '--';
    toggleContainer.style.display = 'none';

    // Hide forecast while loading
    const forecastContainer = document.getElementById('forecastContainer');
    if (forecastContainer) {
        forecastContainer.style.display = 'none';
    }

    try {
        const position = await getCurrentLocation();
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        temperature.innerHTML = "Loading weather data...";

        const url = `/api/weather/coordinates?lat=${lat}&lon=${lon}`;
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
            currentTempCelsius = data.temperature;

            weatherIcon.innerHTML = `<img src="https://openweathermap.org/img/wn/${data.icon}@2x.png" alt="${data.description}" />`;

            if (isFahrenheit) {
                const tempF = Math.round(celsiusToFahrenheit(currentTempCelsius));
                temperature.innerHTML = `${tempF}°F`;
            } else {
                temperature.innerHTML = `${Math.round(currentTempCelsius)}°C`;
            }

            location.innerHTML = `${data.city}`;
            description.innerHTML = `${data.description}`;

            updateRecentSearches(data.city);

            precipitation.innerHTML = `${data.precipitation || 0}mm`;
            humidity.innerHTML = `${data.humidity || 0}%`;
            windSpeed.innerHTML = `${data.windSpeed || 0}km/h`;

            updateToggleButtons();

            // FIXED: Now fetch forecast after weather data loads
            await getForecast(null, lat, lon);

        } else {
            weatherIcon.innerHTML = '';
            temperature.innerHTML = `Error: ${data.error}`;
            location.innerHTML = '';
            description.innerHTML = '';
            precipitation.innerHTML = '--';
            humidity.innerHTML = '--';
            windSpeed.innerHTML = '--';
            toggleContainer.style.display = 'none';
            currentTempCelsius = null;
            
            // Hide forecast on error
            if (forecastContainer) {
                forecastContainer.style.display = 'none';
            }
        }

    } catch (error) {
        weatherIcon.innerHTML = '';
        if (error.name === 'GeolocationError') {
            temperature.innerHTML = 'Enter a city name to get weather';
        } else {
            temperature.innerHTML = `Error: ${error.message}`;
        }
        location.innerHTML = '';
        description.innerHTML = '';
        precipitation.innerHTML = '--';
        humidity.innerHTML = '--';
        windSpeed.innerHTML = '--';
        toggleContainer.style.display = 'none';
        currentTempCelsius = null;
        
        // Hide forecast on error
        if (forecastContainer) {
            forecastContainer.style.display = 'none';
        }
    }
}

// FIXED: Your original main function - now fetches forecast after weather data loads
async function getWeatherData() {
    const cityInput = document.getElementById('cityInput').value;
    const temperature = document.getElementById('temperature');
    const location = document.getElementById('location');
    const description = document.getElementById('description');
    const weatherIcon = document.getElementById('weatherIcon');
    const toggleContainer = document.getElementById('tempToggleContainer');
    const precipitation = document.getElementById('precipitation');
    const humidity = document.getElementById('humidity');
    const windSpeed = document.getElementById('windSpeed');

    if (!cityInput) {
        temperature.innerHTML = 'Please enter a city name';
        location.innerHTML = '';
        description.innerHTML = '';
        weatherIcon.innerHTML = '';
        precipitation.innerHTML = '--';
        humidity.innerHTML = '--';
        windSpeed.innerHTML = '--';
        toggleContainer.style.display = 'none';
        currentTempCelsius = null;
        
        // Hide forecast when no input
        const forecastContainer = document.getElementById('forecastContainer');
        if (forecastContainer) {
            forecastContainer.style.display = 'none';
        }
        return;
    }

    const city = cityInput.toLowerCase().split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');

    // Show loading state
    temperature.innerHTML = 'Loading...';
    
    // Hide forecast while loading
    const forecastContainer = document.getElementById('forecastContainer');
    if (forecastContainer) {
        forecastContainer.style.display = 'none';
    }

    try {
        const url = `/api/weather/${encodeURIComponent(city)}`;

        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
            currentTempCelsius = data.temperature;

            weatherIcon.innerHTML = `<img src="https://openweathermap.org/img/wn/${data.icon}@2x.png" alt="${data.description}" />`;
            
            if (isFahrenheit) {
                const tempF = Math.round(celsiusToFahrenheit(currentTempCelsius));
                temperature.innerHTML = `${tempF}°F`;
            } else {
                temperature.innerHTML = `${Math.round(currentTempCelsius)}°C`;
            }

            location.innerHTML = `${data.city}`;
            description.innerHTML = `${data.description}`;

            updateRecentSearches(data.city);

            
            // Update weather details
            precipitation.innerHTML = `${data.precipitation || 0}mm`;
            humidity.innerHTML = `${data.humidity || 0}%`;
            windSpeed.innerHTML = `${data.windSpeed || 0}km/h`;
            
            // Update toggle button states
            updateToggleButtons();
            
            // FIXED: Now fetch forecast after weather data loads
            await getForecast(city);
            
        } else {
            weatherIcon.innerHTML = '';
            temperature.innerHTML = `Error: ${data.error}`;
            location.innerHTML = '';
            description.innerHTML = '';
            precipitation.innerHTML = '--';
            humidity.innerHTML = '--';
            windSpeed.innerHTML = '--';
            toggleContainer.style.display = 'none';
            currentTempCelsius = null;
            
            // Hide forecast on error
            if (forecastContainer) {
                forecastContainer.style.display = 'none';
            }
        }

    } catch (error) {
        weatherIcon.innerHTML = '';
        temperature.innerHTML = `Error: ${error.message}`;
        location.innerHTML = '';
        description.innerHTML = '';
        precipitation.innerHTML = '--';
        humidity.innerHTML = '--';
        windSpeed.innerHTML = '--';
        toggleContainer.style.display = 'none';
        currentTempCelsius = null;
        
        // Hide forecast on error
        if (forecastContainer) {
            forecastContainer.style.display = 'none';
        }
    }
}

// Allow Enter key to trigger search
document.getElementById('cityInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        getWeatherData();
    }
});

// Auto-load weather by location when page loads
window.addEventListener('load', function() {
    loadSavedLocations(); // Load saved locations on page load
    getWeatherByLocation();
    // Still focus on input for user convenience
    document.getElementById('cityInput').focus();
});

function updateRecentSearches(city, country = '') {
  fetch('/api/recentSearches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ city, country })
  })
  .then(response => {
    if (!response.ok) {
      console.error('Failed to update recent searches');
    }
  })
  .catch(err => {
    console.error('Error updating recent searches:', err);
  });
}

// Close modal when clicking outside or pressing Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeLocationsModal();
    }
});

// Prevent modal from closing when clicking inside the modal content
document.addEventListener('click', function(e) {
    const modal = document.getElementById('locationsModal');
    if (modal && e.target === modal) {
        closeLocationsModal();
    }
});