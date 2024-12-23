import { test } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Interface for product info
interface ProductInfo {
  url: string;
  name: string;
  totalPages: number;
}

// List of products to scrape
const products: ProductInfo[] = [
  {
    url: 'https://www.amazon.com/Peruvian-Naturals-All-Natural-Chancapiedra-Stonebreaker/product-reviews/B07JJQ4312',
    name: 'chanca_piedra_peruvian_naturals',
    totalPages: 9
  },
  {
    url: 'https://www.amazon.com/Chanca-Piedra-Phyllanthus-niruri-Veggie/product-reviews/B0743MNB73/',
    name: 'chanca_piedra_alerna',
    totalPages: 4
  },
  {
    url: 'https://www.amazon.com/Chanca-Piedra-800MG-Tablet-Gallbladder/product-reviews/B071KR997R/',
    name: 'chanca_piedra_naturalismolife',
    totalPages: 129
  },
  {
    url: 'https://www.amazon.com/STONE-BREAKER-Chanca-Piedra-Gallbladder/product-reviews/B01FERIHYE/',
    name: 'chanca_piedra_eu_natural',
    totalPages: 127
  },
  {
    url: 'https://www.amazon.com/Herb-Pharm-Extract-Urinary-Support/product-reviews/B00PHVDUKE/',
    name: 'chanca_piedra_herb_pharma_liquid',
    totalPages: 5
  },
  {
    url: 'https://www.amazon.com/Capsules-Non-GMO-Traditional-Formula-Carlyle/product-reviews/B08LB1LX8C/',
    name: 'chanca_piedra_carlyle',
    totalPages: 2
  },
  {
    url: 'https://www.amazon.com/Organic-Chanca-Piedra-Concentrate-Extract/product-reviews/B07578F6YF/',
    name: 'chanca_piedra_cnp',
    totalPages: 3
  },
  {
    url: 'https://www.amazon.com/Activa-Naturals-Phyllanthus-Extract-Supplement/product-reviews/B00O5OUBCE/',
    name: 'chanca_piedra_activa_naturals',
    totalPages: 2
  },
  {
    url: 'https://www.amazon.com/Chanca-Teabags-Breaker-Chancapiedra-Wild-Grown/product-reviews/B07KTPW9NB/',
    name: 'chanca_piedra_hanan_tea',
    totalPages: 15
  },
  {
    url: 'https://www.amazon.com/Standard-Process-Calcium-Phosphorous-Phosphorus-Vegetarian/product-reviews/B003DW9XWI/',
    name: 'phosfood_standard_process',
    totalPages: 4
  },
  {
    url: 'https://www.amazon.com/Rowatinex-Capsules-100-capsules-Rowa/product-reviews/B0006NXNFA/',
    name: 'rowatinex_rowa',
    totalPages: 8
  },
  {
    url: 'https://www.amazon.com/Pure-Encapsulations-Potassium-Essential-Vascular/product-reviews/B004DSE56K/',
    name: 'potassium_citrate_pure_encapsulations',
    totalPages: 1
  },
  {
    url: 'https://www.amazon.com/BulkSupplements-Potassium-Citrate-Powder-Kilogram/product-reviews/B00ENSA93S/',
    name: 'potassium_citrate_bulksupplements',
    totalPages: 5
  },
  {
    url: 'https://www.amazon.com/Nutricost-Potassium-Citrate-99mg-Capsules/product-reviews/B01JN8WWQ4/',
    name: 'potassium_citrate_nutricost',
    totalPages: 2
  },
  {
    url: 'https://www.amazon.com/NOW-Potassium-Citrate-180-Capsules/product-reviews/B001AWWC1W/',
    name: 'potassium_citrate_now_foods',
    totalPages: 4
  },
];

test('scrape amazon reviews', async ({ browser }) => {
  const authFile = path.join(__dirname, 'amazonAuth.json');
  const context = await browser.newContext({
    storageState: authFile
  });
  
  const page = await context.newPage();

  // Process each product
  for (const product of products) {
    const reviews: any[] = [];
    console.log(`Starting to scrape reviews for ${product.name}`);

    for (let currentPage = 1; currentPage <= product.totalPages; currentPage++) {
      const pageUrl = `${product.url}/ref=cm_cr_arp_d_viewopt_rvwer?ie=UTF8&reviewerType=avp_only_reviews&pageNumber=${currentPage}&filterByKeyword=stone`;
      await page.goto(pageUrl);
      
      await page.waitForSelector('[data-hook="review"]');

      const pageReviews = await page.$$eval('[data-hook="review"]', elements => {
        return elements.map(el => ({
          reviewerName: el.querySelector('.a-profile-name')?.textContent || '',
          title: el.querySelector('[data-hook="review-title"] span:last-child')?.textContent?.trim() || '',
          date: el.querySelector('[data-hook="review-date"]')?.textContent || '',
          verifiedPurchase: !!el.querySelector('[data-hook="avp-badge"]'),
          stars: el.querySelector('[data-hook="review-star-rating"] .a-icon-alt')?.textContent || '',
          text: el.querySelector('[data-hook="review-body"] span')?.textContent?.trim() || '',
          helpful: el.querySelector('[data-hook="helpful-vote-statement"]')?.textContent || '',
          size: el.querySelector('[data-hook="format-strip"]')?.textContent?.trim() || ''
        }));
      });

      reviews.push(...pageReviews);
      console.log(`Scraped page ${currentPage} of ${product.totalPages} for ${product.name}`);
    }

    // Convert to CSV
    const headers = ['reviewerName', 'title', 'date', 'verifiedPurchase', 'stars', 'text', 'helpful', 'size'];
    const csvRows = [
      headers.join(','),
      ...reviews.map(review => headers.map(header => {
        const content = String(review[header]).replace(/"/g, '""');
        return content.includes(',') ? `"${content}"` : content;
      }).join(','))
    ];

    // Save to CSV file with product name
    const outputFile = path.join(__dirname, `${product.name}_reviews.csv`);
    fs.writeFileSync(outputFile, csvRows.join('\n'));
    console.log(`Saved ${reviews.length} reviews to ${outputFile}`);
  }
});