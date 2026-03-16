import logging
import json
import re
from datetime import datetime, timezone
from typing import Any, Generator

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
        "https://www.myprotein.com/c/nutrition/protein/whey-protein/",
    ]

    def __init__(self, category: str | None = None, *args, **kwargs) -> None:  # type: ignore
        super().__init__(*args, **kwargs)
        self.category = category
        if category:
            self.start_urls = [
                f"https://www.myprotein.com/c/nutrition/protein/{category}/"
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

        for url in self._extract_category_product_urls(response):
            yield scrapy.Request(
                url,
                callback=self.parse_product,
                errback=self.handle_error,
            )

        # Pagination: follow "Next" page link
        next_page = response.css(
            "a[data-e2e='pagination-next']::attr(href), "
            "a.pagination_next::attr(href), "
            "a[aria-label*='Next']::attr(href)"
        ).get()
        if next_page:
            yield scrapy.Request(
                response.urljoin(next_page),
                callback=self.parse_category,
                errback=self.handle_error,
            )

    def parse_product(self, response: Response) -> Generator:
        """Parse individual product page and queue each variant URL."""
        logger.debug(f"Parsing product: {response.url}")

        try:
            queued = False
            product_group = self._extract_product_group(response)
            product_name = self._extract_name(response)
            image_url = self._extract_image_url(response)

            if product_group:
                for variant in product_group.get("hasVariant", []):
                    offer = variant.get("offers") or {}
                    variant_url = offer.get("url")
                    if not variant_url:
                        continue

                    queued = True
                    yield scrapy.Request(
                        response.urljoin(variant_url),
                        callback=self.parse_variant,
                        errback=self.handle_error,
                        cb_kwargs={
                            "product_name": product_name,
                            "product_group_id": str(
                                product_group.get("productGroupID") or ""
                            )
                            or None,
                            "product_image_url": image_url,
                            "variant_payload": variant,
                        },
                    )

            if not queued:
                item = self._build_item(
                    response=response,
                    product_name=product_name,
                    product_group_id=self._extract_product_id(response),
                    product_image_url=image_url,
                    variant_payload=None,
                )
                if item:
                    yield item

        except Exception as e:
            logger.error(f"Error parsing product at {response.url}: {e}")

    def parse_variant(
        self,
        response: Response,
        product_name: str | None,
        product_group_id: str | None,
        product_image_url: str | None,
        variant_payload: dict[str, Any] | None,
    ) -> Generator:
        """Parse a specific variation URL and emit one variant item."""
        try:
            item = self._build_item(
                response=response,
                product_name=product_name,
                product_group_id=product_group_id,
                product_image_url=product_image_url,
                variant_payload=variant_payload,
            )
            if item:
                yield item
        except Exception as e:
            logger.error(f"Error parsing variant at {response.url}: {e}")

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

    def _extract_category_product_urls(self, response: Response) -> list[str]:
        urls: list[str] = []
        seen_urls: set[str] = set()

        for node in self._extract_json_ld_nodes(response):
            if node.get("@type") != "ItemList":
                continue

            for item in node.get("itemListElement", []):
                if not isinstance(item, dict):
                    continue

                href = item.get("url") or item.get("@id")
                if not isinstance(href, str) or "/p/" not in href:
                    continue

                url = response.urljoin(href.split("?")[0])
                if url in seen_urls:
                    continue

                seen_urls.add(url)
                urls.append(url)

        if urls:
            return urls

        hrefs = response.css("a::attr(href)").getall()
        for href in hrefs:
            if not href or "/p/" not in href:
                continue

            url = response.urljoin(href.split("?")[0])
            if url in seen_urls:
                continue

            seen_urls.add(url)
            urls.append(url)

        return urls

    def _extract_json_ld_nodes(self, response: Response) -> list[dict[str, Any]]:
        nodes: list[dict[str, Any]] = []
        for raw_json in response.css("script[type='application/ld+json']::text").getall():
            if not raw_json:
                continue

            try:
                data = json.loads(raw_json)
            except json.JSONDecodeError:
                continue

            if isinstance(data, dict):
                graph = data.get("@graph")
                if isinstance(graph, list):
                    nodes.extend(node for node in graph if isinstance(node, dict))
                else:
                    nodes.append(data)
            elif isinstance(data, list):
                nodes.extend(node for node in data if isinstance(node, dict))

        return nodes

    def _extract_product_group(self, response: Response) -> dict[str, Any] | None:
        for node in self._extract_json_ld_nodes(response):
            if node.get("@type") == "ProductGroup":
                return node
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
        sticky_label = response.css("pdp-sticky-atb::attr(aria-label)").get()
        if sticky_label:
            parsed = self._parse_size_to_grams(sticky_label)
            if parsed:
                return parsed

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
        sticky_label = response.css("pdp-sticky-atb::attr(aria-label)").get()
        if sticky_label:
            flavour = self._extract_flavour_from_label(sticky_label)
            if flavour:
                return flavour

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

    def _extract_flavour_from_label(self, label: str) -> str | None:
        parts = [part.strip() for part in label.split(" - ") if part.strip()]
        if len(parts) < 4:
            return None

        # Format observed: "<name> - 2.5KG - 83servings - Chocolate Mint"
        flavour = parts[-1]
        return flavour or None

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
        variation = response.url.split("variation=")[-1] if "variation=" in response.url else None
        if variation:
            return variation.split("&")[0].strip()

        product_id = response.css("[data-product-id]::attr(data-product-id)").get()
        if product_id:
            return product_id.strip()

        # Try extracting from URL
        url_match = re.search(r"/p/(\d+)", response.url)
        if url_match:
            return url_match.group(1)

        return None

    def _extract_variant_flavour(
        self, response: Response, variant_payload: dict[str, Any] | None
    ) -> str | None:
        if variant_payload:
            properties = variant_payload.get("additionalProperty") or []
            for entry in properties:
                if not isinstance(entry, dict):
                    continue
                if str(entry.get("name", "")).lower() == "flavour":
                    value = entry.get("value")
                    if isinstance(value, str) and value.strip():
                        return value.strip()

        return self._extract_flavour(response)

    def _extract_variant_image_url(
        self, response: Response, fallback: str | None
    ) -> str | None:
        return self._extract_image_url(response) or fallback

    def _build_item(
        self,
        response: Response,
        product_name: str | None,
        product_group_id: str | None,
        product_image_url: str | None,
        variant_payload: dict[str, Any] | None,
    ) -> ProductItem | None:
        name = product_name or self._extract_name(response)
        price = self._extract_price(response)
        size_g = self._extract_size_g(response, name)

        if not name or price is None or size_g is None:
            logger.warning(
                f"Skipping product at {response.url}: "
                f"name={name!r}, price={price}, size_g={size_g}"
            )
            return None

        original_price = self._extract_original_price(response)
        price_per_100g = round((price / size_g) * 100, 4)
        retailer_product_id = self._extract_product_id(response)

        if not retailer_product_id and variant_payload:
            retailer_product_id = str(variant_payload.get("sku") or "").strip() or None

        if not retailer_product_id:
            retailer_product_id = product_group_id

        return ProductItem(
            name=name.strip(),
            brand="MyProtein",
            retailer="MyProtein",
            url=response.url,
            price=price,
            original_price=original_price,
            was_on_sale=original_price is not None and original_price > price,
            size_g=size_g,
            flavour=self._extract_variant_flavour(response, variant_payload),
            protein_per_100g=self._extract_protein_per_100g(response),
            price_per_100g=price_per_100g,
            in_stock=self._extract_in_stock(response),
            scraped_at=datetime.now(timezone.utc).isoformat(),
            retailer_product_id=retailer_product_id,
            image_url=self._extract_variant_image_url(response, product_image_url),
        )

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
