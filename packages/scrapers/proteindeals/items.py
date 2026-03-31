import scrapy
from datetime import datetime


class ProductItem(scrapy.Item):
    """Scraped protein powder product item."""

    # Product identification
    name = scrapy.Field()           # str: full product name
    brand = scrapy.Field()          # str: brand name (MyProtein, Bulk, etc.)
    retailer = scrapy.Field()       # str: retailer name
    url = scrapy.Field()            # str: canonical product URL

    # Pricing
    price = scrapy.Field()          # float: current price in GBP
    original_price = scrapy.Field() # float | None: original price if on sale
    was_on_sale = scrapy.Field()    # bool: whether item is discounted

    # Product specs
    size_g = scrapy.Field()         # float: pack size in grams
    flavour = scrapy.Field()        # str | None: flavour variant
    protein_per_100g = scrapy.Field() # float | None: protein content per 100g

    # Derived
    price_per_100g = scrapy.Field() # float: calculated price per 100g

    # Stock
    in_stock = scrapy.Field()       # bool: whether currently in stock

    # Metadata
    scraped_at = scrapy.Field()     # str: ISO 8601 timestamp
    retailer_product_id = scrapy.Field()  # str | None: retailer's own product ID/SKU
    image_url = scrapy.Field()      # str | None: product image URL
