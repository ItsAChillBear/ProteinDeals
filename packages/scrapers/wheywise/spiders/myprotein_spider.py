import logging
import re
from datetime import datetime, timezone
from typing import Generator

import scrapy
from scrapy.http import Response

from wheywise.items import ProductItem

logger = logging.getLogger(__name__)


class MyProteinSpider(scrapy.Spider):
    """
    Spider for scraping protein powder prices from myprotein.com.

    Targets the protein powders category page and follows product links
    to extract name, price, size, flavour, and stock status.

    Usage:
        scrapy crawl myprotein
        scrapy crawl myprotein -a category=protein-powders
        scrapy crawl myprotein -o output.json
    """

    name = "myprotein"
    allowed_domains = ["www.myprotein.com"]
    custom_settings = {
        "DOWNLOAD_DELAY": 3.5,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 1,
    }

    # Category pages to crawl
    START_URLS = [
        "https://www.myprotein.com/nutrition/protein/",
        "https://www.myprotein.com/nutrition/protein/whey-protein/",
    ]

    def __init__(self, category: str | None = None, *args, **kwargs) -> None:  # type: ignore
        super().__init__(*args, **kwargs)
        self.category = category
        if category:
            self.start_urls = [
                f"https://www.myprotein.com/nutrition/protein/{category}/"
            ]
        else:
            self.start_urls = self.START_URLS

    def start_requests(self) -> Generator:
        for url in self.start_urls:
            yield scrapy.Request(
                url,
                callback=self.parse_category,
                errback=self.handle_error,
                meta={"dont_redirect": False},
            )

    def parse_category(self, response: Response) -> Generator:
        """Parse category/listing page and follow product links."""
        logger.info(f"Parsing category page: {response.url}")

        # Extract product links from listing page
        # MyProtein uses data-product-id or standard anchor tags
        product_links = response.css(
            "a.athenaProductBlock_linkImage::attr(href), "
            "a[data-product-id]::attr(href), "
            ".productListProducts_product a::attr(href)"
        ).getall()

        seen_urls: set[str] = set()
        for href in product_links:
            if not href:
                continue
            url = response.urljoin(href)
            if url not in seen_urls:
                seen_urls.add(url)
                yield scrapy.Request(
                    url,
                    callback=self.parse_product,
                    errback=self.handle_error,
                )

        # Pagination: follow "Next" page link
        next_page = response.css(
            "a[data-e2e='pagination-next']::attr(href), "
            "a.pagination_next::attr(href)"
        ).get()
        if next_page:
            yield scrapy.Request(
                response.urljoin(next_page),
                callback=self.parse_category,
                errback=self.handle_error,
            )

    def parse_product(self, response: Response) -> Generator:
        """Parse individual product page and yield ProductItem."""
        logger.debug(f"Parsing product: {response.url}")

        try:
            name = self._extract_name(response)
            price = self._extract_price(response)
            size_g = self._extract_size_g(response, name)

            if not name or price is None or size_g is None:
                logger.warning(
                    f"Skipping product at {response.url}: "
                    f"name={name!r}, price={price}, size_g={size_g}"
                )
                return

            price_per_100g = round((price / size_g) * 100, 4)
            original_price = self._extract_original_price(response)

            item = ProductItem(
                name=name.strip(),
                brand="MyProtein",
                retailer="MyProtein",
                url=response.url,
                price=price,
                original_price=original_price,
                was_on_sale=original_price is not None and original_price > price,
                size_g=size_g,
                flavour=self._extract_flavour(response),
                protein_per_100g=self._extract_protein_per_100g(response),
                price_per_100g=price_per_100g,
                in_stock=self._extract_in_stock(response),
                scraped_at=datetime.now(timezone.utc).isoformat(),
                retailer_product_id=self._extract_product_id(response),
                image_url=self._extract_image_url(response),
            )
            yield item

        except Exception as e:
            logger.error(f"Error parsing product at {response.url}: {e}")

    # ─── Private Extraction Helpers ───────────────────────────────────────────

    def _extract_name(self, response: Response) -> str | None:
        selectors = [
            "h1.productName_title::text",
            "h1[data-e2e='product-title']::text",
            "h1.athenaProductPage_productName::text",
            "h1::text",
        ]
        for selector in selectors:
            name = response.css(selector).get()
            if name and name.strip():
                return name.strip()
        return None

    def _extract_price(self, response: Response) -> float | None:
        selectors = [
            "p.productPrice_price span::text",
            "[data-e2e='product-price']::text",
            ".athenaProductPage_productPrice::text",
            "p.price::text",
        ]
        for selector in selectors:
            price_text = response.css(selector).get()
            if price_text:
                cleaned = re.sub(r"[^\d.]", "", price_text.strip())
                if cleaned:
                    try:
                        return float(cleaned)
                    except ValueError:
                        continue
        return None

    def _extract_original_price(self, response: Response) -> float | None:
        selectors = [
            "p.productPrice_rrp::text",
            "[data-e2e='rrp-price']::text",
            "s.price::text",
            ".originalPrice::text",
        ]
        for selector in selectors:
            price_text = response.css(selector).get()
            if price_text:
                cleaned = re.sub(r"[^\d.]", "", price_text.strip())
                if cleaned:
                    try:
                        return float(cleaned)
                    except ValueError:
                        continue
        return None

    def _extract_size_g(self, response: Response, name: str | None) -> float | None:
        # Try structured size selector first
        size_selectors = [
            "[data-e2e='product-size']::text",
            ".productVariants_size::text",
            "option[data-option-name='Size']::text",
        ]
        for selector in size_selectors:
            size_text = response.css(selector).get()
            if size_text:
                parsed = self._parse_size_to_grams(size_text)
                if parsed:
                    return parsed

        # Fall back to parsing from product name/title
        if name:
            parsed = self._parse_size_to_grams(name)
            if parsed:
                return parsed

        # Fall back to URL
        parsed = self._parse_size_to_grams(response.url)
        return parsed

    def _parse_size_to_grams(self, text: str) -> float | None:
        """Parse size strings like '2.5kg', '500g', '1000g' into grams."""
        text = text.lower().replace(",", ".")

        # Match patterns: 2.5kg, 2kg, 500g, 1000g
        kg_match = re.search(r"(\d+(?:\.\d+)?)\s*kg", text)
        if kg_match:
            return float(kg_match.group(1)) * 1000

        g_match = re.search(r"(\d{3,5})\s*g\b", text)
        if g_match:
            return float(g_match.group(1))

        return None

    def _extract_flavour(self, response: Response) -> str | None:
        selectors = [
            "[data-e2e='flavour-option-selected']::text",
            ".flavourOptions_selected::text",
            "option[data-option-name='Flavour'][selected]::text",
        ]
        for selector in selectors:
            flavour = response.css(selector).get()
            if flavour and flavour.strip():
                return flavour.strip()
        return None

    def _extract_protein_per_100g(self, response: Response) -> float | None:
        selectors = [
            "[data-e2e='nutrition-protein']::text",
            "td:contains('Protein') + td::text",
        ]
        for selector in selectors:
            val = response.css(selector).get()
            if val:
                cleaned = re.sub(r"[^\d.]", "", val.strip())
                if cleaned:
                    try:
                        return float(cleaned)
                    except ValueError:
                        continue
        return None

    def _extract_in_stock(self, response: Response) -> bool:
        # Check for out-of-stock indicators
        out_of_stock_indicators = response.css(
            "[data-e2e='out-of-stock'], "
            ".outOfStock, "
            "button[disabled][data-e2e='add-to-basket']"
        )
        if out_of_stock_indicators:
            return False

        # Check for positive in-stock indicators
        add_to_basket = response.css(
            "button[data-e2e='add-to-basket']:not([disabled]), "
            ".addToBasket:not(.disabled)"
        )
        return bool(add_to_basket)

    def _extract_product_id(self, response: Response) -> str | None:
        product_id = response.css("[data-product-id]::attr(data-product-id)").get()
        if product_id:
            return product_id.strip()

        # Try extracting from URL
        url_match = re.search(r"/p/(\d+)", response.url)
        if url_match:
            return url_match.group(1)

        return None

    def _extract_image_url(self, response: Response) -> str | None:
        selectors = [
            "img.productImages_image::attr(src)",
            "[data-e2e='product-image']::attr(src)",
            "img.athenaProductImageSlider_image::attr(src)",
        ]
        for selector in selectors:
            url = response.css(selector).get()
            if url and url.startswith("http"):
                return url
        return None

    def handle_error(self, failure: Any) -> None:
        logger.error(f"Request failed: {failure.request.url} - {failure.value}")
