// generate-robots.js
const fs = require('fs-extra');
const path = require('path');

const content = `User-agent: *
Disallow:

Sitemap: https://ragadecode.com/sitemap.xml
`;

fs.outputFile(path.join(__dirname, 'robots.txt'), content)
  .then(() => console.log('✅ robots.txt generated'))
  .catch(err => console.error('❌ Error generating robots.txt:', err));
