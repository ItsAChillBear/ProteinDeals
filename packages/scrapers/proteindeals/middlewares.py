import logging
import os
import random
from typing import Any

from scrapy import Spider, signals
from scrapy.http import Request, Response
from scrapy.exceptions import NotConfigured

logger = logging.getLogger(__name__)

# Curated list of realistic UK browser user agents
USER_AGENTS = [
    # Chrome on Windows
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    # Chrome on macOS
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    # Firefox on Windows
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    # Safari on macOS
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    # Edge on Windows
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0",
]


class RandomUserAgentMiddleware:
    """
    Rotate User-Agent header on each request to reduce detection likelihood.
    Falls back to the curated list if fake-useragent is not available.
    """

    def __init__(self) -> None:
        self._ua_pool = USER_AGENTS
        self._try_load_fake_useragent()

    def _try_load_fake_useragent(self) -> None:
        try:
            from fake_useragent import UserAgent  # type: ignore
            ua = UserAgent(browsers=["chrome", "firefox", "safari"])
            # Pre-generate a pool of 20 UAs for performance
            self._ua_pool = [ua.random for _ in range(20)]
            logger.debug("RandomUserAgentMiddleware: using fake-useragent library")
        except Exception:
            logger.debug(
                "RandomUserAgentMiddleware: fake-useragent unavailable, using fallback list"
            )

    @classmethod
    def from_crawler(cls, crawler: Any) -> "RandomUserAgentMiddleware":
        return cls()

    def process_request(self, request: Request, spider: Spider) -> None:
        user_agent = random.choice(self._ua_pool)
        request.headers["User-Agent"] = user_agent
        logger.debug(f"Set User-Agent: {user_agent[:60]}...")


class ProxyMiddleware:
    """
    Rotate proxies for requests, reading the proxy URL from the PROXY_URL env var.

    Set PROXY_URL to a proxy provider endpoint that supports URL rotation,
    e.g. https://username:password@proxy.provider.com:8080

    If PROXY_URL is not set, this middleware is a no-op.
    """

    def __init__(self, proxy_url: str) -> None:
        self.proxy_url = proxy_url
        if proxy_url:
            logger.info(f"ProxyMiddleware: routing requests via proxy")
        else:
            logger.info("ProxyMiddleware: PROXY_URL not set, running without proxy")

    @classmethod
    def from_crawler(cls, crawler: Any) -> "ProxyMiddleware":
        proxy_url = os.getenv("PROXY_URL", "")
        return cls(proxy_url=proxy_url)

    def process_request(self, request: Request, spider: Spider) -> None:
        if self.proxy_url:
            request.meta["proxy"] = self.proxy_url

    def process_response(
        self, request: Request, response: Response, spider: Spider
    ) -> Response:
        # If we get a 403/429, log it for potential proxy rotation
        if response.status in (403, 429):
            logger.warning(
                f"Blocked response {response.status} from {request.url}. "
                "Consider rotating proxy or increasing DOWNLOAD_DELAY."
            )
        return response
