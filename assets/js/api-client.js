const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
require('dotenv').config();

const API_KEY = process.env.API_SECRET_KEY;
const DEFAULT_TIMEOUT_MS = 10000; // 10 seconds

async function fetchWithAuth(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  const headers = {
    ...(options.headers || {}),
    'X-API-KEY': API_KEY,
  };

  const finalOptions = {
    ...options,
    headers,
    signal: controller.signal,
  };

  // console.log(`📡 Requesting: ${url}`);
  // console.log(`➡️ Method: ${finalOptions.method || 'GET'}`);
  // console.log(`➡️ Headers:`, finalOptions.headers);

  try {
    const response = await fetch(url, finalOptions);
    clearTimeout(timeout);

    console.log(`✅ Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`❌ Request failed: ${response.status} - ${errBody}`);
    }

    const data = await response.json();
    console.log(`📦 Response received for ${url}`);
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error(`⏱️ Timeout: Request to ${url} exceeded ${DEFAULT_TIMEOUT_MS / 1000}s`);
    } else {
      console.error(`❌ Error during fetch: ${err.message}`);
    }
    throw err;
  }
}

module.exports = fetchWithAuth;
