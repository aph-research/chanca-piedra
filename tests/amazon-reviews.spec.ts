import { test } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test('scrape amazon reviews', async ({ browser }) => {
  const authFile = path.join(__dirname, 'amazonAuth.json');
  const context = await browser.newContext({
    storageState: authFile
  });
  
  const page = await context.newPage();
  const reviews: any[] = [];
  const totalPages = 9;

  for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
    await page.goto(`https://www.amazon.com/Peruvian-Naturals-All-Natural-Chancapiedra-Stonebreaker/product-reviews/B07JJQ4312/ref=cm_cr_arp_d_viewopt_rvwer?ie=UTF8&reviewerType=avp_only_reviews&pageNumber=${currentPage}&filterByKeyword=stone`);
    
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
    console.log(`Scraped page ${currentPage} of ${totalPages}`);
  }

  // Convert to CSV
  const headers = ['reviewerName', 'title', 'date', 'verifiedPurchase', 'stars', 'text', 'helpful', 'size'];
  const csvRows = [
    headers.join(','), // Header row
    ...reviews.map(review => headers.map(header => {
      // Escape commas and quotes in the content
      const content = String(review[header]).replace(/"/g, '""');
      return content.includes(',') ? `"${content}"` : content;
    }).join(','))
  ];

  // Save to CSV file
  const outputFile = path.join(__dirname, 'chanca_piedra_reviews.csv');
  fs.writeFileSync(outputFile, csvRows.join('\n'));
  console.log(`Saved ${reviews.length} reviews to ${outputFile}`);
});