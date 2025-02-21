async function getWeather() {
    const city = document.getElementById('city').value.trim();
    const apiKey = '32cfef926928d9e951e538ed0f1cb2a9'; 

    if (!city) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const { latitude, longitude } = position.coords;
                const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`;
                await fetchWeather(url, latitude, longitude);
            }, (error) => {
                document.getElementById('weather-result').innerHTML = `<p>Geolocation error: ${error.message}. Please enter a city manually.</p>`;
            });
        } else {
            document.getElementById('weather-result').innerHTML = `<p>Your browser does not support geolocation. Please enter a city manually.</p>`;
        }
    } else {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
        await fetchWeather(url);
    }
}
async function getUVIndex(lat, lon) {
    const apiKey = '32cfef926928d9e951e538ed0f1cb2a9'; // Replace with your actual API key
    const url = `https://api.openweathermap.org/data/2.5/uvi?lat=${lat}&lon=${lon}&appid=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data && data.value !== undefined) {
            return data.value;
        } else {
            console.warn("UV Index data not available.");
            return "N/A";
        }
    } catch (error) {
        console.error("Error fetching UV index:", error);
        return "N/A";
    }
}

function reloadWeather() {
    document.getElementById('weather-result').innerHTML = "<p>Reloading...</p>"; // Show a temporary message
    getWeather(); // Fetches weather data again
}


async function fetchWeather(url, lat = null, lon = null) {
    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.cod === 200) {
            const currentDate = new Date();
            const day = currentDate.toLocaleString('en-US', { weekday: 'long' });
            const date = currentDate.toLocaleString('en-UK', { day: 'numeric', month: 'short' });

            if (!lat || !lon) {
                lat = data.coord.lat;
                lon = data.coord.lon;
            }

            const uvIndex = await getUVIndex(lat, lon);

            let rainChance = "0%";
            if (data.rain && data.rain["1h"]) {
                rainChance = `${data.rain["1h"] * 100}%`;
            }

            const iconCode = data.weather[0].icon;
            const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

            document.getElementById('weather-result').innerHTML = `
                <div class="weather-box">
                    <div class="place">${data.name}, ${data.sys.country}</div>
                    <div class="weather-details">
                        <img src="${iconUrl}" alt="Weather icon" class="weather-icon">
                        <div class="temperature">${data.main.temp}°</div>
                        <div class="weather-desc">${data.weather[0].description}</div>
                        <div class="date">${day}, ${date}</div>
                    </div>
                    <div class="air">
                    <div class="air-quality">☁️Air Quality</div>
                    <div id="reload-icon" onclick="reloadWeather()">🔄</div>

                        <div class="feature"><div class="icon">🌡️ </div><div><strong>Real Feel</strong> <p>${data.main.feels_like}°C</p></div></div>
                        <div class="feature"><div class="icon">💨</div> <div><strong>Wind Speed</strong> <p>${data.wind.speed} m/s</p></div></div>
                        <div class="feature"><div class="icon">☔ </div><div><strong>Chance of Rain</strong> <p>${rainChance}</p></div></div>
                        <div class="feature"><div class="icon">🌞</div> <div><strong>UV Index</strong> <p>${uvIndex ?? "N/A"}</p></div></div>
                    </div>
                     <!-- Weekly Forecast Section -->
                    <div id="weekly-forecast" ></div>
                </div>
                </div>

               
            `;

            // Fetch and display weekly forecast
            getWeeklyForecast(lat, lon);
            
        } else {
            document.getElementById('weather-result').innerHTML = `<p>Error: ${data.message}</p>`;
        }
    } catch (error) {
        document.getElementById('weather-result').innerHTML = `<p>Network error. Try again!</p>`;
    }
}

window.onload = () => {
    getWeather();
};

async function getWeeklyForecast(lat, lon) {
    const apiKey = '32cfef926928d9e951e538ed0f1cb2a9'; // Replace with your actual API key
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.cod === "200") {
            const dailyForecasts = {};

            // Group forecasts by day
            data.list.forEach(entry => {
                const dateObj = new Date(entry.dt * 1000); // Create Date object
                const date = dateObj.toLocaleDateString("en-US", { weekday: 'short' });
                const fullDate = dateObj.toLocaleDateString('en-UK', { day: 'numeric', month: 'short' });

                if (!dailyForecasts[date]) {
                    dailyForecasts[date] = {
                        fullDate: fullDate,
                        mainTemp: entry.main.temp, // Main temperature of the day
                        minTemp: entry.main.temp_min,
                        maxTemp: entry.main.temp_max,
                        description: entry.weather[0].description,
                        icon: entry.weather[0].icon
                    };
                } else {
                    dailyForecasts[date].minTemp = Math.min(dailyForecasts[date].minTemp, entry.main.temp_min);
                    dailyForecasts[date].maxTemp = Math.max(dailyForecasts[date].maxTemp, entry.main.temp_max);
                }
            });

            // Generate forecast HTML
            let forecastHTML = '<h2 class="weekly-forecast"> Weekly Forecast</h2><div class="forecast-container">';
            for (const [day, details] of Object.entries(dailyForecasts).slice(0, 4)) { // Limit to 5-day forecast
                forecastHTML += `
                    <div class="forecast-item">
                        <p class="forecast-day">${day}</p>
                         <p class="full-date">${details.fullDate}</p>
                        <img src="https://openweathermap.org/img/wn/${details.icon}@2x.png" alt="${details.description}">
                        
                        <p><strong>${details.mainTemp}°</strong></p>
                    </div>
                `;
            }
            forecastHTML += '</div>';

            document.getElementById('weekly-forecast').innerHTML = forecastHTML;
        }
    } catch (error) {
        console.error("Error fetching weekly forecast:", error);
        document.getElementById('weekly-forecast').innerHTML = "<p>Could not load forecast</p>";
    }
}
