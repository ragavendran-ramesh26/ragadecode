// scripts/generate-media-list.js
const fs = require('fs-extra');
const path = require('path');
const API_CONFIG = require('../../assets/js/api-config');
const fetchWithAuth = require('../../assets/js/api-client');

const SEARCH_MEDIA = API_CONFIG.SEARCH_MEDIA;
const OUTPUT_PATH = path.join(__dirname, '../data/media.json');

async function generateMediaList() {
  try {
    const mediaList = await fetchWithAuth(`${SEARCH_MEDIA}?search=affiliate`);
    if (!Array.isArray(mediaList)) throw new Error("Invalid media response");

    await fs.ensureDir(path.dirname(OUTPUT_PATH));
    await fs.writeJSON(OUTPUT_PATH, mediaList, { spaces: 2 });

    console.log(`✅ Media list written to ${OUTPUT_PATH}`);
  } catch (err) {
    console.error("❌ Failed to generate media list:", err.message);
  }
}

generateMediaList();
