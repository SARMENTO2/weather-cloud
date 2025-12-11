// src/index.js
const express = require('express');
const axios  = require('axios');
const path   = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = process.env.OPENWEATHER_KEY || 'demo'; // gratis em https://openweathermap.org/api
const CITY    = 'SaoPaulo,BR';
let cache   = [];           // “banco de dados” em memória

// ---------- Ingestão + Processamento ----------
async function fetchWeather() {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${CITY}&units=metric&appid=${API_KEY}`;
    const { data } = await axios.get(url);
    const record = {
      city: data.name,
      temp: data.main.temp,
      humidity: data.main.humidity,
      ts: new Date().toISOString()
    };
    cache.push(record);
    if (cache.length > 100) cache.shift();        // limite simples
    console.log('[INGEST] ', record);
  } catch (e) {
    console.error('[INGEST ERROR]', e.message);
  }
}
setInterval(fetchWeather, 5 * 60 * 1000);          // 5 min
fetchWeather();                                    // primeira carga

// ---------- API ----------
app.get('/weather', (req, res) => res.json(cache.at(-1) || {}));
app.get('/weather/history', (req, res) => res.json(cache));

// ---------- Dashboard (SSE) ----------
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  const fn = () => res.write(`data: ${JSON.stringify(cache.at(-1))}\n\n`);
  const id = setInterval(fn, 5000);
  req.on('close', () => clearInterval(id));
});

app.listen(PORT, () => console.log(`Running on ${PORT}`));