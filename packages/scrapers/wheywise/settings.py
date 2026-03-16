import os
from dotenv import load_dotenv

load_dotenv()

# ─── Project ─────────────────────────────────────────────────────────────────
BOT_NAME = "wheywise"
SPIDER_MODULES = ["wheywise.spiders"]
NEWSPIDER_MODULE = "wheywise.spiders"

# ─── Crawl Behaviour ─────────────────────────────────────────────────────────
ROBOTSTXT_OBEY = False
DOWNLOAD_DELAY = 3
RANDOMIZE_DOWNLOAD_DELAY = True
CONCURRENT_REQUESTS = 4
CONCURRENT_REQUESTS_PER_DOMAIN = 2
CONCURRENT_REQUESTS_PER_IP = 2

# ─── Request Settings ────────────────────────────────────────────────────────
COOKIES_ENABLED = True
TELNETCONSOLE_ENABLED = False
DEFAULT_REQUEST_HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-GB,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
}

# ─── Middlewares ─────────────────────────────────────────────────────────────
DOWNLOADER_MIDDLEWARES = {
    # Disable built-in user agent middleware
    "scrapy.downloadermiddlewares.useragent.UserAgentMiddleware": None,
    # Enable our custom middlewares
    "wheywise.middlewares.RandomUserAgentMiddleware": 400,
    "wheywise.middlewares.ProxyMiddleware": 410,
    # Enable retry middleware
    "scrapy.downloadermiddlewares.retry.RetryMiddleware": 550,
}

RETRY_TIMES = 3
RETRY_HTTP_CODES = [429, 500, 502, 503, 504, 522, 524, 408, 403]

# ─── Item Pipelines ──────────────────────────────────────────────────────────
ITEM_PIPELINES = {
    "wheywise.pipelines.ValidationPipeline": 200,
    "wheywise.pipelines.DatabasePipeline": 300,
}

# ─── AutoThrottle ────────────────────────────────────────────────────────────
AUTOTHROTTLE_ENABLED = True
AUTOTHROTTLE_START_DELAY = 2
AUTOTHROTTLE_MAX_DELAY = 15
AUTOTHROTTLE_TARGET_CONCURRENCY = 1.5
AUTOTHROTTLE_DEBUG = False

# ─── Caching ─────────────────────────────────────────────────────────────────
HTTPCACHE_ENABLED = False  # Disable in production; enable for dev
HTTPCACHE_EXPIRATION_SECS = 3600
HTTPCACHE_DIR = "httpcache"
HTTPCACHE_IGNORE_HTTP_CODES = [403, 429, 500, 503]
HTTPCACHE_STORAGE = "scrapy.extensions.httpcache.FilesystemCacheStorage"

# ─── Logging ─────────────────────────────────────────────────────────────────
LOG_LEVEL = os.getenv("SCRAPY_LOG_LEVEL", "INFO")
LOG_FORMAT = "%(asctime)s [%(name)s] %(levelname)s: %(message)s"

# ─── Feed Settings ───────────────────────────────────────────────────────────
FEED_EXPORT_ENCODING = "utf-8"

# ─── Environment ─────────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "")
PROXY_URL = os.getenv("PROXY_URL", "")

# ─── Playwright (optional) ───────────────────────────────────────────────────
# Uncomment if using scrapy-playwright for JS-heavy pages
# DOWNLOAD_HANDLERS = {
#     "http": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
#     "https": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
# }
# TWISTED_REACTOR = "twisted.internet.asyncioreactor.AsyncioSelectorReactor"
# PLAYWRIGHT_BROWSER_TYPE = "chromium"
# PLAYWRIGHT_LAUNCH_OPTIONS = {"headless": True}
