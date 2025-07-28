const fs = require('fs-extra');
const path = require('path');

const metalsCachePath = path.join(__dirname, '../../metals_cache.json');
const headerTemplatePath = path.join(__dirname, '../../templates/header.template.html');
const headerPath = path.join(__dirname, '../../templates/header.html');

(async () => {
  try {
    let goldPrice = 'N/A';
    let silverPrice = 'N/A';

    if (fs.existsSync(metalsCachePath)) {
      const metalsData = JSON.parse(await fs.readFile(metalsCachePath, 'utf-8'));
      goldPrice = metalsData?.metals?.gold ? metalsData.metals.gold.toFixed(2) : 'N/A';
      silverPrice = metalsData?.metals?.silver ? metalsData.metals.silver.toFixed(2) : 'N/A';
    }

    if (!fs.existsSync(headerTemplatePath)) {
      console.error('❌ header.template.html not found!');
      return;
    }

    let headerHtml = await fs.readFile(headerTemplatePath, 'utf-8');
    headerHtml = headerHtml
      .replace(/{{GOLD_PRICE}}/g, goldPrice)
      .replace(/{{SILVER_PRICE}}/g, silverPrice);

    await fs.writeFile(headerPath, headerHtml);
    console.log(`✅ header.html updated: Gold ₹${goldPrice}, Silver ₹${silverPrice}`);
  } catch (err) {
    console.error('❌ Error updating header.html:', err);
  }
})();
