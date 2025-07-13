
const fs = require('fs-extra');

const dotenvPath = fs.existsSync('.env.local') ? '.env.local' : '.env';
require('dotenv').config({ path: dotenvPath });

const path = require('path');
const marked = require('marked');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));


const BASE_DOMAIN = 'ragadecode.com';

const BASE_URL = `https://${BASE_DOMAIN}`;

const BASE_IMAGE_URL = ''; // Set to CDN base if needed
const TEMPLATE_PATH = path.join(__dirname, '../../templates/template_static.html');
const headerHtml = fs.readFileSync(path.join(__dirname, "../../templates/header.html"), "utf-8");
const footerHtml = fs.readFileSync(path.join(__dirname, "../../templates/footer.html"), "utf-8");
const API_CONFIG_URL= require("../../assets/js/api-config");


// ✅ List of APIs to process
const API_CONFIGS = [
  {
    name: 'static-pages',
    apiUrl: API_CONFIG_URL.STATIC_PAGES_API,
    outputDir: path.join(__dirname, '../../static-pages'),
  }
];

function buildRelatedArticlesHtml(attrs) {
  const related = [...(attrs.similar_articles || []), ...(attrs.news_articles || [])];

  if (!related.length) return '';

  return related.map(item => {
    const relatedTitle = item.Title || 'Untitled';
    const relatedSlug = item.slug || '';
    const itemCategory = (item.category || '').toLowerCase().trim().replace(/\s+/g, '-');
    if (!itemCategory || !relatedSlug) return '';
    return `<li><a href="/${itemCategory}/${relatedSlug}" class="related-link">${relatedTitle}</a></li>`;
  }).join('');
}

(async () => {
  try {
    const template = await fs.readFile(TEMPLATE_PATH, 'utf8');

    const analyticsScript = `
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-QEL34RBXBH"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-QEL34RBXBH');
</script>
`;

    for (const config of API_CONFIGS) {
      console.log(`🔄 Fetching articles for ${config.name}...`);
      const res = await fetch(config.apiUrl);
      const { data } = await res.json();

      await fs.ensureDir(config.outputDir);

      for (const article of data) {
        const attrs = article.attributes || article;
        const title = attrs.Title || 'Untitled';
        const slug = attrs.slug;
        const category = attrs.category?.toLowerCase() || ''; 
        const createdAt = attrs.created_date || '';
        const documentId = attrs.documentId || article.id;
        const description = attrs.content;
        const markdown = attrs.content || '*No content available*';
     
        const contentHTML = marked.parse(markdown);

          
         
       
        
        const pageHTML = template
          .replace(/{{TITLE}}/g, title)
          .replace(/{{DESCRIPTION}}/g, description)
          
          .replace(/{{CONTENT}}/g, contentHTML)
           
          .replace(/{{SLUG}}/g, slug)
          .replace(/{{DOC_ID}}/g, documentId)
          .replace(/{{SLUG_PREFIX}}/g, config.slugPrefix)
          .replace(/{{BASE_DOMAIN}}/g, BASE_URL)
          .replace(/{{GA_SCRIPT}}/g, analyticsScript)
          .replace(/{{HEADER}}/g, headerHtml)
          .replace(/{{FOOTER}}/g, footerHtml)
            

        const outputPath = path.join(config.outputDir, `${slug}.html`);
        await fs.writeFile(outputPath, pageHTML);
        console.log(`✅ Generated: ${config.outputDir}/${slug}.html`);
      }

      console.log(`🎉 All pages generated for ${config.name}`);
    }
  } catch (err) {
    console.error('❌ Generation failed:', err);
  }
})();
