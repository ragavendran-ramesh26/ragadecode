const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
require('dotenv').config();

const API_KEY = process.env.API_SECRET_KEY;

async function fetchWithAuth(url, options = {}) {
  const headers = {
    ...(options.headers || {}),
    'X-API-KEY': API_KEY,
  };

  const finalOptions = {
    ...options,
    headers,
  };

  return fetch(url, finalOptions);
}

module.exports = fetchWithAuth;
