let currentTempCelsius = null;
let isFahrenheit = false;
let currentForecastData = null; // Store forecast data for unit conversion

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
async function getTemperature() {
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
        getTemperature();
    }
});

// Auto-load weather by location when page loads
window.addEventListener('load', function() {
    getWeatherByLocation();
    // Still focus on input for user convenience
    document.getElementById('cityInput').focus();
});