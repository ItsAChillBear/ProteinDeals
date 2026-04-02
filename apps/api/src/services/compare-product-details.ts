import { extractMyproteinProductContent } from "../scrapers/myprotein/content.js";

export async function getCompareProductDetails(url: string, retailer: string) {
  if (retailer.toLowerCase() !== "myprotein") {
    return {
      ingredients: null,
      nutritionalInformation: [],
    };
  }

  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-GB,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const content = extractMyproteinProductContent(html);

  return {
    ingredients: content.ingredients,
    nutritionalInformation: content.nutritionalInformation,
  };
}
