const fs = require('fs-extra');
const path = require('path');
const fetch = require('../../assets/js/api-client');
const { marked } = require('marked');

const TEMPLATE_PATH = path.join(__dirname, '../../templates/author_template.html');
const OUTPUT_DIR = path.join(__dirname, '../../authors');
const BASE_DOMAIN = 'https://ragadecode.com';
const API_CONFIG= require("../../assets/js/api-config");
const AUTHORS_API = API_CONFIG.AUTHORS_API;
const headerHtml = fs.readFileSync(path.join(__dirname, "../../templates/header.html"), "utf-8");
const footerHtml = fs.readFileSync(path.join(__dirname, "../../templates/footer.html"), "utf-8");

const analyticsScript = `
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-QEL34RBXBH"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-QEL34RBXBH');
</script>`;

(async () => {
  try {
    const template = await fs.readFile(TEMPLATE_PATH, 'utf8');
    const res = await fetch(AUTHORS_API);
    const { data } = await res.json();

    await fs.ensureDir(OUTPUT_DIR);

    for (const author of data) {
      const attrs = author || {};
      const title = attrs.name || 'Unknown Author';
      const slug = attrs.slug || 'unknown-author';
      const nickname = attrs.nick || title;
      const bio = attrs.bio || 'No bio available.';
      const fb = attrs.facebook || '#';
      const twitter = attrs.twitter || '#';
      const instagram = attrs.instagram || '#';
      const linkedin = attrs.linkedin || '#'; 
      const email = attrs.email || '-';

      const profileImgUrl = attrs.profile_image?.formats?.small?.url || attrs.profile_image?.url || '';
      const coverImageBlock = profileImgUrl
        ? `<img class="cover-image" src="${profileImgUrl}" alt="${title}" loading="lazy" />`
        : '';

      const bioHtml = marked.parse(bio);

 

      const finalHtml = template
        .replace(/{{TITLE}}/g, title)
        .replace(/{{facebook}}/g, fb)
        .replace(/{{twitter}}/g, twitter)
        .replace(/{{instagram}}/g, instagram)
        .replace(/{{linkedin}}/g, linkedin)
        .replace(/{{email}}/g, email)
        .replace(/{{BIO}}/g, bioHtml)
        .replace(/{{GA_SCRIPT}}/g, analyticsScript)
        .replace(/{{BASE_DOMAIN}}/g, BASE_DOMAIN)
        .replace(/{{SLUG}}/g, slug)
        .replace(/{{SLUG_PREFIX}}/g, 'authors')
        .replace(/{{NICKNAME}}/g, nickname)
        .replace(/{{HEADER}}/g, headerHtml)
        .replace(/{{FOOTER}}/g, footerHtml)
        .replace(/{{COVER_IMAGE_URL}}/g, profileImgUrl);

      const outputPath = path.join(OUTPUT_DIR, `${slug}.html`);
      await fs.writeFile(outputPath, finalHtml);
      console.log(`✅ Generated author page: ${outputPath}`);
    }
  } catch (err) {
    console.error('❌ Author page generation failed:', err);
  }
})();