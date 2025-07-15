function normalize(str = "") {
  return str
    .toLowerCase()
    .replace(/[\u2013\u2014\u2012\u2015]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function organizeAffiliates(mediaList) {
  const organized = {
    rectangles: [],
    squares: []
  };

  // Create separate arrays for each type
  mediaList.forEach(item => {
    if (item.alternative_text?.toLowerCase() !== "affiliate") return;
    
    const normalizedName = normalize(item.name);
    if (normalizedName.endsWith("- rectangle")) {
      organized.rectangles.push(item);
    } else if (normalizedName.endsWith("- square")) {
      organized.squares.push(item);
    }
  });

  // Sort by ID to maintain consistent order
  organized.rectangles.sort((a, b) => a.id - b.id);
  organized.squares.sort((a, b) => a.id - b.id);

  return organized;
}

function renderAffiliateWidget(item, type) {
  const affiliateCaption = item.caption || "#";
  const affiliateName = item.name || "Affiliate Sponsor";
  const affiliateBanner = item.formats?.thumbnail?.url || item.url;

  console.log(`✅ Rendering affiliate: ${affiliateName} (${type})`);

  if (type === "rectangle") {
    return `
      <div class="affiliate-banner mb-4 mt-4">
      <p class="text-muted mb-0" style="font-size: 0.55rem; font-weight: 200;">Affiliate Sponsor</p>
        <a href="${affiliateCaption}" target="_blank" rel="nofollow sponsored">
          <img 
            src="${affiliateBanner}" 
            alt="${affiliateName}" 
            class="img-fluid rounded" 
            style="width:100%; max-width:1000px;" 
          />
        </a>
      </div>
    `;
  } else if (type === "square") {
    return `
      <div class="affiliate-square mb-4 mt-4">
        <p class="text-muted mb-0" style="font-size: 0.55rem; font-weight: 200;">Affiliate Sponsor</p>
        <a href="${affiliateCaption}" target="_blank" rel="nofollow sponsored">
          <img 
            src="${affiliateBanner}" 
            alt="${affiliateName}" 
            class="img-fluid rounded" 
            style="width:100%; max-width:320px;" 
          />
        </a>
      </div>
    `;
  }
  return "";
}

function autoRenderAllAffiliateWidgets(mediaList) {
  const organized = organizeAffiliates(mediaList);
  const allDivs = document.querySelectorAll("div[id^='affiliate-']");

  

  allDivs.forEach(div => {
    const id = div.id;
    const match = id.match(/^affiliate-(\d+)-(rectangle|square)$/i);

    if (match) {
      const number = parseInt(match[1]);
      const type = match[2].toLowerCase();
      const category = type === 'rectangle' ? organized.rectangles : organized.squares;
 

      if (number <= category.length) {
        const item = category[number - 1]; // Arrays are 0-indexed
        div.innerHTML = renderAffiliateWidget(item, type);
      } else {
        console.warn(`🚫 No matching affiliate for ID: "${id}" (only ${category.length} ${type} items available)`);
        div.innerHTML = ''; // Or show a fallback message
      }
    } else {
      console.warn(`❌ ID "${id}" does not match expected format (e.g. affiliate-1-rectangle)`);
    }
  });
}