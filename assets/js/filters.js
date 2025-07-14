/* logic 1 */
function isCategory(article, slug) {
  return article.category?.slug?.toLowerCase() === slug.toLowerCase();
}

function hasHashtag(article, hashtagName) {
  return (article.hashtags || []).some(tag => tag.name?.toLowerCase() === hashtagName.toLowerCase());
}

function inCountry(article, countrySlug) {
  return (article.countries || []).some(country => country.slug?.toLowerCase() === countrySlug.toLowerCase());
}

function isViralIndianNewsArticle(article) {
  const isCat = isCategory(article, 'news-article');
  const isViral = hasHashtag(article, 'viral');
  const isIndian = inCountry(article, 'india');

  const passed = isCat && isViral && isIndian;

  if (passed) {
    console.log(`✅ Section 1 - Selected: ${article.title || article.Title || '[No Title]'}`);
  }

  return passed;
}

function isNonViralIndianNewsArticle(article) {
  const isCat = isCategory(article, 'news-article');
  const isIndian = inCountry(article, 'india');
  const isNotViral = !hasHashtag(article, 'viral');

  const passed = isCat && isIndian && isNotViral;

  if (passed) {
    console.log(`✅ Section 2 - Selected (Non-Viral): ${article.title || article.Title || '[No Title]'}`);
  }

  return passed;
}

function isCrimeOrDeathTag(article) {
  const isNotViral = !hasHashtag(article, 'viral');
  const tagNames = (article.hashtags || []).map(tag => tag.name?.toLowerCase() || '');

  const matched = tagNames.some(name =>
    ['accident', 'murder', 'rape', 'crime'].includes(name) ||
    name.includes('death')
  );

  const passed = matched & isNotViral

  if (passed) {
    console.log(`✅ Logic 3 Match: ${article.Title}`);
  }

  return passed;
}

function isFromMetroCity(article) {
  const metroCitySlugs = [
    'mumbai', 'delhi', 'chennai', 'kolkata', 'bengaluru', 
    'hyderabad', 'ahmedabad', 'pune', 'kanpur', 'jaipur',
    'lucknow', 'nagpur', 'indore', 'thane', 'bhopal',
    'visakhapatnam', 'patna', 'vadodara', 'ghaziabad', 'ludhiana'
  ];

  const citySlugs = (article.cities || []).map(city => city.slug?.toLowerCase() || '');
  const isInMetroCity = citySlugs.some(slug => metroCitySlugs.includes(slug));

  const tagNames = (article.hashtags || []).map(tag => tag.name?.toLowerCase() || '');
  const isNotViral = !tagNames.includes('viral');

  const passed = isInMetroCity && isNotViral;

  if (passed) {
    console.log(`✅ Logic 4 Match (Metro City + Non-Viral): ${article.Title}`);
  }

  return passed;
}

function isOttReleaseNonViral(article) {
  // 1. Must be in 'ott-release' category
  const isOttRelease = (article.category?.slug || '').toLowerCase() === 'ott-release';

  // 2. Must NOT contain 'viral' tag
  const tagNames = (article.hashtags || []).map(tag => tag.name?.toLowerCase() || '');
  const isNotViral = !tagNames.includes('viral');

  // Final condition
  const passed = isOttRelease && isNotViral;

  if (passed) {
    console.log(`✅ Logic 5 Match (OTT Release - Non-Viral): ${article.Title}`);
  }

  return passed;
}

function isGadgetsArticle(article) {
  const gadgets = article?.category?.slug?.toLowerCase() === 'gadgets';
  const passed = gadgets

  if (passed) {
    console.log(`✅ Logic 6 Match (OTT GADGETS): ${article.Title}`);
  }

  return passed;

}

function getAffiliateBanner(mediaList, nameKeyword) {
  return mediaList.find(media =>
    media.alternative_text?.toLowerCase() === 'affiliate' &&
    media.name?.toLowerCase().includes(nameKeyword.toLowerCase())
  );
}

module.exports = {
  isCategory,
  hasHashtag,
  inCountry,
  isViralIndianNewsArticle,
  isNonViralIndianNewsArticle,
  isCrimeOrDeathTag,
  isFromMetroCity,
  isOttReleaseNonViral,
  isGadgetsArticle,
  getAffiliateBanner
  
};
