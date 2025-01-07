import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

export interface ProductInfo {
  url: string;
  name: string;
  productName: string;
  product: string;
  totalReviews: number;
  starPages?: {
    one_star: number;
    two_star: number;
    three_star: number;
    four_star: number;
    five_star: number;
  };
}

// List of products to scrape
export const products: ProductInfo[] = [
  {
    url: 'https://www.amazon.com/Peruvian-Naturals-All-Natural-Chancapiedra-Stonebreaker/product-reviews/B07JJQ4312',
    name: 'chanca_piedra_peruvian_naturals',
    productName: 'Peruvian Naturals Chanca Piedra Capsules',
    product: 'Chanca piedra',
    totalReviews: 84
  },
  {
    url: 'https://www.amazon.com/Chanca-Piedra-Phyllanthus-niruri-Veggie/product-reviews/B0743MNB73',
    name: 'chanca_piedra_alerna',
    productName: 'Alerna: Chanca Piedra 500mg',
    product: 'Chanca piedra',
    totalReviews: 32
  },
  {
    url: 'https://www.amazon.com/Chanca-Piedra-800MG-Tablet-Gallbladder/product-reviews/B071KR997R',
    name: 'chanca_piedra_naturalisimolife',
    productName: 'NaturalisimoLife Chanca Piedra 1600 mg',
    product: 'Chanca piedra',
    totalReviews: 1130,
    starPages: {
      one_star: 9,
      two_star: 2,
      three_star: 4,
      four_star: 10,
      five_star: 90
    }
  },
  {
    url: 'https://www.amazon.com/STONE-BREAKER-Chanca-Piedra-Gallbladder/product-reviews/B01FERIHYE',
    name: 'chanca_piedra_eu_natural',
    productName: 'EU Natural: "Stone Breaker" chanca piedra',
    product: 'Chanca piedra',
    totalReviews: 1263,
    starPages: {
      one_star: 13,
      two_star: 5,
      three_star: 5,
      four_star: 14,
      five_star: 92
    }
  },
  {
    url: 'https://www.amazon.com/Herb-Pharm-Extract-Urinary-Support/product-reviews/B00PHVDUKE',
    name: 'chanca_piedra_herb_pharma_liquid',
    productName: 'Herb Pharm Chanca Piedra Liquid Extract 1Fl Oz',
    product: 'Chanca piedra',
    totalReviews: 50
  },
  {
    url: 'https://www.amazon.com/Capsules-Non-GMO-Traditional-Formula-Carlyle/product-reviews/B08LB1LX8C',
    name: 'chanca_piedra_carlyle',
    productName: 'Carlyle Chanca Piedra',
    product: 'Chanca piedra',
    totalReviews: 16
  },
  {
    url: 'https://www.amazon.com/Organic-Chanca-Piedra-Concentrate-Extract/product-reviews/B07578F6YF',
    name: 'chanca_piedra_cnp',
    productName: 'CNP Organic Chanca Piedra Concentrate & Extract',
    product: 'Chanca piedra',
    totalReviews: 28
  },
  {
    url: 'https://www.amazon.com/Activa-Naturals-Phyllanthus-Extract-Supplement/product-reviews/B00O5OUBCE',
    name: 'chanca_piedra_activa_naturals',
    productName: 'Activa Naturals Chanca Piedra',
    product: 'Chanca piedra',
    totalReviews: 13
  },
  {
    url: 'https://www.amazon.com/Chanca-Teabags-Breaker-Chancapiedra-Wild-Grown/product-reviews/B07KTPW9NB',
    name: 'chanca_piedra_hanan_tea',
    productName: 'Hanan Chanca Piedra Tea',
    product: 'Chanca piedra',
    totalReviews: 145,
    starPages: {
      one_star: 1,
      two_star: 1,
      three_star: 1,
      four_star: 2,
      five_star: 12
    }
  },
  {
    url: 'https://www.amazon.com/Standard-Process-Calcium-Phosphorous-Phosphorus-Vegetarian/product-reviews/B003DW9XWI',
    name: 'phosfood_standard_process',
    productName: 'Standard Process Phosfood Liquid',
    product: 'Phosfood',
    totalReviews: 33
  },
  {
    url: 'https://www.amazon.com/Rowatinex-Capsules-100-capsules-Rowa/product-reviews/B0006NXNFA',
    name: 'rowatinex_rowa',
    productName: 'Rowatinex by Rowa',
    product: 'Rowatinex',
    totalReviews: 77
  },
  {
    url: 'https://www.amazon.com/Pure-Encapsulations-Potassium-Essential-Vascular/product-reviews/B004DSE56K',
    name: 'potassium_citrate_pure_encapsulations',
    productName: 'Pure Encapsulations Potassium (Citrate)',
    product: 'Potassium citrate',
    totalReviews: 4
  },
  {
    url: 'https://www.amazon.com/BulkSupplements-Potassium-Citrate-Powder-Kilogram/product-reviews/B00ENSA93S',
    name: 'potassium_citrate_bulksupplements',
    productName: 'BulkSupplements.com Potassium Citrate Powder',
    product: 'Potassium citrate',
    totalReviews: 49
  },
  {
    url: 'https://www.amazon.com/Nutricost-Potassium-Citrate-99mg-Capsules/product-reviews/B01JN8WWQ4',
    name: 'potassium_citrate_nutricost',
    productName: 'Nutricost Potassium Citrate',
    product: 'Potassium citrate',
    totalReviews: 15
  },
  {
    url: 'https://www.amazon.com/NOW-Potassium-Citrate-180-Capsules/product-reviews/B001AWWC1W',
    name: 'potassium_citrate_now_foods',
    productName: 'NOW Foods Supplements, Potassium Citrate',
    product: 'Potassium citrate',
    totalReviews: 40
  },
  {
    url: 'https://www.amazon.com/Swanson-Potassium-Citrate-Caps-Pack/product-reviews/B07FH6XH17',
    name: 'potassium_citrate_swanson',
    productName: 'Swanson Potassium Citrate',
    product: 'Potassium citrate',
    totalReviews: 5
  },
  {
    url: 'https://www.amazon.com/Thorne-Research-Potassium-Highly-Absorbable-Supplement/product-reviews/B000FGWBPG',
    name: 'potassium_citrate_thorne',
    productName: 'Thorne Potassium Citrate',
    product: 'Potassium citrate',
    totalReviews: 5
  },
  {
    url: 'https://www.amazon.com/Potassium-Powerfully-Cardiovascular-Function-Friendly/product-reviews/B01KFALQ34',
    name: 'potassium_citrate_micro_ingredients',
    productName: 'Micro Ingredients US Origin Potassium Citrate Powder',
    product: 'Potassium citrate',
    totalReviews: 8
  },
  {
    url: 'https://www.amazon.com/Best-Naturals-Potassium-Citrate-Tablets/product-reviews/B08XSQDRLN',
    name: 'potassium_citrate_best_naturals',
    productName: 'Best Naturals Potassium Citrate',
    product: 'Potassium citrate',
    totalReviews: 5
  }
];

export const starFilters = [
  { name: 'one_star', param: 'one_star' },
  { name: 'two_star', param: 'two_star' },
  { name: 'three_star', param: 'three_star' },
  { name: 'four_star', param: 'four_star' },
  { name: 'five_star', param: 'five_star' }
];

export const headers = ['product', 'productName', 'reviewerName', 'title', 'date', 'verifiedPurchase', 'stars', 'text', 'helpful', 'size'];

function saveToCSV(reviews: any[], filename: string) {
  const csvRows = [
    headers.join(','),
    ...reviews.map(review => headers.map(header => {
      const content = String(review[header]).replace(/"/g, '""');
      return content.includes(',') ? `"${content}"` : content;
    }).join(','))
  ];

  const outputFile = path.join(__dirname, filename);
  fs.writeFileSync(outputFile, csvRows.join('\n'));
  console.log(`Saved ${reviews.length} reviews to ${outputFile}`);
}

function mergeCSVFiles() {
  const csvFiles = fs.readdirSync(__dirname).filter(file => 
    file.endsWith('_reviews.csv') && !file.startsWith('all_')
  );

  let allReviews: string[] = [headers.join(',')];  // Start with headers

  csvFiles.forEach(file => {
    const content = fs.readFileSync(path.join(__dirname, file), 'utf-8');
    const lines = content.split('\n');
    // Skip the header line (first line) for all files except the first
    allReviews.push(...lines.slice(1).filter(line => line.trim()));
  });

  const outputFile = path.join(__dirname, 'all_product_reviews.csv');
  fs.writeFileSync(outputFile, allReviews.join('\n'));
  console.log(`Merged all reviews into ${outputFile}`);
}

async function scrapeRegularProduct(page: any, product: ProductInfo): Promise<any[]> {
  const reviews: any[] = [];
  const totalPages = Math.ceil(product.totalReviews / 10);
  
  for (let currentPage = 1; currentPage <= Math.min(totalPages, 10); currentPage++) {
    const pageUrl = `${product.url}/ref=cm_cr_arp_d_viewopt_sr?ie=UTF8&reviewerType=all_reviews&sortBy=recent&pageNumber=${currentPage}&filterByKeyword=stone`;
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
        size: el.querySelector('[data-hook="format-strip"]')?.textContent?.trim() || '',
        productName: ''
      }));
    });

    pageReviews.forEach(review => {
      review.productName = product.productName;
      review.product = product.product;
    });

    reviews.push(...pageReviews);
    console.log(`Scraped page ${currentPage} of ${Math.min(totalPages, 10)} for ${product.name}`);
    await page.waitForTimeout(1000);
  }

  return reviews;
}

async function scrapeByStarRating(page: any, product: ProductInfo): Promise<any[]> {
  const reviews: any[] = [];

  if (!product.starPages) {
    console.error(`Product ${product.name} has >100 reviews but no starPages specified!`);
    return reviews;
  }

  for (const starFilter of starFilters) {
    const totalPages = product.starPages[starFilter.name as keyof typeof product.starPages];
    console.log(`Scraping ${starFilter.name} reviews (${totalPages} pages)`);

    for (let currentPage = 1; currentPage <= Math.min(totalPages, 10); currentPage++) {
      const pageUrl = `${product.url}/ref=cm_cr_arp_d_viewopt_sr?ie=UTF8&reviewerType=all_reviews&sortBy=recent&pageNumber=${currentPage}&filterByKeyword=stone&filterByStar=${starFilter.param}`;
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
          size: el.querySelector('[data-hook="format-strip"]')?.textContent?.trim() || '',
          productName: ''
        }));
      });

      pageReviews.forEach(review => {
        review.productName = product.name;
      });

      reviews.push(...pageReviews);
      console.log(`Scraped page ${currentPage} of ${totalPages} for ${product.name} ${starFilter.name}`);
      await page.waitForTimeout(1000);
    }
  }

  return reviews;
}

test('scrape amazon reviews', async ({ browser }) => {
  test.setTimeout(600000); // 10 minutes
  
  const authFile = path.join(__dirname, 'amazonAuth.json');
  const context = await browser.newContext({
    storageState: authFile
  });
  
  const page = await context.newPage();

  // Process each product
  for (const product of products) {
    console.log(`Starting to scrape reviews for ${product.name}`);
    
    try {
      const productReviews = product.totalReviews > 100 
        ? await scrapeByStarRating(page, product)
        : await scrapeRegularProduct(page, product);
      
      // Save individual product reviews to CSV
      saveToCSV(productReviews, `${product.name}_reviews.csv`);
    } catch (error) {
      console.error(`Error scraping ${product.name}:`, error);
    }
  }

  // Merge all individual CSV files into one
  mergeCSVFiles();
});