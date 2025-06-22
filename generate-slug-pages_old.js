const fs = require('fs-extra');
const path = require('path');
const marked = require('marked');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// const API_URL = 'https://genuine-compassion-eb21be0109.strapiapp.com/api/news-articles?populate[coverimage][populate]=*';
const API_URL = 'http://localhost:1337/api/news-articles?populate[coverimage][populate]=*';
const TEMPLATE_PATH = './template.html';
const OUTPUT_DIR = './news-article';
const BASE_IMAGE_URL = '';

(async () => {
  try {
    const res = await fetch(API_URL);
    const { data } = await res.json();

    // Google Analytics snippet
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
 

    const template = await fs.readFile(TEMPLATE_PATH, 'utf8');
    await fs.ensureDir(OUTPUT_DIR);

    for (const article of data) {
      const attrs = article.attributes || article;
      const title = attrs.Title || 'Untitled';
      const slug = attrs.slug;
      const documentId = attrs.documentId;
      const description = attrs.Description || 'Latest news from RagaDecode — decoded by Raga';
      const markdown = attrs.Description_in_detail || '*No content available*';
      const tags = attrs.Tags || '';

 
      let coverImageBlock = '';
      let coverImageUrl = null;

      if (attrs.coverimage && attrs.coverimage.url) {
        const imageData = attrs.coverimage;
        const mediumFormatUrl = imageData.formats?.medium?.url;
        const originalUrl = imageData.url;

        const relativeUrl = mediumFormatUrl || originalUrl;
        coverImageUrl = relativeUrl ? `${BASE_IMAGE_URL}${relativeUrl}` : null;

        if (coverImageUrl) {
          coverImageBlock = `<img class="cover-image" src="${coverImageUrl}" alt="${title}" loading="lazy" />`;
        }

      } else {
        console.log(`→ No cover image for: ${title}`);
      }



      if (!slug || !documentId) {
        console.warn(`⚠️ Skipping: Missing slug or documentId for ID ${article.id}`);
        continue;
      }

      // Convert Markdown to HTML
      const contentHTML = marked.parse(markdown);

      // Convert tags to anchor elements
      const tagHtml = tags
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean)
        .map(tag => `<a href="#">#${tag}</a>`)
        .join(' ');

      // Replace all placeholders in template
      const pageHTML = template
        .replace(/{{TITLE}}/g, title)
        .replace(/{{DESCRIPTION}}/g, description)
        .replace(/{{COVER_IMAGE_BLOCK}}/g, coverImageBlock)
        .replace(/{{COVER_IMAGE_URL}}/g, coverImageUrl || '')
        .replace(/{{CONTENT}}/g, contentHTML)
        .replace(/{{TAGS}}/g, tagHtml)
        .replace(/{{SLUG}}/g, slug)
        .replace(/{{DOC_ID}}/g, documentId)
        .replace(/{{GA_SCRIPT}}/g, analyticsScript);

      const outputPath = path.join(OUTPUT_DIR, `${slug}.html`);
      await fs.writeFile(outputPath, pageHTML);

      console.log(`✅ Generated: news-article/${slug}.html`);
    }

    console.log('🎉 All SEO-friendly pages generated!');
  } catch (err) {
    console.error('❌ Generation failed:', err);
  }
})();
