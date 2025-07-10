const express = require('express');
const axios = require('axios');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'weather.db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Initialize SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase(); // <--- call it here
  }
});

function initializeDatabase() {
    db.run(`CREATE TABLE IF NOT EXISTS recent_searches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    searched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
}

// Add this after your database connection
db.serialize(() => {
    initializeDatabase();
    // Wait a moment for the database to be ready, then show recent searches
    setTimeout(() => {
        showRecentSearches();
    }, 1000);
});

//Test API route
app.get('/', (req, res) => {
    res.json({message: 'Weather API is running!'})
});

// Helper function to format weather data
function formatWeatherData(data) {
    return {
        city: data.name,
        country: data.sys.country,
        temperature: Math.round(data.main.temp),
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        humidity: data.main.humidity,
        windSpeed: Math.round(data.wind.speed * 3.6), //Convert m/s to km/h
        pressure: data.main.pressure,
        feelsLike: Math.round(data.main.feels_like),
        visibility: data.visibility ? Math.round(data.visibility / 1000) : null, //Convert to km
        // Note: OpenWeatherMap doesn't provide precipitation directly in current weather
        // You'd need to check if rain/snow objects exist
        precipitation: data.rain ? (data.rain['1h'] || data.rain['3h'] || 0) :
                     data.snow ? (data.snow['1h'] || data.snow['3h'] || 0) : 0
    };
}

function formatSimpleForecastData(data) {
        const forecasts = [];
        const dailyData = {};
        
        //Group forecasts by date
        data.list.forEach(item => {
            const date = new Date(item.dt * 1000).toDateString();
            if (!dailyData[date]) {
                dailyData[date] = [];
            }
            dailyData[date].push(item);
        });

        Object.keys(dailyData).forEach(date => {
            const dayForecasts = dailyData[date];

            const temps = dayForecasts.map(f => f.main.temp);
            const minTemp = Math.round(Math.min(...temps));
            const maxTemp = Math.round(Math.max(...temps));

            //Get the most common weather condition for the day
            const weatherCounts = {};
            dayForecasts.forEach(f => {
                const weather = f.weather[0].main;
                weatherCounts[weather] = (weatherCounts[weather] || 0) + 1;
            });

            const mostCommonWeather = Object.keys(weatherCounts).reduce((a, b) =>
                weatherCounts[a] > weatherCounts[b] ? a : b
            );

            const representativeEntry = dayForecasts.find(f =>
                f.weather[0].main === mostCommonWeather
            ) || dayForecasts[0];

            forecasts.push({
                date: date,
                minTemp: minTemp,
                maxTemp: maxTemp,
                icon: representativeEntry.weather[0].icon
            });
        });
        
        return {
            city: data.city.name,
            country: data.city.country,
            forecasts: forecasts.slice(0, 5)
        };
    }

//NEW: Current weather route by coordinates (for geolocation)
app.get('/api/weather/coordinates', async (req, res) => {
    try {
        const { lat, lon } = req.query;
        const API_KEY = process.env.OPENWEATHER_API_KEY;

        // Validate coordinates
        if (!lat || !lon) {
            return res.status(400).json({ error: 'Latitude and longitude are required' });
        }

        if (isNaN(lat) || isNaN(lon)) {
            return res.status(400).json({ error: 'Invalid coordinates provided' });
        }

        // Check coordinate ranges
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            return res.status(400).json({ error: 'Coordinates out of valid range' });
        }

        const weatherResponse = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
        );

        const weatherData = formatWeatherData(weatherResponse.data);
        res.json(weatherData);

    } catch (error) {
        console.error('Error fetching weather data by coordinates:', error);

        if (error.response && error.response.status === 404) {
            res.status(404).json({ error: 'Location not found' });
        } else if (error.response && error.response.status === 400) {
            res.status(400).json({ error: 'Invalid coordinates' });
        } else {
            res.status(500).json({ error: 'Failed to fetch weather data' });
        }
    }
});

// 5-day forecast route by coordinates (for geolocation)
app.get('/api/forecast/coordinates', async (req, res) => {
    try {
        const { lat, lon } = req.query;
        const API_KEY = process.env.OPENWEATHER_API_KEY;

        // Validate coordinates
        if (!lat || !lon) {
            return res.status(400).json({ error: 'Latitude and longitude are required' });
        }

        if (isNaN(lat) || isNaN(lon)) {
            return res.status(400).json({ error: 'Invalid coordinates provided' });
        }

        // Check coordinate ranges
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            return res.status(400).json({ error: 'Coordinates out of valid range' });
        }

        const forecastResponse = await axios.get(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
        );

        const forecastData = formatSimpleForecastData(forecastResponse.data);
        res.json(forecastData);

    } catch (error) {
        console.error('Error fetching forecast data by coordinates:', error);

        if (error.response && error.response.status === 404) {
            res.status(404).json({ error: 'Location not found' });
        } else if (error.response && error.response.status === 401) {
            res.status(401).json({ error: 'Invalid API key' });
        } else {
            res.status(500).json({ error: 'Failed to fetch forecast data' });
        }
    }
});

// 5-day forecast route by city name
app.get('/api/forecast/:city', async (req, res) => {
    try {
        const { city } = req.params;
        const API_KEY = process.env.OPENWEATHER_API_KEY;

        const forecastResponse = await axios.get(
            `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric`
        );

        const forecastData = formatSimpleForecastData(forecastResponse.data);
        res.json(forecastData);

    } catch (error) {
        console.error('Error fetching forecast data:', error);

        if (error.response && error.response.status === 404) {
            res.status(404).json({ error: 'City not found' });
        } else if (error.response && error.response.status === 401) {
            res.status(401).json({ error: 'Invalid API key' });
        } else {
            res.status(500).json({ error: 'Failed to fetch forecast data' });
        }
    }
});

// Current weather route by city name
app.get('/api/weather/:city', async (req, res) => {
    try {
        const { city } = req.params;
        const API_KEY = process.env.OPENWEATHER_API_KEY;

        const weatherResponse = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`
        );

        const weatherData = formatWeatherData(weatherResponse.data);

        // ✅ Log to database
        if (weatherData.city && weatherData.country) {
            updateRecentSearches(weatherData.city, weatherData.country);
        }

        res.json(weatherData);

    } catch (error) {
        console.error('Error fetching weather data:', error);

        if (error.response && error.response.status === 404) {
            res.status(404).json({ error: 'City not found' });
        } else {
            res.status(500).json({ error: 'Failed to fetch weather data' });
        }
    }
});


app.post('/api/recentSearches', (req, res) => {
  const { city, country } = req.body;

  if (!city || !country) {
    return res.status(400).json({ error: 'City and country are required' });
  }

  const timestamp = new Date().toISOString();
  const sql = `INSERT INTO recent_searches (city, country, searched_at) VALUES (?, ?, ?)`;

  db.run(sql, [city, country, timestamp], function (err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Failed to save recent search' });
    }
    res.json({ message: 'Search saved', id: this.lastID });
  });
});

app.get('/api/recentSearches', (req, res) => {
  const sql = `SELECT city, country, searched_at FROM recent_searches ORDER BY searched_at DESC LIMIT 10`;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Failed to fetch recent searches' });
    }
    res.json(rows);
  });
});

function updateRecentSearches(city, country) {
    db.run(
        'INSERT INTO recent_searches (city, country) VALUES (?, ?)',
        [city, country],
        (err) => {
            if (err) {
                console.error('Error inserting recent search:', err);
            } else {
                console.log(`Inserted recent search: ${city}, ${country}`);
            }
        }
    );
}

function showRecentSearches() {
    try {
        // Query to get the 25 most recent searches
        const query = `
            SELECT city, country, searched_at 
            FROM recent_searches 
            ORDER BY searched_at DESC 
            LIMIT 50
        `;
        
        db.all(query, [], (err, searches) => {
            if (err) {
                console.error('Error fetching recent searches:', err);
                return;
            }
            
            console.log('\n=== RECENT SEARCHES (Last 25) ===');
            console.log('Total records found:', searches.length);
            console.log('=====================================');
            
            if (searches.length === 0) {
                console.log('No recent searches found in database.');
                return;
            }
            
            // Display each search with formatted output
            searches.forEach((search, index) => {
                const timestamp = new Date(search.searched_at).toLocaleString();
                const location = search.country ? `${search.city}, ${search.country}` : search.city;
                
                console.log(`${index + 1}. ${location}`);
                console.log(`   Time: ${timestamp}`);
                console.log('   ---');
            });
            
            console.log('=====================================\n');
        });
        
    } catch (error) {
        console.error('Error fetching recent searches:', error);
    }
}

//Start server on PORT=3000
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});