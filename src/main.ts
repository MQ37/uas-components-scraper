import { PlaywrightCrawler, Dataset, KeyValueStore, log } from 'crawlee';
import type { PlaywrightCrawlingContext } from 'crawlee';
import { Actor } from 'apify';
import type { Page } from 'playwright';

interface Product {
    name: string;
    category: string;
    description: string;
    imageUrl: string;
    productCode: string | null;
    specifications: Record<string, string>;
    sourceUrl: string;
    scrapedAt: string;
}

interface Input {
    categories?: string[];
    maxProducts?: number;
}

const CATEGORY_PAGES: Record<string, string> = {
    'camera-systems': 'Camera Systems',
    'antennas': 'Antenna Trackers',
    'launch-and-landing-systems': 'Launch & Landing Systems',
    'pitot-tubes': 'Pitot Tubes',
    'batteries': 'Batteries',
    'software': 'Software',
};

const BASE_URL = 'https://uascomponents.com';

const CATEGORY_HEADINGS = new Set([
    'Advanced Camera Systems', 'Antenna Trackers & Communication Systems',
    'Antenna Trackers', 'Launch and Landing Systems', 'Launch & Landing Systems',
    'Pitot Tubes', 'Batteries', 'Software', 'Camera Systems',
    'Contact us for more information', 'Partners and clients', 'Get In Touch',
    'Why UAS Components?', 'Mission-Critical Equipment for Every Phase',
    'And Beyond', 'Home', 'Products', 'Services', 'About',
]);

const SKIP_NAMES = new Set([
    'Custom Battery Development', 'Learn more', 'Open page',
    'Go to internal page', 'Go to block', 'Privacy Policy', 'Terms of Service',
]);

function cleanName(raw: string): string {
    return raw.replace(/[\s\n]+/g, ' ').replace(/^NEW\s*/i, '').replace(/\s+/g, ' ').trim();
}

function isValidProduct(name: string): boolean {
    if (!name || name.length < 4) return false;
    if (CATEGORY_HEADINGS.has(name)) return false;
    if (SKIP_NAMES.has(name)) return false;
    if (/^(Home|About|Products|Services|Contacts?|Submit)$/i.test(name)) return false;
    return true;
}

async function extractProducts(page: Page, category: string, sourceUrl: string): Promise<Product[]> {
    // Use addScriptTag to inject the extraction logic, avoiding TS transpilation issues
    const result = await page.evaluate(`
        (() => {
            const cat = ${JSON.stringify(category)};
            const srcUrl = ${JSON.stringify(sourceUrl)};

            const CATEGORY_HEADINGS_INLINE = new Set([
                'Advanced Camera Systems', 'Antenna Trackers & Communication Systems',
                'Antenna Trackers', 'Launch and Landing Systems', 'Launch & Landing Systems',
                'Pitot Tubes', 'Batteries', 'Software', 'Camera Systems',
                'Contact us for more information', 'Partners and clients', 'Get In Touch',
                'Why UAS Components?', 'Mission-Critical Equipment for Every Phase',
                'And Beyond', 'Home', 'Products', 'Services', 'About',
            ]);
            const SKIP_NAMES_INLINE = new Set([
                'Custom Battery Development', 'Learn more', 'Open page',
                'Go to internal page', 'Go to block', 'Privacy Policy', 'Terms of Service',
            ]);

            function cleanName(raw) {
                return raw.replace(/[\\s\\n]+/g, ' ').replace(/^NEW\\s*/i, '').replace(/\\s+/g, ' ').trim();
            }
            function isValidProduct(name) {
                if (!name || name.length < 4) return false;
                if (CATEGORY_HEADINGS_INLINE.has(name)) return false;
                if (SKIP_NAMES_INLINE.has(name)) return false;
                if (/^(Home|About|Products|Services|Contacts?|Submit)$/i.test(name)) return false;
                return true;
            }

            const products = [];

            const allImgs = [];
            document.querySelectorAll('img').forEach((img) => {
                const src = img.src || img.getAttribute('data-src') || '';
                if (src.includes('res2.weblium.site')
                    && src.includes('_optimized_1140')
                    && !src.includes('logo') && !src.includes('icon') && !src.includes('favicon')) {
                    if (!allImgs.includes(src)) allImgs.push(src);
                }
            });

            const boldElements = [];
            document.querySelectorAll('.w-text-content').forEach((el) => {
                const html = el.innerHTML || '';
                if (html.includes('font-weight:bold') || html.includes('<b>') || html.includes('<strong>')) {
                    boldElements.push(el);
                }
            });

            let imageIndex = 0;

            for (const spanEl of boldElements) {
                const rawName = (spanEl.textContent || '').trim();
                const name = cleanName(rawName);
                if (!isValidProduct(name)) continue;

                let imageUrl = '';
                if (imageIndex < allImgs.length) {
                    imageUrl = allImgs[imageIndex];
                    imageIndex++;
                }

                const descParts = [];
                let productCode = null;
                const specifications = {};
                const seenTexts = new Set();

                const textBlock = spanEl.closest('p, div');
                let nextBlock = textBlock ? textBlock.nextElementSibling : null;

                for (let i = 0; i < 10 && nextBlock; i++) {
                    const nextBold = nextBlock.querySelector('[style*="font-weight:bold"], b, strong');
                    if (nextBold) break;

                    const text = (nextBlock.textContent || '').trim();
                    const normalized = text.toLowerCase().replace(/\\s+/g, ' ');

                    if (text && !seenTexts.has(normalized) && normalized !== 'learn more') {
                        seenTexts.add(normalized);

                        const codeMatch = text.match(/UASC\\.[A-Z0-9.-]+/);
                        if (codeMatch && !productCode) productCode = codeMatch[0];

                        const specMap = [
                            [/Capacity:\\s*(.+)/i, 'Capacity'],
                            [/Weight:\\s*(.+)/i, 'Weight'],
                            [/Range:\\s*(.+)/i, 'Range'],
                            [/Speed:\\s*(.+)/i, 'Speed'],
                            [/Takeoff\\s*Weight:\\s*(.+)/i, 'Takeoff Weight'],
                            [/Zoom:\\s*(.+)/i, 'Zoom'],
                            [/Resolution:\\s*(.+)/i, 'Resolution'],
                            [/Payload:\\s*(.+)/i, 'Payload'],
                        ];
                        for (const [pattern, key] of specMap) {
                            const m = text.match(pattern);
                            if (m) specifications[key] = m[1].trim();
                        }

                        descParts.push(text);
                    }

                    nextBlock = nextBlock.nextElementSibling;
                }

                products.push({
                    name,
                    category: cat,
                    description: descParts.join('\\n').trim(),
                    imageUrl,
                    productCode,
                    specifications,
                    sourceUrl: srcUrl,
                    scrapedAt: new Date().toISOString(),
                });
            }

            const seen = new Set();
            return products.filter((p) => {
                const key = p.name + '|' + p.category;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        })()
    `) as Product[];

    return result;
}

await Actor.init();

const input = (await KeyValueStore.getInput<Input>()) ?? {};
const categoriesToScrape = input.categories?.length
    ? input.categories.filter((c) => c in CATEGORY_PAGES)
    : Object.keys(CATEGORY_PAGES);

log.info(`Scraping ${categoriesToScrape.length} categories`, { categories: categoriesToScrape });

const startUrls = categoriesToScrape.map((slug) => ({
    url: `${BASE_URL}/${slug}`,
    label: 'category',
    userData: { category: CATEGORY_PAGES[slug], slug },
}));

let productCount = 0;

const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl: 20,
    launchContext: {
        launchOptions: { args: ['--no-sandbox'] },
    },

    async requestHandler({ page, request, log: reqLog }: PlaywrightCrawlingContext) {
        const { category, slug } = request.userData as { category: string; slug: string };
        reqLog.info(`Processing: ${slug}`);

        // Wait for the product images to load (Weblium lazy-loads them)
        await page.waitForSelector('.w-text-content', { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(2000);

        const products = await extractProducts(page, category, request.url);

        if (products.length > 0) {
            await Dataset.pushData(products);
            productCount += products.length;
            log.info(`${slug}: ${products.length} products`, {
                names: products.map((p) => p.name),
                withImages: products.filter((p) => p.imageUrl).length,
            });
        } else {
            reqLog.warning(`No products from ${slug}`);
        }
    },

    async failedRequestHandler({ request, log: failLog }) {
        failLog.error(`Failed: ${request.url}`);
    },
});

await crawler.run(startUrls);

log.info(`Done. ${productCount} total products.`);

await KeyValueStore.setValue('OUTPUT_SCHEMA', {
    type: 'object',
    properties: {
        name: { type: 'string' },
        category: { type: 'string' },
        description: { type: 'string' },
        imageUrl: { type: 'string' },
        productCode: { type: 'string' },
        specifications: { type: 'object' },
        sourceUrl: { type: 'string' },
        scrapedAt: { type: 'string', format: 'date-time' },
    },
});

await Actor.exit();
