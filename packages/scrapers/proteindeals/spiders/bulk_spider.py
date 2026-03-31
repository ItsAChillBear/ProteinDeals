import logging
import re
from datetime import datetime, timezone
from typing import Any, Generator

import scrapy
from scrapy.http import Response

from proteindeals.items import ProductItem

logger = logging.getLogger(__name__)


class BulkSpider(scrapy.Spider):
    """
    Spider for scraping protein powder prices from bulk.com.

    Targets the protein powders category and product pages to extract
    name, price, size, flavour, and stock status.

    Usage:
        scrapy crawl bulk
        scrapy crawl bulk -a category=protein/whey-protein
        scrapy crawl bulk -o output.json
    """

    name = "bulk"
    allowed_domains = ["www.bulk.com"]
    custom_settings = {
        "DOWNLOAD_DELAY": 4.0,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 1,
    }

    START_URLS = [
        "https://www.bulk.com/uk/protein.html",
        "https://www.bulk.com/uk/protein/whey-protein.html",
    ]

    def __init__(self, category: str | None = None, *args, **kwargs) -> None:  # type: ignore
        super().__init__(*args, **kwargs)
        if category:
            self.start_urls = [f"https://www.bulk.com/uk/{category}.html"]
        else:
            self.start_urls = self.START_URLS

    def start_requests(self) -> Generator:
        for url in self.start_urls:
            yield scrapy.Request(
                url,
                callback=self.parse_category,
                errback=self.handle_error,
                headers={
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-GB,en;q=0.9",
                },
            )

    def parse_category(self, response: Response) -> Generator:
        """Parse Bulk category/listing page and follow product links."""
        logger.info(f"Parsing Bulk category page: {response.url}")

        product_links = response.css(
            "a.product-item-link::attr(href), "
            "a.product-image-photo::attr(href), "
            ".products-list .product-item a::attr(href), "
            "li.product-item a::attr(href)"
        ).getall()

        seen_urls: set[str] = set()
        for href in product_links:
            if not href:
                continue
            url = response.urljoin(href)
            # Filter out non-product links
            if any(
                skip in url
                for skip in ["/uk/protein.html", "/uk/protein/", "?p=", "?sort="]
            ):
                continue
            if url not in seen_urls:
                seen_urls.add(url)
                yield scrapy.Request(
                    url,
                    callback=self.parse_product,
                    errback=self.handle_error,
                )

        logger.info(
            f"Found {len(seen_urls)} product links on {response.url}"
        )

        # Pagination
        next_page = response.css(
            "a.action.next::attr(href), "
            "li.pages-item-next a::attr(href)"
        ).get()
        if next_page:
            yield scrapy.Request(
                response.urljoin(next_page),
                callback=self.parse_category,
                errback=self.handle_error,
            )

    def parse_product(self, response: Response) -> Generator:
        """Parse individual Bulk product page and yield ProductItem."""
        logger.debug(f"Parsing Bulk product: {response.url}")

        try:
            name = self._extract_name(response)
            price = self._extract_price(response)
            size_g = self._extract_size_g(response, name)

            if not name or price is None or size_g is None:
                logger.warning(
                    f"Skipping Bulk product at {response.url}: "
                    f"name={name!r}, price={price}, size_g={size_g}"
                )
                return

            price_per_100g = round((price / size_g) * 100, 4)
            original_price = self._extract_original_price(response)

            item = ProductItem(
                name=name.strip(),
                brand=self._extract_brand(response),
                retailer="Bulk",
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
            logger.error(f"Error parsing Bulk product at {response.url}: {e}")

    # ─── Private Extraction Helpers ───────────────────────────────────────────

    def _extract_name(self, response: Response) -> str | None:
        selectors = [
            "h1.page-title span.base::text",
            "h1.page-title::text",
            "h1[itemprop='name']::text",
            "h1::text",
        ]
        for selector in selectors:
            name = response.css(selector).get()
            if name and name.strip():
                return name.strip()
        return None

    def _extract_brand(self, response: Response) -> str:
        brand = response.css(
            "[itemprop='brand']::text, "
            ".product-brand::text"
        ).get()
        return (brand or "Bulk").strip()

    def _extract_price(self, response: Response) -> float | None:
        selectors = [
            "span.price::text",
            "[data-price-type='finalPrice'] .price::text",
            ".price-box .price::text",
            "[itemprop='price']::attr(content)",
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
            "[data-price-type='oldPrice'] .price::text",
            ".old-price .price::text",
            "span.price-wrapper.was-price .price::text",
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
        # Try structured size selector
        size_selectors = [
            ".product-options-wrapper [data-attribute-code='size'] option[selected]::text",
            ".super-attribute-select option[selected]::text",
            "[data-option-label]::attr(data-option-label)",
        ]
        for selector in size_selectors:
            size_text = response.css(selector).get()
            if size_text:
                parsed = self._parse_size_to_grams(size_text)
                if parsed:
                    return parsed

        # Fall back to product name
        if name:
            parsed = self._parse_size_to_grams(name)
            if parsed:
                return parsed

        # Fall back to URL
        return self._parse_size_to_grams(response.url)

    def _parse_size_to_grams(self, text: str) -> float | None:
        """Parse size strings like '2.5kg', '500g', '1000g' into grams."""
        text = text.lower().replace(",", ".")

        kg_match = re.search(r"(\d+(?:\.\d+)?)\s*kg", text)
        if kg_match:
            return float(kg_match.group(1)) * 1000

        g_match = re.search(r"(\d{3,5})\s*g\b", text)
        if g_match:
            return float(g_match.group(1))

        return None

    def _extract_flavour(self, response: Response) -> str | None:
        selectors = [
            ".product-options-wrapper [data-attribute-code='flavour'] option[selected]::text",
            ".product-options-wrapper [data-attribute-code='flavor'] option[selected]::text",
            ".configurableOptionTitle:contains('Flavour') + .configurableOptionValue::text",
        ]
        for selector in selectors:
            flavour = response.css(selector).get()
            if flavour and flavour.strip():
                return flavour.strip()
        return None

    def _extract_protein_per_100g(self, response: Response) -> float | None:
        # Look in nutrition table
        nutrition_rows = response.css("table.nutrition-table tr, .nutritionTable tr")
        for row in nutrition_rows:
            label = row.css("td:first-child::text, th::text").get("").lower()
            if "protein" in label:
                value_text = row.css("td:nth-child(2)::text").get("")
                cleaned = re.sub(r"[^\d.]", "", value_text)
                if cleaned:
                    try:
                        return float(cleaned)
                    except ValueError:
                        pass
        return None

    def _extract_in_stock(self, response: Response) -> bool:
        # Check availability meta
        availability = response.css(
            "[itemprop='availability']::attr(content), "
            "[itemprop='availability']::text"
        ).get("")
        if "OutOfStock" in availability or "out-of-stock" in availability.lower():
            return False
        if "InStock" in availability:
            return True

        # Check for disabled add-to-cart button
        disabled_btn = response.css("button#product-addtocart-button[disabled]")
        if disabled_btn:
            return False

        add_to_cart = response.css("button#product-addtocart-button:not([disabled])")
        return bool(add_to_cart)

    def _extract_product_id(self, response: Response) -> str | None:
        # Try JSON-LD structured data
        product_id = response.css(
            "[data-product-id]::attr(data-product-id), "
            "input[name='product']::attr(value)"
        ).get()
        if product_id:
            return product_id.strip()

        url_match = re.search(r"-(\d{4,})(?:\.html)?$", response.url)
        if url_match:
            return url_match.group(1)

        return None

    def _extract_image_url(self, response: Response) -> str | None:
        selectors = [
            "img.gallery-placeholder__image::attr(src)",
            ".fotorama__img::attr(src)",
            "[itemprop='image']::attr(src)",
            "img.product-image-photo::attr(src)",
        ]
        for selector in selectors:
            url = response.css(selector).get()
            if url and url.startswith("http"):
                return url
        return None

    def handle_error(self, failure: Any) -> None:
        logger.error(
            f"Bulk request failed: {failure.request.url} - {failure.value}"
        )
