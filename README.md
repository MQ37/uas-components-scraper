# UAS Components Scraper

Apify Actor that scrapes all products from [uascomponents.com](https://uascomponents.com) — a Ukrainian manufacturer of UAV components including camera systems, antenna trackers, launch systems, pitot tubes, batteries, and software.

## Output Schema

Each product in the dataset:

| Field | Type | Description |
|---|---|---|
| `name` | string | Product name |
| `category` | string | Product category |
| `description` | string | Short description |
| `fullDescription` | string | Full description text |
| `imageUrl` | string | Product image URL |
| `productCode` | string \| null | SKU code (e.g. UASC.B220.000.00-01) |
| `specifications` | object | Tech specs (capacity, weight, range, etc.) |
| `sourceUrl` | string | Source page URL |
| `scrapedAt` | string | ISO timestamp |

## Input

```json
{
  "categories": ["batteries", "camera-systems"],
  "maxProducts": 0,
  "includeImages": true
}
```

- **categories** — optional array of category slugs. Empty = all categories.
- **maxProducts** — limit results (0 = unlimited).
- **includeImages** — include image URLs.

## Development

```bash
pnpm install
pnpm dev           # Run locally with tsx
pnpm build         # Compile TypeScript
pnpm start         # Run compiled version
```

## Site Structure

The site is a Weblium static site with category pages:

| Slug | Category |
|---|---|
| `/camera-systems` | Camera Systems |
| `/antennas` | Antenna Trackers |
| `/launch-and-landing-systems` | Launch & Landing |
| `/pitot-tubes` | Pitot Tubes |
| `/batteries` | Batteries |
| `/software` | Software |
| `/products` | All (combined) |
