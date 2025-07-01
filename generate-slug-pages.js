
const fs = require('fs-extra');

const dotenvPath = fs.existsSync('.env.local') ? '.env.local' : '.env';
require('dotenv').config({ path: dotenvPath });

const path = require('path');
const marked = require('marked');
const crypto = require('crypto');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));


const BASE_DOMAIN = 'ragadecode.com';

const BASE_URL = `https://${BASE_DOMAIN}`;

const BASE_IMAGE_URL = ''; // Set to CDN base if needed
const TEMPLATE_PATH = './template.html';
const CACHE_FILE = './.article_cache.json';

// ✅ List of APIs to process
const API_CONFIGS = [
  {
    name: 'news-articles',
    apiUrl: 'https://genuine-compassion-eb21be0109.strapiapp.com/api/news-articles?sort[0]=publishedat:desc&sort[1]=id:desc&pagination[page]=1&pagination[pageSize]=100&populate[hashtags]=true&populate[author][populate][profile_image]=true&populate[coverimage]=true',

    outputDir: './news-article',
    slugPrefix: 'news-article',
  },
  {
    name: 'automobiles',
    apiUrl: 'https://genuine-compassion-eb21be0109.strapiapp.com/api/automobiles?sort[0]=publishedat:desc&sort[1]=id:desc&pagination[page]=1&pagination[pageSize]=100&populate[author][populate][profile_image]=true&populate[coverimage]=true',
    outputDir: './automobile',
    slugPrefix: 'automobile',
  },
  {
    name: 'technology',
    apiUrl: 'https://genuine-compassion-eb21be0109.strapiapp.com/api/technologies?sort[0]=publishedat:desc&sort[1]=id:desc&pagination[page]=1&pagination[pageSize]=100&populate[hashtags]=true&populate[author][populate][profile_image]=true&populate[coverimage]=true',
    outputDir: './technologies',
    slugPrefix: 'technologies',
  },
  {
    name: 'travels',
    apiUrl: 'https://genuine-compassion-eb21be0109.strapiapp.com/api/tourism-travel-trips?sort[0]=publishedat:desc&sort[1]=id:desc&pagination[page]=1&pagination[pageSize]=100&populate[hashtags]=true&populate[author][populate][profile_image]=true&populate[coverimage]=true',
    outputDir: './tourism-travel-trips',
    slugPrefix: 'tourism-travel-trips',
  },
  {
    name: 'finances',
    apiUrl: 'https://genuine-compassion-eb21be0109.strapiapp.com/api/finances?sort[0]=publishedat:desc&sort[1]=id:desc&pagination[page]=1&pagination[pageSize]=100&populate[hashtags]=true&populate[author][populate][profile_image]=true&populate[coverimage]=true',
    outputDir: './finances',
    slugPrefix: 'finances',
  }
];





function buildLDJson({ 
  title, 
  coverImageUrl, 
  publishedRaw, 
  lastModifiedUTC, 
  authorName, 
  authorSlug, 
  slugPrefix, 
  slug, 
  description,
  category,
  keywords,
  schema_details
}) {
  const publishedISO = new Date(publishedRaw).toISOString();
  
  // Base schema common to all types
  const baseSchema = {
    "@context": "https://schema.org",
    "headline": title,
    "description": description,
    "datePublished": publishedISO,
    "dateModified": lastModifiedUTC,
    "author": {
      "@type": "Person",
      "name": authorName,
      "url": `${BASE_URL}/authors/${authorSlug}`
    },
    "publisher": {
      "@type": "Organization",
      "name": "RagaDecode",
      "logo": {
        "@type": "ImageObject",
        "url": `${BASE_URL}/ragadecode_logo.png`
      }
    },
    "image": {
      "@type": "ImageObject",
      "url": coverImageUrl,
      "width": "1200",
      "height": "630"
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${BASE_URL}/${slugPrefix}/${slug}`
    }
  };

  // Category-specific overrides
  let categorySchema;
  switch(category) {
    case 'news-article':
      categorySchema = {
        "@type": "NewsArticle",
        "keywords": keywords || ["news", "trending"],
      };
      break;
      
    case 'technologies':
      categorySchema = {
        "@type": "TechArticle",
        "keywords": keywords,
        "proficiencyLevel": "Beginner"
      };
      break;
      
    case 'tourism-travel-trips':
      categorySchema = {
        "@type": "Article",
        "keywords": keywords,
        "location": {
          "@type": "Place",
          "name": schema_details // You might want to extract this from content
        }
      };
      break;
      
    case 'finances':
      categorySchema = {
        "@type": "Article",
        "keywords": keywords,
        "speakable": {
          "@type": "SpeakableSpecification",
          "xPath": ["/html/head/title", "/html/head/meta[@name='description']/@content"]
        }
      };
      break;
      
    case 'automobile':
      // Check content type from title/description
      const isNews = title.includes('Launch') || description.includes('announced') || description.includes('Unveiled');
      const isComparison = title.includes('vs') || title.includes('comparison');
      
      if (isNews) {
        categorySchema = {
          "@type": "NewsArticle",
          "keywords": keywords
        };
      } 
      else if (isComparison) {
        categorySchema = {
          "@type": "Article",
          "keywords": keywords,
          "about": {
            "@type": "Product",
            "name": schema_details
          }
        };
      }
      else {
        // Default for general articles
        categorySchema = {
          "@type": "Article",
          "keywords": keywords
        };
      }
      break;
      
    default:
      categorySchema = {
        "@type": "Article"
      };
  }

  // Merge base schema with category-specific schema
  const finalSchema = {...baseSchema, ...categorySchema};
  
  return `<script type="application/ld+json">
${JSON.stringify(finalSchema, null, 2)}
</script>`;
}

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

    let cache = {};
    if (await fs.pathExists(CACHE_FILE)) {
      cache = await fs.readJson(CACHE_FILE);
    }

    for (const config of API_CONFIGS) {
      console.log(`🔄 Fetching articles for ${config.name}...`);
      const res = await fetch(config.apiUrl);
      const { data } = await res.json();

      await fs.ensureDir(config.outputDir);

      for (const article of data) {
        const attrs = article.attributes || article;
        const title = attrs.Title || 'Untitled';
        const slug = attrs.slug;
        const documentId = attrs.documentId || article.id;
        const description = attrs.short_description || title;
        const category = attrs.category || '';

        const keywords = attrs.Tags 
        ? attrs.Tags.split(',').map(tag => tag.trim()) 
        : [];

        const schema_details = attrs.schema || '';
 


        const markdown = attrs.Description_in_detail || '*No content available*';
        // const tags = attrs.Tags || '';

        const publishedRaw = attrs.publishedat || attrs.publishedAt || attrs.createdAt;
        const published = new Date(publishedRaw).toLocaleDateString("en-IN", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }); 

        const publisedISO = new Date(publishedRaw);

        const lastModifiedRaw = attrs.publishedAt; // Use updatedAt if available
        const lastModifiedDate = new Date(lastModifiedRaw);
        const lastModifiedISO = lastModifiedDate.toISOString().split('T')[0]; // "YYYY-MM-DD"

        // For meta tags (UTC format)
        const lastModifiedUTC = lastModifiedDate.toISOString(); // Full UTC timestamp
        const publishedUTC = publisedISO.toISOString(); // Full UTC timestamp

         // Check cache
        const cacheKey = `${config.name}-${documentId}`;
        if (cache[cacheKey] === attrs.updatedAt) {
          console.log(`⏩ Skipping unchanged: ${slug}`);
          continue;
        }


        let authorBlock = '';

        if (attrs.author) {
          const author = attrs.author || {};
          const authorName = author.name || 'Unknown Author';
          const authorSlug = author.slug || '';
          const authorNick = author.nick || authorName;
          const authorBio = author.bio || '';
          const profileImgUrl =
            author.profile_image?.formats?.small?.url || author.profile_image?.url || '';

          const authorImageTag = profileImgUrl
            ? `<a href="/authors/${authorSlug}">
                <img src="${profileImgUrl}" alt="${authorName}" class="author-image" loading="lazy" />
              </a>`
            : '';

          authorBlock = `
            <div class="author-box">
              ${authorImageTag}
              <div class="author-details">
                <h3>Decoded by ${authorNick}</h3>
                <a href="/authors/${authorSlug}" class="author-link">About ${authorName}</a>
              </div>
            </div>
          `;
        }
       


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

        const contentHTML = marked.parse(markdown);

         const tagHtml = (attrs.hashtags || [])
        .map(tag => {
          const name = tag.name || '';
          const slug = name.toLowerCase().replace(/\s+/g, '-');
          return `<span><a href="/tags/${slug}">#${name}</a></span>`;
        })
        .join(' ');

         
        const relatedArticlesHtml = buildRelatedArticlesHtml(attrs);

        const relatedArticlesSection = relatedArticlesHtml
        ? `<div class="related-articles">
              <h3>Related Articles</h3>
              <div class="related-box">
                <ul>
                  ${relatedArticlesHtml}
                </ul>
              </div>
          </div>`
        : '';

        console.log(attrs.author.name)

        const ldJsonScript = buildLDJson({
          title,
          coverImageUrl,
          publishedRaw,
          lastModifiedUTC,
          authorName: attrs.author?.name || 'Ragavendran Ramesh',
          authorSlug: attrs.author?.slug || 'ragavendran-ramesh',
          slugPrefix: config.slugPrefix,
          slug,
          description,
          category,
          keywords,
          schema_details
        });
        
        const pageHTML = template
          .replace(/{{STRUCTURED_DATA_JSON}}/g, ldJsonScript)
          .replace(/{{TITLE}}/g, title)
          .replace(/{{DESCRIPTION}}/g, description)
          .replace(/{{PUBLISHED_DATE}}/g, published)
          .replace(/{{PUBLISED_ON}}/g, publishedRaw)
          .replace(/{{LAST_MODIFIED}}/g, lastModifiedISO || publishedRaw)
          .replace(/{{LAST_MODIFIED_UTC}}/g, lastModifiedUTC || publishedRaw)
          .replace(/{{PUBLISHED_UTC}}/g, publishedUTC || publishedRaw)
          .replace(/{{COVER_IMAGE_BLOCK}}/g, coverImageBlock)
          .replace(/{{COVER_IMAGE_URL}}/g, coverImageUrl)
          .replace(/{{CONTENT}}/g, contentHTML)
          .replace(/{{AUTHOR_NAME}}/g, attrs.author?.name || 'Ragavendran Ramesh')
          .replace(/{{AUTHOR_SLUG}}/g, attrs.author?.slug || 'ragavendran-ramesh')
          .replace(/{{AUTHOR_BLOCK}}/g, authorBlock)
          .replace(/{{TAGS}}/g, tagHtml) // ✅ Insert tags
          .replace(/{{SLUG}}/g, slug)
          .replace(/{{DOC_ID}}/g, documentId)
          .replace(/{{SLUG_PREFIX}}/g, config.slugPrefix)
          .replace(/{{BASE_DOMAIN}}/g, BASE_URL)
          .replace(/{{GA_SCRIPT}}/g, analyticsScript)
          .replace(/{{RELATED_ARTICLES_SECTION}}/g, relatedArticlesSection);
       
        

        const outputPath = path.join(config.outputDir, `${slug}.html`); 
        await fs.writeFile(outputPath, pageHTML);
        console.log(`✅ Generated: ${outputPath}`);
        cache[cacheKey] = attrs.updatedAt;
      }

      console.log(`🎉 All pages processed for ${config.name}`);
    }
      await fs.writeJson(CACHE_FILE, cache, { spaces: 2 });
  } catch (err) {
    console.error('❌ Generation failed:', err);
  }
})();
