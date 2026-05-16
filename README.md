# uas-components-scraper

Apify Actor that scrapes UAV components from [uascomponents.com](https://uascomponents.com) — a Ukrainian manufacturer of camera systems, antenna trackers, launch systems, pitot tubes, batteries, and software.

## What it scrapes

Crawls all product categories on uascomponents.com and extracts product name, category, description, images, SKU codes, and technical specifications.

## Quick start

```bash
pnpm install
pnpm dev         # watch mode with tsx
pnpm build       # compile TypeScript
pnpm start       # run compiled output
```

## Input

```json
{
  "categories": ["batteries", "camera-systems"],
  "maxProducts": 0,
  "includeImages": true
}
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `categories` | string[] | `[]` (all) | Category slugs to scrape. Empty = all categories |
| `maxProducts` | number | `0` (unlimited) | Max products to extract |
| `includeImages` | boolean | `false` | Include image URLs in output |

## Output schema

```json
{
  "name": "string",
  "category": "string",
  "description": "string",
  "imageUrl": "string",
  "productCode": "string | null (SKU, e.g. UASC.B220.000.00-01)",
  "specifications": {
    "capacity": "string | undefined",
    "weight": "string | undefined",
    "range": "string | undefined"
  },
  "sourceUrl": "string",
  "scrapedAt": "ISO 8601 date"
}
```

## Site structure

uascomponents.com is a Weblium static site. Category pages list products with images and short descriptions. Product detail pages contain full specifications in structured HTML. No JavaScript rendering needed.

## Tech stack

- **Crawlee** — CheerioCrawler
- **Cheerio** — HTML parsing
- **Apify SDK** — Actor lifecycle + dataset storage
- Node.js 22+
