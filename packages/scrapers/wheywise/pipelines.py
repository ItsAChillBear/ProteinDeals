import logging
import os
from datetime import datetime
from typing import Any

from pydantic import BaseModel, field_validator, ValidationError
from scrapy import Spider
from scrapy.exceptions import DropItem

logger = logging.getLogger(__name__)


# ─── Pydantic Validation Model ────────────────────────────────────────────────

class ProductModel(BaseModel):
    """Strict validation schema for scraped product items."""

    name: str
    brand: str
    retailer: str
    url: str
    price: float
    size_g: float
    price_per_100g: float
    in_stock: bool
    scraped_at: str

    # Optional fields
    original_price: float | None = None
    was_on_sale: bool = False
    flavour: str | None = None
    protein_per_100g: float | None = None
    retailer_product_id: str | None = None
    image_url: str | None = None

    @field_validator("price", "size_g", "price_per_100g")
    @classmethod
    def must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError(f"Value must be positive, got {v}")
        return v

    @field_validator("url")
    @classmethod
    def must_be_url(cls, v: str) -> str:
        if not v.startswith(("http://", "https://")):
            raise ValueError(f"URL must start with http:// or https://, got: {v}")
        return v

    @field_validator("price_per_100g")
    @classmethod
    def sanity_check_price_per_100g(cls, v: float) -> float:
        # Sanity check: UK protein shouldn't be < £0.50 or > £20 per 100g
        if v < 0.50 or v > 20.0:
            raise ValueError(
                f"price_per_100g {v} is outside expected UK range (£0.50–£20.00)"
            )
        return v


# ─── Validation Pipeline ─────────────────────────────────────────────────────

class ValidationPipeline:
    """Validate and clean scraped items using Pydantic."""

    def process_item(self, item: Any, spider: Spider) -> Any:
        try:
            validated = ProductModel(**dict(item))

            # Write validated data back to item
            for field, value in validated.model_dump().items():
                item[field] = value

            return item

        except ValidationError as e:
            error_summary = "; ".join(
                f"{err['loc']}: {err['msg']}" for err in e.errors()
            )
            logger.warning(
                f"Dropping item from {spider.name} due to validation error: "
                f"{error_summary} | URL: {item.get('url', 'unknown')}"
            )
            raise DropItem(f"Validation failed: {error_summary}")

        except Exception as e:
            logger.error(
                f"Unexpected error validating item from {spider.name}: {e}"
            )
            raise DropItem(f"Unexpected validation error: {e}")


# ─── Database Pipeline ────────────────────────────────────────────────────────

class DatabasePipeline:
    """
    Insert validated product items into PostgreSQL.

    TODO: Implement full DB insertion using SQLAlchemy/psycopg2.
          For now, this pipeline logs items and counts stats.

    Implementation plan:
    1. On spider_opened: create DB connection using DATABASE_URL from settings
    2. On process_item: upsert product_variants row, insert price_records row
    3. On spider_closed: close connection, log summary stats
    """

    def __init__(self) -> None:
        self.items_processed = 0
        self.items_inserted = 0
        self.items_updated = 0
        self.conn = None

    @classmethod
    def from_crawler(cls, crawler: Any) -> "DatabasePipeline":
        return cls()

    def open_spider(self, spider: Spider) -> None:
        database_url = os.getenv("DATABASE_URL", "")
        if not database_url:
            logger.warning(
                "DATABASE_URL not set. DatabasePipeline running in DRY RUN mode."
            )
            return

        # TODO: Initialise SQLAlchemy engine
        # from sqlalchemy import create_engine
        # self.engine = create_engine(database_url, pool_size=5, max_overflow=10)
        # self.conn = self.engine.connect()
        logger.info(f"DatabasePipeline opened for spider: {spider.name}")

    def process_item(self, item: Any, spider: Spider) -> Any:
        self.items_processed += 1

        if self.conn is None:
            # Dry run mode — just log
            logger.debug(
                f"[DRY RUN] Would upsert: {item.get('brand')} "
                f"{item.get('name')} @ £{item.get('price')} "
                f"({item.get('retailer')})"
            )
            return item

        # TODO: Implement actual DB upsert
        # try:
        #     # 1. Find or create product
        #     # 2. Find or create retailer
        #     # 3. Upsert product_variant
        #     # 4. Insert price_record (append-only)
        #     # 5. Update price_alerts if target_price reached
        #     self.conn.commit()
        #     self.items_inserted += 1
        # except Exception as e:
        #     logger.error(f"DB insert failed for {item.get('url')}: {e}")
        #     self.conn.rollback()

        return item

    def close_spider(self, spider: Spider) -> None:
        if self.conn:
            self.conn.close()

        logger.info(
            f"DatabasePipeline closed for spider '{spider.name}'. "
            f"Processed: {self.items_processed}, "
            f"Inserted: {self.items_inserted}, "
            f"Updated: {self.items_updated}"
        )
