const fs = require('fs-extra');
const path = require('path');
// const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const marked = require('marked');

// Paths
const TEMPLATE_PATH = path.join(__dirname, '../../templates/homepage_template.html');
const OUTPUT_PATH = path.join(__dirname, '../../index.html');

const headerHtml = fs.readFileSync(path.join(__dirname, "../../templates/header.html"), "utf-8");
const footerHtml = fs.readFileSync(path.join(__dirname, "../../templates/footer.html"), "utf-8");
const API_CONFIG= require("../../assets/js/api-config");
const fetchWithAuth = require('../../assets/js/api-client');

// APIs
const API_URL = API_CONFIG.NEWS_ARTICLES;
const TAGS_API = API_CONFIG.TAGS_API
const COUNTRIES_API = API_CONFIG.COUNTRIES_API
const STATES_API = API_CONFIG.STATES_API
const CITIES_API = API_CONFIG.CITIES_API

const gaScript = `
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-QEL34RBXBH"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-QEL34RBXBH');
</script>
`;

function splitList(data, size = 6) {
  const result = [[], [], []];
  data.forEach((item, index) => {
    result[Math.floor(index / size)]?.push(item);
  });
  return result;
}

function splitCountries(countries) {
  const [col1, col2, col3] = splitList(countries);


   
  return `
    <div class="sub-columns">
      <ul>${col1.map(c => `<li><a href="/locations/${c.slug}">${c.title}</a></li>`).join('')}</ul>
      <ul>${col2.map(c => `<li><a href="/locations/${c.slug}">${c.title}</a></li>`).join('')}</ul>
      <ul>${col3.map(c => `<li><a href="/locations/${c.slug}">${c.title}</a></li>`).join('')}</ul>
    </div>
  `;
}

function splitStates(states) {
  const [col1, col2, col3] = splitList(states);

  return `
    <div class="sub-columns">
      <ul>${col1.map(s => `<li><a href="/locations/${s.country.slug}/${s.slug}">${s.title}</a></li>`).join('')}</ul>
      <ul>${col2.map(s => `<li><a href="/locations/${s.country.slug}/${s.slug}">${s.title}</a></li>`).join('')}</ul>
      <ul>${col3.map(s => `<li><a href="/locations/${s.country.slug}/${s.slug}">${s.title}</a></li>`).join('')}</ul>
    </div>
  `;
}

function splitCities(cities) {
  const [col1, col2, col3] = splitList(cities);
  const cityLink = (city) => {
    const country = city.state?.country?.slug || 'unknown';
    const state = city.state?.slug || 'unknown';
    return `<li><a href="/locations/${country}/${state}/${city.slug}">${city.title}</a></li>`;
  };
  return `
    <div class="sub-columns">
      <ul>${col1.map(cityLink).join('')}</ul>
      <ul>${col2.map(cityLink).join('')}</ul>
      <ul>${col3.map(cityLink).join('')}</ul>
    </div>
  `;
}

(async () => {
  try {
    // Fetch tags
    const tagRes = await fetchWithAuth(TAGS_API);
    const { data: tagData } = await tagRes.json();

     

    const tagBoxHtml = tagData.map(tag => {
      const name = tag.name || '';
      const slug = name.toLowerCase().replace(/\s+/g, '-');
      return `<span><a href="/tags/${slug}">#${name}</a></span>`;
    }).join('\n');

    // Fetch regions
    const [countriesRes, statesRes, citiesRes] = await Promise.all([
      fetchWithAuth(COUNTRIES_API),
      fetchWithAuth(STATES_API),
      fetchWithAuth(CITIES_API),
    ]);
    const { data: countriesData } = await countriesRes.json();
    const { data: statesData } = await statesRes.json();
    const { data: citiesData } = await citiesRes.json();


    statesData.forEach(s => {
      if (!s.country || !s.country.slug) {
        console.warn(`⚠️ State missing country slug: ${s.title}`);
      }
    });


    const regionHtml = `
      <section class="region-wrapper">
        <div class="section-title"><h3>Explore News by Location</h3></div>
        <div class="region-columns">
          <div class="region-column"><h4>Countries</h4>${splitCountries(countriesData)}</div>
          <div class="region-column"><h4>States</h4>${splitStates(statesData)}</div>
          <div class="region-column"><h4>Cities</h4>${splitCities(citiesData)}</div>
        </div>
        <div class="view-more-link"><a href="#">View More Locations →</a></div>
      </section>
    `;




    // Fetch articles
    const resp = await fetchWithAuth(API_URL);
    const { data: articles } = await resp.json();

    

    const metroCities = ['delhi', 'mumbai', 'chennai', 'kolkata', 'bangalore', 'hyderabad'];

    // Filter out articles tagged with any metro city
    const nonMetroArticles = articles.filter(article => {
      const cities = article.cities || [];
      return !cities.some(city => city?.slug && metroCities.includes(city.slug.toLowerCase()));
    });



  const section1Articles = articles
  .filter(a => {
    

    // ✅ CORRECT: loop through the hashtags array
    const isViralHashtag = (a.hashtags || []).some(tag =>
      tag.name?.toLowerCase() === 'viral'
    );

    const isIndian = (a.countries || []).some(country =>
      country.title?.toLowerCase() === 'india'
    ); 

    return isViralHashtag && isIndian;
  })
  .slice(0, 5);

const section1Html = `
<section class="section-1-feature py-5 border-bottom">
  <div class="container">
    <div id="heroCarousel" class="carousel slide" data-bs-ride="carousel" data-bs-interval="7000">
      
      <div class="carousel-inner">
        ${section1Articles.map((article, index) => {
          const image = article.coverimage?.url || '/assets/default.jpg';
          const title = article.Title;
          const slug = article.slug;
          const category = article.category?.slug || 'news-article';
          const author = article.author?.name || 'RagaDecode Editorial';
          const date = new Date(article.publishedat).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric'
          });
          const excerpt = marked.parse(article.short_description?.slice(0, 200) || '');

          const titleWords = title.split(' ');
          const lastWord = titleWords.pop();

          return `
            <div class="carousel-item ${index === 0 ? 'active' : ''}">
              <div class="row align-items-center g-4 flex-column flex-md-row">
                <div class="col-md-6">
                  <a href="/${category}/${slug}">
                    <img src="${image}" class="img-fluid rounded w-100" style="object-fit: cover; max-height: 400px;" alt="${title}">
                  </a>
                  <div class="mt-2"><small class="text-muted">By ${author} | ${date}</small></div>
                </div>
                <div class="col-md-6">
                  <a href="/${category}/${slug}" class="text-decoration-none text-dark">
                    <h2 class="fw-bold lh-base">${titleWords.join(' ')} <span class="text-highlights">${lastWord}</span></h2>
                    <p class="text-muted mt-3">${excerpt}</p>
                  </a>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Dots -->
      <div class="d-flex justify-content-center mt-4 mb-2">
        <div class="carousel-indicators custom-dots">
          ${section1Articles.map((_, index) => `
            <button type="button" data-bs-target="#heroCarousel" data-bs-slide-to="${index}" class="${index === 0 ? 'active' : ''}" aria-label="Slide ${index + 1}"></button>
          `).join('')}
        </div>
      </div>

      
    </div>
  </div>
</section>
`;

const usedSlugs = new Set();

function getNextArticles(list, count) {
  const results = [];
  for (const a of list) {
    if (!usedSlugs.has(a.slug)) {
      results.push(a);
      usedSlugs.add(a.slug);
      if (results.length === count) break;
    }
  }
  return results;
}

   // ✅ SECTION 2 - "Full Story" Block from only 'news-article' category
const validArticles = nonMetroArticles.filter(article => {
  const isNewsArticle = article.category?.slug === 'news-article';

  const hasViralHashtag = (article.hashtags || []).some(
    tag => tag.name?.toLowerCase() === 'viral'
  );

  const isIndian = (article.countries || []).some(
    country => country.title?.toLowerCase() === 'india'
  );

  return isNewsArticle && !hasViralHashtag && isIndian;
});




const section2Articles = getNextArticles(validArticles, 4);
const section2Main = section2Articles[0];
const section2Others = section2Articles.slice(1);
let section2Html = '';

if (section2Main) {
  const s2Title = section2Main.Title;
  const s2Slug = section2Main.slug;
  const s2Author = section2Main.author?.name || 'RagaDecode';
  const s2Date = new Date(section2Main.publishedat).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
  const s2Image = section2Main.coverimage?.url || '/assets/default.jpg';
  const s2Excerpt = marked.parse(section2Main.short_description?.slice(0, 550)) || '';

  const s2CardsHtml = section2Others.map(story => {
    const cardDate = new Date(story.publishedat).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    return `
      <div class="col-md-4">
        <a href="/news-article/${story.slug}" class="text-decoration-none">
          <div class="card border-0 h-100">
            <img src="${story.coverimage?.url || '/assets/default.jpg'}" class="card-img-top rounded" style="object-fit: cover; height: 200px;" alt="${story.Title}">
            <div class="card-body px-0">
              <small class="text-muted d-block mb-1">By ${story.author?.name || 'Unknown'} • ${cardDate}</small>
              <h5 class="card-title fw-semibold">${story.Title}</h5>
              <p>${story.short_description}</p>
            </div>
          </div>
        </a>
      </div>
    `;
  }).join('\n');

  section2Html = `
    <section class="section-2-feature py-5 border-bottom">
      <div class="container">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2 class="fw-bold">Most <span class="text-warning">Recent</span></h2>
          <a href="/news-article" class="text-primary fw-semibold">See All</a>
        </div>

        <div class="row align-items-center g-4 flex-column flex-md-row mb-4">
          <div class="col-md-6">
            <a href="/news-article/${s2Slug}" class="text-decoration-none text-dark"><h3 class="fw-bold">${s2Title}</h3></a>
            <small class="text-muted d-block mb-2">By ${s2Author} • ${s2Date}</small>
            <p class="text-muted">${s2Excerpt} <a href="/news-article/${s2Slug}">Read More...</a></p>
          </div>
          <div class="col-md-6">
            <a href="/news-article/${s2Slug}">
              <img src="${s2Image}" class="img-fluid rounded shadow-sm w-100" style="object-fit: cover; height: 100%; max-height: 250px;" alt="${s2Title}">
            </a>
          </div>
        </div>

        <div class="row g-4">
          ${s2CardsHtml}
        </div>
      </div>
    </section>
  `;
} else {
  section2Html = ''; // fallback if no valid article
}




// ✅ SECTION 3 - Highlight Block + 3 Sidebar Articles
 // Choose any index depending on article set
const newsArticles_section3 = nonMetroArticles.filter(article => article.category?.slug === 'news-article');

const section3Articles = getNextArticles(newsArticles_section3, 4);
const section3Main = section3Articles[0];
const section3Side = section3Articles.slice(1);

let section3Html = '';

if (section3Main && section3Side.length === 7) {
  const s3Title = section3Main.Title;
  const s3Slug = section3Main.slug;
  const s3Image = section3Main.coverimage?.url || '/assets/default.jpg';
  const s3Author = section3Main.author?.name || 'RagaDecode';
  const s3Date = new Date(section3Main.publishedat).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  }); 
 
  const s3Excerpt = marked.parse(section3Main.short_description?.slice(0, 300)) || '';

  const s3SidebarHtml = section3Side.map(article => {
    const sideImage = article.coverimage?.url || '/assets/default.jpg';
     const s3_Date = new Date(article.publishedat).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    return `
      <div class="d-flex mb-3">
        <div style="width: 90px; height: 60px; flex-shrink: 0;">
          <a href="/${article.category?.slug}/${article.slug}">
            <img src="${sideImage}" class="img-fluid rounded" style="object-fit: cover; width: 100%; height: 100%;" alt="${article.Title}">
          </a>
        </div>
        <div class="ps-3"> 
        <a href="/${article.category?.slug}/${article.slug}" class="text-decoration-none text-dark">
          <p class="mb-0 small fw-semibold">${article.Title}</p>
          <small class="text-muted d-block mb-1">${s3_Date}</small>
          </a>
        </div>
      </div>
    `;
  }).join('\n');

  section3Html = `
    <section class="section-3-highlight py-5 border-bottom">
      <div class="container">
      <div class="d-flex justify-content-between align-items-center mb-4">
          <h2 class="fw-bold">Full <span class="text-warning">Read</span></h2>
          <a href="/news-article" class="text-dark fw-semibold">See All</a>
        </div>
        <div class="row g-4">
          <div class="col-12 col-lg-8">
            <a href="/${section3Main.category?.slug}/${s3Slug}">
              <img src="${s3Image}" class="img-fluid rounded w-100" style="object-fit: cover; max-height: 400px;" alt="${s3Title}">
            </a>
            <div class="mt-3">
            <a href="/${section3Main.category?.slug}/${s3Slug}" class="text-decoration-none text-dark">
              <h3 class="fw-bold">${s3Title}</h3>
              <small class="text-muted">By ${s3Author} • ${s3Date}</small>
              <p class="mt-2 text-muted">${s3Excerpt}</p>
              </a>
            </div>

          </div>
          <div class="col-12 col-lg-4">
            ${s3SidebarHtml}
          </div>
        </div>
      </div>
    </section>
  `;
}


// ✅ SECTION 4 - Most See Design (Matching Screenshot)
const section4Articles = nonMetroArticles.filter(a => a.category?.slug === 'news-article');
const section4Main = section4Articles[12];
const section4Grid = section4Articles.slice(13, 17); // Next 4



let section4Html = '';
if (section4Main && section4Grid.length === 4) {
  const s4Title = section4Main.Title;
  const s4Slug = section4Main.slug;
  const s4Author = section4Main.author?.name || 'RagaDecode';
  // const s4Source = section4Main.author?.organization || 'RagaDecode Editorial';
  const s4Date = new Date(section4Main.publishedat).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
  const s4Image = section4Main.coverimage?.url || '/assets/default.jpg';
  const s4Excerpt = section4Main.short_description?.slice(0, 300) || '';

  const s4GridHtml = section4Grid.map(article => {
    const gridImage = article.coverimage?.url || '/assets/default.jpg';
    const gridDate = new Date(article.publishedat).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    return `
      <div class="col-12 col-sm-6 mb-4">
        <a href="/${article.category?.slug}/${article.slug}" class="text-decoration-none">
          <img src="${gridImage}" class="img-fluid rounded mb-2 w-100" style="object-fit: cover; height: 150px;" alt="${article.Title}">
          <div class="d-flex align-items-center mb-1 text-muted" style="font-size: 13px;">
            <i class="bi bi-clock me-1"></i>${gridDate}
          </div>
          <h6 class="fw-semibold text-dark">${article.Title}</h6>
        </a>
      </div>
    `;
  }).join('\n');

  section4Html = `
    <section class="section-4-mostsee py-5 border-bottom">
      <div class="container">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2 class="fw-bold">Most <span class="text-warning">See</span></h2>
          <a href="/news-article" class="text-dark fw-semibold">See All</a>
        </div>
        <div class="row g-4">
          <!-- Left Large Feature -->
          <div class="col-12 col-lg-8">
            <a href="/news-article/${s4Slug}">
              <img src="${s4Image}" class="img-fluid rounded w-100" style="object-fit: cover; max-height: 400px;" alt="${s4Title}">
            </a>
            <div class="mt-3">
              <small class="text-muted">By ${s4Author} • ${s4Date}</small>
            
              <h3 class="fw-bold mt-2">${s4Title}</h3>
              <p class="text-muted">${s4Excerpt} <a href="/news-article/${s4Slug}" class="text-decoration-none">Read More...</a></p>
            </div>
          </div>

          <!-- Right 2x2 Grid -->
          <div class="col-12 col-lg-4"">
            <div class="row">
              ${s4GridHtml}
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}


// ✅ SECTION 5 - Thematic Category Grid
const section5Categories = ['automobile', 'technologies', 'indian-railways', 'airlines'];

const section5HtmlBlocks = section5Categories.map(catSlug => {
  const categoryArticles = nonMetroArticles.filter(a => a.category?.slug === catSlug);
  if (categoryArticles.length === 0) return '';

  const categoryName = categoryArticles[0].category?.name || 'News';
  const featured = categoryArticles[0];
  const others = categoryArticles.slice(1, 4);

  const featuredImg = featured.coverimage?.url || '/assets/default.jpg';
  const featuredDate = new Date(featured.publishedat).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  const subListHtml = others.map(sub => {
    const subDate = new Date(sub.publishedat).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    const source = sub.author?.organization || sub.category?.name || 'RagaDecode';
    return `
      <div class="d-flex flex-column border-top pt-2 mt-2">
        <small class="text-muted">${subDate} &nbsp; | &nbsp; ${source}</small>
        <a href="/${catSlug}/${sub.slug}" class="fw-semibold text-dark text-decoration-none">${sub.Title}</a>
      </div>
    `;
  }).join('\n');

  return `
    <div class="col-12 col-md-6 col-xl-3 mb-4">
      <div class="mb-2 d-flex justify-content-between align-items-center border-bottom pb-1">
        <h6 class="text-uppercase fw-bold mb-0">${categoryName}</h6>
        <a href="/${catSlug}" class="text-dark text-decoration-none">›</a>
      </div>
      <div>
        <a href="/${catSlug}/${featured.slug}">
          <img src="${featuredImg}" class="img-fluid rounded mb-2 w-100" style="object-fit: cover; height: 180px;" alt="${featured.Title}">
        </a>
        <a href="/${catSlug}/${featured.slug}" class="fw-semibold text-dark text-decoration-none d-block mb-2">${featured.Title}</a>
        <small class="text-muted">${featuredDate}</small>
        <p class="text-muted small">${featured.short_description || ''}</p>
        ${subListHtml}
      </div>
    </div>
  `;
});

const section5Html = `
<section class="section-5-grid py-5 border-bottom">
  <div class="container">
    <div class="row">
      ${section5HtmlBlocks.join('\n')}
    </div>
  </div>
</section>
`;




const section6HtmlBlocks = metroCities.map(citySlug => {
  const cityArticles = articles.filter(article =>
    Array.isArray(article.cities) &&
    article.cities.some(c => c?.slug?.toLowerCase() === citySlug)
  );


  if (cityArticles.length === 0) return '';

  const cityTitle = cityArticles[0].cities?.find(c => c?.slug?.toLowerCase() === citySlug)?.title || citySlug;

  const stateSlug = (cityArticles[0].states && cityArticles[0].states.length > 0)
    ? cityArticles[0].states[0].slug
    : 'unknown-state';

  const featured = cityArticles[0];
  const others = cityArticles.slice(1, 4);

  const featuredImg = featured.coverimage?.url || '/assets/default.jpg';
  const featuredDate = new Date(featured.publishedat).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  const listHtml = others.map(a => {
    const date = new Date(a.publishedat).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    return `
      <div class="border-top pt-2 mt-2">
        <small class="text-muted">${date}</small><br>
        <a href="/${a.category?.slug || 'news-article'}/${a.slug}" class="text-dark fw-medium text-decoration-none">${a.Title}</a>
      </div>
    `;
  }).join('\n');

  return `
    <div class="col-12 col-md-6 col-xl-4 mb-4">
      <div class="border-bottom mb-2 pb-1 d-flex justify-content-between align-items-center">
        <h6 class="fw-bold text-uppercase mb-0">${cityTitle}</h6>
        <a href="/locations/india/${stateSlug}/${citySlug}" class="text-dark text-decoration-none">›</a>
      </div>
      <div>
        <a href="/${featured.category?.slug || 'news-article'}/${featured.slug}">
          <img src="${featuredImg}" class="img-fluid rounded mb-2 w-100" style="object-fit: cover; height: 180px;" alt="${featured.Title}">
        </a>
        <a href="/${featured.category?.slug || 'news-article'}/${featured.slug}" class="fw-semibold text-dark text-decoration-none d-block mb-2">${featured.Title}</a>
        ${listHtml}
      </div>
    </div>
  `;
});


const section6Html = `
<section class="section-6-cities py-5 border-bottom">
  <div class="container">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h2 class="fw-bold">From India’s Metro Cities</h2>
      <a href="/locations/india" class="text-primary fw-semibold">See All Cities</a>
    </div>
    <div class="row">
      ${section6HtmlBlocks.join('\n')}
    </div>
  </div>
</section>
`;




    // ✅ Generate Category Blocks
    const categoryBlocksMap = {};
    articles.forEach(article => {
      const cat = article.category?.name || 'Uncategorized';
      const catSlug = article.category?.slug || 'uncategorized';
      categoryBlocksMap[catSlug] = categoryBlocksMap[catSlug] || { name: cat, slug: catSlug, articles: [] };
      categoryBlocksMap[catSlug].articles.push(article);
    });

    const categoryBlocks = Object.values(categoryBlocksMap).map(category => {
      const featured = category.articles[0];
      if (!featured) return '';
      const title = featured.Title;
      const slug = featured.slug;
      const image = featured.coverimage?.url || '/assets/default-image.jpg';
      const listItems = category.articles.slice(1, 7).map(a => `<li><a href="/${category.slug}/${a.slug}">${a.Title.slice(0,70)}</a></li>`).join('\n');
      return `
        <div class="category-block">
          <div class="section-header"><h2>${category.name}</h2><a href="/${category.slug}" class="view-all">View All</a></div>
          <div class="section-body">
            <div class="left-featured">
              <a href="/${category.slug}/${slug}">
                <div class="left-image"><img src="${image}" alt="${title}"></div>
                <div class="left-title"><h3>${title}</h3></div>
              </a>
            </div>
            <div class="right-list"><ul>${listItems}</ul></div>
          </div>
        </div>
      `;
    });

    const homepageSectionHtml = `<section class="homepage-section">${categoryBlocks.join('\n')}</section>`;

    // ✅ Inject into Template
    const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');


    const pageHtml = template
      .replace('{{GA_SCRIPT}}', gaScript)
      .replace('{{HEADER}}', headerHtml)
      .replace('{{SECTION_1}}', section1Html)
      .replace('{{SECTION_2}}', section2Html)
      .replace('{{SECTION_3}}', section3Html) 
      .replace('{{SECTION_4}}', section4Html) 
      .replace('{{SECTION_5}}', section5Html) 
      .replace('{{SECTION_6}}', section6Html)
      .replace('{{REGION_SECTION}}', regionHtml)
      .replace('{{HOMEPAGE_SECTION}}', homepageSectionHtml)
      .replace('{{FOOTER}}', footerHtml);

    await fs.writeFile(OUTPUT_PATH, pageHtml);
    console.log('✅ index.html generated successfully');
  } catch (err) {
    console.error('❌ Failed to generate homepage:', err);
  }
})();
