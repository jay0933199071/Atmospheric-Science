document.addEventListener('DOMContentLoaded', () => {
    const navLinks = {
       welcome: document.getElementById('welcome-content'),
        temperature: document.getElementById('nav-temperature'),
        weather: document.getElementById('nav-weather'),
        earthquake: document.getElementById('nav-earthquake'),
    };

    const contentSections = {
        welcome: document.getElementById('welcome-content'),
        temperature: document.getElementById('temperature-content'),
        weather: document.getElementById('weather-content'),
        earthquake: document.getElementById('earthquake-content'), 
        
    };

    const weatherDetailsEl = document.getElementById('weather-details');
    const temperatureDetailsEl = document.getElementById('temperature-details');
    const earthquakeDetailsEl = document.getElementById('earthquake-details');

    // --- IMPORTANT: Replace with your CWA API Key ---
    // Obtain from: https://opendata.cwa.gov.tw/devManual/auth
    const CWA_API_KEY = 'CWA-2620B5E8-69A8-4D03-9E30-BF48A24C2407'; // Example: 'CWA-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'
    const API_NOTE_MESSAGE = `
        <div class="api-key-note">
            請注意：您需要在此處 (script.js) 填入有效的中央氣象署 API 金鑰 (CWA_API_KEY) 才能獲取天氣資料。
            <br>請至 <a href="https://opendata.cwa.gov.tw/devManual/auth" target="_blank">CWA 開放資料平臺</a> 申請。
            當前金鑰: ${CWA_API_KEY === 'YOUR_CWA_API_KEY' ? '尚未設定' : '已設定 (但可能無效)'}
        </div>`;
    
const homeLink = document.getElementById('nav-home');
if (homeLink) {
    homeLink.addEventListener('click', (e) => {
        e.preventDefault();
        showContent('welcome-content');
        window.scrollTo({
            top: 0,
            behavior: 'smooth' // 可改成 'auto' 如果不想要動畫
        });
    });
}



    let currentWeatherData = null; 

    function showContent(sectionId) {
        Object.values(navLinks).forEach(link => link.classList.remove('active'));
        Object.values(contentSections).forEach(section => section.style.display = 'none');
        
        if (navLinks[sectionId]) {
            navLinks[sectionId].classList.add('active');
        }
        if (contentSections[sectionId]) {
            contentSections[sectionId].style.display = 'block';
        } else if (contentSections.welcome) { // Fallback to welcome if sectionId is invalid
             contentSections.welcome.style.display = 'block';
        }
    }

    async function fetchWeatherData() {
        if (CWA_API_KEY === 'YOUR_CWA_API_KEY') {
            const message = 'API 金鑰未設定。無法獲取天氣資料。' + API_NOTE_MESSAGE;
            if (weatherDetailsEl) weatherDetailsEl.innerHTML = message;
            if (temperatureDetailsEl) temperatureDetailsEl.innerHTML = message;
            return;
        }

        const locationName = '臺北市'; // Target location
        // F-C0032-001: 鄉鎮天氣預報-全臺灣各鄉鎮市區預報資料 (provides 3-hour forecasts)
        const apiUrl = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001?Authorization=${CWA_API_KEY}&locationName=${encodeURIComponent(locationName)}&elementName=Wx,PoP,MinT,MaxT,CI`;

        try {
            if (weatherDetailsEl) weatherDetailsEl.innerHTML = '正在更新天氣數據...';
            if (temperatureDetailsEl) temperatureDetailsEl.innerHTML = '正在更新溫度數據...';

            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`API 請求失敗: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();

            if (data.success !== 'true' || !data.records || !data.records.location || data.records.location.length === 0) {
                console.error('CWA API 錯誤或無效資料:', data);
                throw new Error('從 API 收到的資料格式不符預期。');
            }
            
            currentWeatherData = data.records.location[0]; // Assuming first location is Taipei
            displayWeatherData();
            displayTemperatureData();

        } catch (error) {
            console.error('獲取天氣資料時發生錯誤:', error);
            const errorMessage = `無法載入天氣資料：${error.message}。請檢查 API 金鑰是否正確以及網路連線。` + API_NOTE_MESSAGE;
            if (weatherDetailsEl) weatherDetailsEl.innerHTML = errorMessage;
            if (temperatureDetailsEl) temperatureDetailsEl.innerHTML = errorMessage;
        }
    }

    function displayWeatherData() {
        if (!currentWeatherData) {
            weatherDetailsEl.innerHTML = '天氣資料尚未載入。' + (CWA_API_KEY === 'YOUR_CWA_API_KEY' ? API_NOTE_MESSAGE : '');
            return;
        }

        const locationName = currentWeatherData.locationName;
        const weatherElements = {};
        currentWeatherData.weatherElement.forEach(el => {
            weatherElements[el.elementName] = el.time;
        });

        // For simplicity, we'll display the first time period's data.
        // The API provides multiple time periods (e.g., 3-hour intervals).
        // Wx, PoP, MinT, MaxT, CI might have different numbers of time entries or cover different durations.
        // We'll try to get the first available data for each.

        const wxData = weatherElements.Wx && weatherElements.Wx.length > 0 ? weatherElements.Wx[0] : null;
        const popData = weatherElements.PoP && weatherElements.PoP.length > 0 ? weatherElements.PoP[0] : null; // PoP is usually for 12-hour periods
        const minTData = weatherElements.MinT && weatherElements.MinT.length > 0 ? weatherElements.MinT[0] : null;
        const maxTData = weatherElements.MaxT && weatherElements.MaxT.length > 0 ? weatherElements.MaxT[0] : null;

        let html = `<div class="weather-item"><strong>地點:</strong> ${locationName}</div>`;

        if (wxData) {
            html += `<div class="weather-item"><strong>天氣現象:</strong> ${wxData.parameter.parameterName} (${formatTime(wxData.startTime)} - ${formatTime(wxData.endTime)})</div>`;
        } else {
            html += `<div class="weather-item"><strong>天氣現象:</strong> 資料不足</div>`;
        }

        if (popData) { // PoP (Probability of Precipitation) might cover a longer period
             html += `<div class="weather-item"><strong>降雨機率:</strong> ${popData.parameter.parameterName}% (${formatTime(popData.startTime)} - ${formatTime(popData.endTime)})</div>`;
        } else {
            html += `<div class="weather-item"><strong>降雨機率:</strong> 資料不足</div>`;
        }
        
        let tempRange = "資料不足";
        if (minTData && maxTData) {
             tempRange = `${minTData.parameter.parameterName}°C - ${maxTData.parameter.parameterName}°C`;
        } else if (minTData) {
             tempRange = `最低 ${minTData.parameter.parameterName}°C`;
        } else if (maxTData) {
             tempRange = `最高 ${maxTData.parameter.parameterName}°C`;
        }
        html += `<div class="weather-item"><strong>溫度範圍:</strong> ${tempRange}</div>`;
        
        if (CWA_API_KEY === 'YOUR_CWA_API_KEY') {
            html += API_NOTE_MESSAGE;
        }

        weatherDetailsEl.innerHTML = html;
    }

    function displayTemperatureData() {
        if (!currentWeatherData) {
            temperatureDetailsEl.innerHTML = '溫度資料尚未載入。' + (CWA_API_KEY === 'YOUR_CWA_API_KEY' ? API_NOTE_MESSAGE : '');
            return;
        }

        const weatherElements = {};
        currentWeatherData.weatherElement.forEach(el => {
            weatherElements[el.elementName] = el.time;
        });

        const minTData = weatherElements.MinT && weatherElements.MinT.length > 0 ? weatherElements.MinT[0] : null;
        const maxTData = weatherElements.MaxT && weatherElements.MaxT.length > 0 ? weatherElements.MaxT[0] : null;
        const ciData = weatherElements.CI && weatherElements.CI.length > 0 ? weatherElements.CI[0] : null; // Comfort Index

        let html = `<h3>${currentWeatherData.locationName} 溫度詳情</h3>`;

        if (minTData) {
            html += `<div class="weather-item"><strong>最低溫度:</strong> ${minTData.parameter.parameterName}°C (${formatTime(minTData.startTime)} - ${formatTime(minTData.endTime)})</div>`;
        } else {
            html += `<div class="weather-item"><strong>最低溫度:</strong> 資料不足</div>`;
        }
        
        if (maxTData) {
            html += `<div class="weather-item"><strong>最高溫度:</strong> ${maxTData.parameter.parameterName}°C (${formatTime(maxTData.startTime)} - ${formatTime(maxTData.endTime)})</div>`;
        } else {
            html += `<div class="weather-item"><strong>最高溫度:</strong> 資料不足</div>`;
        }

        if (ciData) {
            html += `<div class="weather-item"><strong>舒適度:</strong> ${ciData.parameter.parameterName} (${formatTime(ciData.startTime)} - ${formatTime(ciData.endTime)})</div>`;
        } else {
            html += `<div class="weather-item"><strong>舒適度:</strong> 資料不足</div>`;
        }
        
        if (CWA_API_KEY === 'YOUR_CWA_API_KEY') {
            html += API_NOTE_MESSAGE;
        }

        temperatureDetailsEl.innerHTML = html;
    }

   function formatTime(dateTimeStr) {
    const date = new Date(dateTimeStr);
    return date.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}// ... (其他現有函數，如 showContent, fetchWeatherData, displayWeatherData, displayTemperatureData)

let currentEarthquakeData = null; // 用於儲存獲取的地震資料

async function fetchEarthquakeData() {
    if (CWA_API_KEY === 'YOUR_CWA_API_KEY') {
        const message = 'API 金鑰未設定。無法獲取地震資料。' + API_NOTE_MESSAGE;
        if (earthquakeDetailsEl) earthquakeDetailsEl.innerHTML = message;
        return;
    }

    // E-A0015-001: 顯著有感地震報告
    const apiUrl = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/E-A0015-001?Authorization=${CWA_API_KEY}`;

    try {
        if (earthquakeDetailsEl) earthquakeDetailsEl.innerHTML = '正在更新地震數據...';

        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`API 請求失敗: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();

        if (data.success !== 'true' || !data.records || !data.records.Earthquake || data.records.Earthquake.length === 0) {
            console.error('CWA API 錯誤或無效地震資料:', data);
            throw new Error('從 API 收到的地震資料格式不符預期或無資料。');
        }

        currentEarthquakeData = data.records.Earthquake[0]; // 取最新的地震資料
        displayEarthquakeData();

    } catch (error) {
        console.error('獲取地震資料時發生錯誤:', error);
        const errorMessage = `無法載入地震資料：${error.message}。請檢查 API 金鑰是否正確以及網路連線。` + API_NOTE_MESSAGE;
        if (earthquakeDetailsEl) earthquakeDetailsEl.innerHTML = errorMessage;
    }
}

function displayEarthquakeData() {
    if (!currentEarthquakeData) {
        earthquakeDetailsEl.innerHTML = '地震資料尚未載入。' + (CWA_API_KEY === 'YOUR_CWA_API_KEY' ? API_NOTE_MESSAGE : '');
        return;
    }
    console.log(currentEarthquakeData);
    const eq = currentEarthquakeData;
    const eqTime = formatTime(eq.EarthquakeInfo?.OriginTime || '無資料');
    const eqLocation = eq.EarthquakeInfo?.Epicenter?.Location || '無資料';
    const eqMagnitude = eq.EarthquakeInfo?.EarthquakeMagnitude?.MagnitudeValue ?? '無資料';
    const eqDepth = eq.EarthquakeInfo?.FocalDepth ?? '無資料';

    let html = `
        <div class="earthquake-item"><strong>地震時間:</strong> ${eqTime}</div>
        <div class="earthquake-item"><strong>震央:</strong> ${eqLocation}</div>
        <div class="earthquake-item"><strong>規模:</strong> ${eqMagnitude}</div>
        <div class="earthquake-item"><strong>深度:</strong> ${eqDepth} 公里</div>
    `;
    earthquakeDetailsEl.innerHTML = html;
}


    // Event Listeners for navigation
    
    navLinks.temperature.addEventListener('click', (e) => {
        e.preventDefault();
        showContent('temperature');
        if (!currentWeatherData && CWA_API_KEY !== 'YOUR_CWA_API_KEY') fetchWeatherData(); // Fetch if not already loaded
        else if (currentWeatherData) displayTemperatureData(); // Refresh display if data exists
    });
    navLinks.weather.addEventListener('click', (e) => {
        e.preventDefault();
        showContent('weather');
        if (!currentWeatherData && CWA_API_KEY !== 'YOUR_CWA_API_KEY') fetchWeatherData(); // Fetch if not already loaded
        else if (currentWeatherData) displayWeatherData(); // Refresh display if data exists
    });
    navLinks.earthquake.addEventListener('click', (e) => { // 新增
    e.preventDefault();
    showContent('earthquake');
    if (!currentEarthquakeData && CWA_API_KEY !== 'YOUR_CWA_API_KEY') fetchEarthquakeData();
    else if (currentEarthquakeData) displayEarthquakeData();
    });

    // Initial setup
    showContent('welcome-content'); // Show welcome message by default
    fetchWeatherData(); // Fetch weather data on page load

    // Auto-refresh weather data every 30 minutes
    setInterval(fetchWeatherData, 30 * 60 * 1000);
});
   


