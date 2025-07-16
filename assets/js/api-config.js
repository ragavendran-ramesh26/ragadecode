// Base URL for your Strapi backend
// const BASE_STRAPI_URL = 'https://genuine-compassion-eb21be0109.strapiapp.com/api';
// const BASE_STRAPI_URL = 'http://localhost:8001/api';
const BASE_STRAPI_URL = 'https://api.ragadecode.com/api'

// Core APIs
const API_CONFIG = { 

  NEWS_ARTICLES: `${BASE_STRAPI_URL}/news-articles`,

  SEARCH_MEDIA: `${BASE_STRAPI_URL}/media`,
  
  FULL_SLUG_ARTICLE: `${BASE_STRAPI_URL}/news-articles`,
  CATEGORIES: `${BASE_STRAPI_URL}/categories`,

  // GET_ARTICLES_LIST: `${BASE_STRAPI_URL}/news-articles?sort[0]=publishedat:desc&sort[1]=id:desc&pagination[page]=1&pagination[pageSize]=100&populate[hashtags]=true&populate[author][populate][profile_image]=true&populate[coverimage]=true&populate[category]=true&populate[countries]=true&populate[states]=true&populate[cities]=true`,

  TAGS_API: `${BASE_STRAPI_URL}/hashtags`,
  ALL_TAGS_API: `${BASE_STRAPI_URL}/hashtags`,
  COUNTRIES_API: `${BASE_STRAPI_URL}/countries`,
  STATES_API: `${BASE_STRAPI_URL}/states?populate[country]=true`,
  CITIES_API: `${BASE_STRAPI_URL}/cities?populate[state]=true&populate[country]=true`,

  COUNTRY_PAGE_API: `${BASE_STRAPI_URL}/countries?populate[news_articles]=true`,
  STATE_PAGE_API: `${BASE_STRAPI_URL}/states?populate[news_articles]=true&populate[country]=true`,
  CITY_PAGE_API: `${BASE_STRAPI_URL}/cities?populate[state]=true&populate[country]=true&populate[news_articles]=true`,


  AUTHORS_API: `${BASE_STRAPI_URL}/authors`,
  STATIC_PAGES_API: `${BASE_STRAPI_URL}/static-pages?populate=*`,

  // ARTICLE_STATES_LIST:`${BASE_STRAPI_URL}/states?pagination[pageSize]=100&populate[news_articles][populate][1]=category&filters[country][title][$eq]=India&populate[news_articles][populate][0]=coverimage&populate[news_articles][sort][0]=publishedAt:desc&populate[country]=true&populate[news_articles][populate][2]=author&populate[news_articles][populate][3]=hashtags`,

  // // Metals (external API)
  METALS_API: 'https://api.metals.dev/v1/latest?api_key=APKAB7KKG6EAHI9WNWJX5409WNWJX&currency=INR&unit=g',

  // // Dynamic article URL based on tag ID
  // getArticlesByTag: (tagId) =>
  //   `${BASE_STRAPI_URL}/hashtags/${tagId}?populate[tags][populate][0]=category&populate[tags][populate][1]=coverimage&populate[tags][populate][2]=author&populate[tags][populate][3]=hashtags&populate[tags][sort][0]=publishedAt:desc`,
};

module.exports = API_CONFIG;
