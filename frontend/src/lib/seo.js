function ensureMeta(name, attr = "name") {
  let tag = document.head.querySelector(`meta[${attr}='${name}']`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }
  return tag;
}

function truncate(str, len) {
  if (!str) return "";
  return str.length <= len ? str : `${str.slice(0, len - 1).trim()}…`;
}

export function buildListingSEO({ title, description, category, city, price }) {
  const cleanTitle = (title || "").trim();
  const cleanDesc = (description || "").trim().replace(/\s+/g, " ");
  const cleanCategory = (category || "").trim();
  const cleanCity = (city || "").trim();

  const titleTag = truncate(
    `${cleanTitle || "Second-hand listing"}${cleanCategory ? ` | ${cleanCategory}` : ""}${cleanCity ? ` in ${cleanCity}` : ""} | ReList`,
    60,
  );
  const metaDescription = truncate(
    cleanDesc || `${cleanTitle || "Item"} available on ReList${cleanCity ? ` in ${cleanCity}` : ""}.`,
    155,
  );

  const keywordParts = [cleanTitle, cleanCategory, cleanCity, "second hand", "used", "relist", "buy and sell", "india"]
    .filter(Boolean)
    .join(", ");

  const checks = [
    { label: "Title length (30-60 chars)", pass: titleTag.length >= 30 && titleTag.length <= 60 },
    { label: "Meta description (120-155 chars)", pass: metaDescription.length >= 120 && metaDescription.length <= 155 },
    { label: "Keywords available", pass: keywordParts.split(",").length >= 4 },
    { label: "Has category", pass: Boolean(cleanCategory) },
    { label: "Has city", pass: Boolean(cleanCity) },
  ];

  const score = Math.round((checks.filter((c) => c.pass).length / checks.length) * 100);

  return {
    titleTag,
    metaDescription,
    keywords: keywordParts,
    checks,
    score,
    slug: cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    priceSnippet: price ? `Price: ₹${Number(price || 0).toLocaleString("en-IN")}` : "",
  };
}

export function applySEO({ titleTag, metaDescription, keywords }) {
  if (titleTag) document.title = titleTag;
  ensureMeta("description").setAttribute("content", metaDescription || "");
  ensureMeta("keywords").setAttribute("content", keywords || "");
  ensureMeta("og:title", "property").setAttribute("content", titleTag || "");
  ensureMeta("og:description", "property").setAttribute("content", metaDescription || "");
}
