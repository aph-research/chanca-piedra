import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

interface RedditComment {
  postTitle: string;
  postUrl: string;
  author: string;
  date: string;
  text: string;
  isOriginalPost: boolean;
  score?: string;
}

interface SearchConfig {
  keywords: string[];
  searchUrl: string;
}

// Define all search configurations
const searchConfigs: SearchConfig[] = [
  // {
  //   keywords: ['chanca', 'chanka'],
  //   searchUrl: 'https://www.reddit.com/r/KidneyStones/search/?q=chanca+piedra&sort=relevance'
  // },
  // {
  //   keywords: ['allopurinol', 'allopurinal'],
  //   searchUrl: 'https://www.reddit.com/r/KidneyStones/search/?q=allopurinol&sort=relevance'
  // },
  // {
  //   keywords: ['flomax', 'flowmax'],
  //   searchUrl: 'https://www.reddit.com/r/KidneyStones/search/?q=flomax&sort=comments'
  // },
  // {
  //   keywords: ['tamsulosin'],
  //   searchUrl: 'https://www.reddit.com/r/KidneyStones/search/?q=tamsulosin&sort=relevance'
  // },
  {
    keywords: ['potassium'],
    searchUrl: 'https://www.reddit.com/r/KidneyStones/search/?q=%22Potassium+Citrate%22&sort=relevance'
  },
  // {
  //   keywords: ['hydrochlorothiazide', 'HCTZ'],
  //   searchUrl: 'https://www.reddit.com/r/KidneyStones/search/?q=Hydrochlorothiazide&sort=relevance'
  // },
  // {
  //   keywords: ['garcinia'],
  //   searchUrl: 'https://www.reddit.com/r/KidneyStones/search/?q=garcinia&sort=relevance'
  // },
  // {
  //   keywords: ['hydroxycitric', 'hydroxycitrate'],
  //   searchUrl: 'https://www.reddit.com/r/KidneyStones/search/?q=Hydroxycitric&sort=relevance'
  // },
  // {
  //   keywords: ['rowatinex'],
  //   searchUrl: 'https://www.reddit.com/r/KidneyStones/search/?q=rowatinex&sort=relevance'
  // },
  // {
  //   keywords: ['phosfood'],
  //   searchUrl: 'https://www.reddit.com/r/KidneyStones/search/?q=phosfood&sort=relevance'
  // },
  // {
  //   keywords: ['black'],
  //   searchUrl: 'https://www.reddit.com/r/KidneyStones/search/?q=%22Black+seed%22&sort=relevance'
  // }
];

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function tryWithRetry(fn: () => Promise<any>, maxRetries = 3, baseDelay = 5000): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const isRateLimit = error.message.includes('ERR_HTTP_RESPONSE_CODE_FAILURE');
      const waitTime = isRateLimit ? 
        baseDelay * Math.pow(2, attempt - 1) :
        baseDelay;
      
      console.log(`Attempt ${attempt} failed. Waiting ${waitTime/1000} seconds before retry...`);
      await delay(waitTime);
    }
  }
}

function containsKeywords(text: string, keywords: string[]): boolean {
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

const headers = ['postTitle', 'postUrl', 'author', 'date', 'text', 'isOriginalPost', 'score'];

function saveToCSV(comments: RedditComment[], filename: string) {
  // Clean and normalize text content
  const cleanComments = comments.map(comment => ({
    ...comment,
    text: comment.text
      .replace(/\r?\n|\r/g, ' ') // Replace newlines with spaces
      .replace(/\s+/g, ' ')      // Normalize multiple spaces
      .trim()
  }));

  const csvRows = [
    headers.join(','),
    ...cleanComments.map(comment => headers.map(header => {
      let content = String(comment[header as keyof RedditComment] || '');
      
      // Clean the content and handle special characters
      content = content
        .replace(/"/g, '""')         // Escape quotes
        .replace(/\r?\n|\r/g, ' ')   // Replace newlines
        .replace(/\s+/g, ' ')        // Normalize spaces
        .trim();
      
      // Always wrap in quotes to handle any special characters
      return `"${content}"`;
    }).join(','))
  ];

  const outputFile = path.join(__dirname, filename);
  fs.writeFileSync(outputFile, csvRows.join('\n'));
  console.log(`Saved ${comments.length} comments to ${outputFile}`);
}

async function scrollForMoreResults(page: any) {
  let previousHeight = 0;
  let noNewContentCount = 0;
  
  while (noNewContentCount < 3) { // Stop if we see no new content 3 times in a row
    // Get current height
    const currentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    
    if (currentHeight === previousHeight) {
      noNewContentCount++;
      console.log('No new content loaded, attempt', noNewContentCount);
    } else {
      noNewContentCount = 0;
      console.log('Found new content, scrolling more...');
    }
    
    previousHeight = currentHeight;
    
    // Scroll to bottom
    await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
    });
    
    // Wait for potential new content to load
    await page.waitForTimeout(2000);
    
    // Log current number of results
    const resultCount = await page.$$eval('a[data-testid="post-title-text"]', 
      (elements: any[]) => elements.length);
    console.log(`Current number of results: ${resultCount}`);
  }
  
  console.log('No more results to load after several attempts');
}

async function expandAllComments(page: any) {
  let keepExpanding = true;
  while (keepExpanding) {
    try {
      const expandButtons = await page.$$('button:has-text("Show more replies")');
      if (expandButtons.length === 0) {
        keepExpanding = false;
        continue;
      }

      for (const button of expandButtons) {
        await button.click();
        await page.waitForTimeout(1000);
      }
    } catch (error) {
      console.log('Finished expanding comments');
      keepExpanding = false;
    }
  }
}

async function extractCommentsFromPost(
  page: any, 
  postUrl: string, 
  postTitle: string, 
  keywords: string[]
): Promise<RedditComment[]> {
  const comments: RedditComment[] = [];
  console.log(`Processing post: ${postTitle}`);
  
  try {
    await page.goto(postUrl);
    await page.waitForTimeout(2000);
    
    const hasComments = await page.$('shreddit-comment');
    
    if (hasComments) {
      await page.waitForSelector('shreddit-comment', { timeout: 5000 });
      await expandAllComments(page);
    } else {
      console.log('No comments found in this post');
    }

    try {
      const postContent = await page.evaluate(() => {
        const textBodyDiv = document.querySelector('div[slot="text-body"]');
        const postTextDiv = textBodyDiv?.querySelector('div[id$="-post-rtjson-content"]');
        const post = document.querySelector('shreddit-post');
        const title = post?.getAttribute('post-title') || '';
        
        const postText = [
          title,
          postTextDiv?.textContent?.trim() || ''
        ].join(' ');
        
        return {
          text: postText,
          author: post?.getAttribute('author') || '[deleted]',
          date: post?.getAttribute('created-timestamp') || ''
        };
      });

      if (containsKeywords(postContent.text, keywords)) {
        comments.push({
          postTitle,
          postUrl,
          author: postContent.author,
          date: new Date(postContent.date).toISOString(),
          text: postContent.text,
          isOriginalPost: true
        });
      }
    } catch (error) {
      console.error(`Error extracting post content from ${postUrl}:`, error);
    }

    const commentElements = await page.$$('shreddit-comment');
    
    for (const commentEl of commentElements) {
      const commentData = await commentEl.evaluate((el: any) => {
        const contentDiv = el.querySelector('div[id$="-comment-rtjson-content"]');
        const text = contentDiv?.textContent?.toLowerCase() || '';
        
        return {
          text,
          author: el.getAttribute('author') || '[deleted]',
          date: el.querySelector('faceplate-timeago time')?.getAttribute('datetime') || '',
          score: el.getAttribute('score') || '0'
        };
      });
      
      if (containsKeywords(commentData.text, keywords)) {
        comments.push({
          postTitle,
          postUrl,
          author: commentData.author,
          date: new Date(commentData.date).toISOString(),
          text: commentData.text,
          isOriginalPost: false,
          score: commentData.score
        });
      }
    }
  } catch (error) {
    console.error(`Error processing post ${postUrl}:`, error);
  }

  return comments;
}

async function processSearchConfig(
  browser: any,  // Changed from page to browser to create multiple pages
  config: SearchConfig
): Promise<void> {
  console.log(`\n=== Processing search for keywords: ${config.keywords.join(', ')} ===\n`);
  
  let allComments: RedditComment[] = [];
  const progressFilename = `reddit_comments_progress_${config.keywords[0]}.csv`;
  const finalFilename = `reddit_comments_final_${config.keywords[0]}.csv`;
  
  const context = await browser.newContext({
    storageState: path.join(__dirname, 'redditAuth.json'),
    reducedMotion: 'reduce'
  });
  const mainPage = await context.newPage();
  
  try {
    await mainPage.goto(config.searchUrl);
    await mainPage.waitForSelector('a[data-testid="post-title-text"]', { timeout: 30000 });
    await scrollForMoreResults(mainPage);

    const posts = await mainPage.$$eval('a[data-testid="post-title-text"]',
      (elements: any[]) => elements.map(el => ({
        url: el.href,
        title: el.textContent.trim()
      })));

    console.log(`Found ${posts.length} posts to process`);

    // Process posts in parallel batches
    const batchSize = 5; // Process 5 posts at a time
    for (let i = 0; i < posts.length; i += batchSize) {
      const batch = posts.slice(i, i + batchSize);
      
      // Create a new page for each post in the batch
      const batchPromises = batch.map(async (post) => {
        const page = await context.newPage();
        try {
          const comments = await tryWithRetry(() => 
            extractCommentsFromPost(page, post.url, post.title, config.keywords)
          );
          await page.close();
          return comments;
        } catch (error) {
          console.error(`Error processing post ${post.url} after all retries:`, error);
          await page.close();
          return [];
        }
      });

      // Wait for all posts in the batch to complete
      const batchResults = await Promise.all(batchPromises);
      const newComments = batchResults.flat();
      allComments.push(...newComments);
      
      console.log(`Processed batch of ${batch.length} posts. Found ${newComments.length} new comments.`);
      saveToCSV(allComments, progressFilename);
      
      // Short delay between batches to avoid overwhelming the server
      await delay(1000);
    }

    await mainPage.close();
    await context.close();
    
    saveToCSV(allComments, finalFilename);
    console.log(`Finished processing search for ${config.keywords[0]}. Total comments found: ${allComments.length}`);

  } catch (error) {
    console.error('Fatal error:', error);
    if (allComments.length > 0) {
      saveToCSV(allComments, finalFilename);
    }
    await mainPage.close();
    await context.close();
  }
}

test('scrape reddit comments for all keywords', async ({ browser }) => {
  test.setTimeout(4800000 * searchConfigs.length);

  // Process each search configuration sequentially
  for (const config of searchConfigs) {
    await processSearchConfig(browser, config);
    // Add extra delay between different searches to avoid rate limiting
    await delay(5000);
  }
  
  console.log('\n=== Completed all searches ===\n');
});