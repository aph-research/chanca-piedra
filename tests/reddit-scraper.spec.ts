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

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function tryWithRetry(fn: () => Promise<any>, maxRetries = 3, baseDelay = 5000): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      // If it's a rate limit error, wait longer
      const isRateLimit = error.message.includes('ERR_HTTP_RESPONSE_CODE_FAILURE');
      const waitTime = isRateLimit ? 
        baseDelay * Math.pow(2, attempt - 1) : // Exponential backoff for rate limits
        baseDelay; // Regular delay for other errors
      
      console.log(`Attempt ${attempt} failed. Waiting ${waitTime/1000} seconds before retry...`);
      await delay(waitTime);
    }
  }
}

// const keywords = ['chanca', 'chanka'];
// const keywords = ['allopurinol', 'allopurinal'];
// const keywords = ['flomax', 'flowmax'];
// const keywords = ['tamsulosin'];
// const keywords = ['potassium'];
// const keywords = ['hydrochlorothiazide', 'HCTZ'];
// const keywords = ['garcinia'];
// const keywords = ['hydroxycitric', 'hydroxycitrate'];
// const keywords = ['rowatinex'];
const keywords = ['phosfood'];
// const keywords = ['black'];

function containsKeywords(text: string): boolean {
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => lowerText.includes(keyword));
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
function appendToCSV(comments: RedditComment[], filename: string) {
  // Clean and normalize text content
  const cleanComments = comments.map(comment => ({
    ...comment,
    text: comment.text
      .replace(/\r?\n|\r/g, ' ') // Replace newlines with spaces
      .replace(/\s+/g, ' ')      // Normalize multiple spaces
      .trim()
  }));

  const csvRows = cleanComments.map(comment => 
    headers.map(header => {
      let content = String(comment[header as keyof RedditComment] || '');
      content = content
        .replace(/"/g, '""')         // Escape quotes
        .replace(/\r?\n|\r/g, ' ')   // Replace newlines
        .replace(/\s+/g, ' ')        // Normalize spaces
        .trim();
      return `"${content}"`;
    }).join(',')
  );

  const outputFile = path.join(__dirname, filename);
  fs.appendFileSync(outputFile, '\n' + csvRows.join('\n'));
  console.log(`Appended ${comments.length} comments to ${outputFile}`);
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
    const resultCount = await page.$eval('a[data-testid="post-title-text"]', 
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

async function extractCommentsFromPost(page: any, postUrl: string, postTitle: string): Promise<RedditComment[]> {
  const comments: RedditComment[] = [];
  console.log(`Processing post: ${postTitle}`);
  
  try {
    await page.goto(postUrl);
    
    // First check if there are any comments
    await page.waitForTimeout(2000); // Give the page a moment to load
    
    // Check if there are any comments
    const hasComments = await page.$('shreddit-comment');
    
    if (hasComments) {
      // Wait for comments to fully load and expand them
      await page.waitForSelector('shreddit-comment', { timeout: 5000 });
      await expandAllComments(page);
    } else {
      console.log('No comments found in this post');
    }

    // Check if the original post content contains the keywords
    try {
      const postContent = await page.evaluate(() => {
        // Get post content
        const textBodyDiv = document.querySelector('div[slot="text-body"]');
        const postTextDiv = textBodyDiv?.querySelector('div[id$="-post-rtjson-content"]');
        
        // Get post metadata from the shreddit-post element
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
      
      console.log('Found post content:', postContent.text); // Debug log
      console.log('Contains keywords?', containsKeywords(postContent.text)); // Debug log

      if (containsKeywords(postContent.text)) {
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

    // Extract all comments
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
      
      if (containsKeywords(commentData.text)) {
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

  return comments;  // Make sure we always return the comments array
}

test('scrape reddit comments', async ({ browser }) => {
  test.setTimeout(4800000); // 80 minutes
  
  const context = await browser.newContext({
    storageState: path.join(__dirname, 'redditAuth.json')  // Use the saved auth state
  });
  const page = await context.newPage();

  let allComments: RedditComment[] = [];
  
  try {
    // Navigate to the search results
    // await page.goto('https://www.reddit.com/r/KidneyStones/search/?q=chanca+piedra&sort=relevance');
    // await page.goto('https://www.reddit.com/r/KidneyStones/search/?q=allopurinol&sort=relevance');
    // await page.goto('https://www.reddit.com/r/KidneyStones/search/?q=flomax&sort=comments');
    // await page.goto('https://www.reddit.com/r/KidneyStones/search/?q=tamsulosin&sort=relevance');
    // await page.goto('https://www.reddit.com/r/KidneyStones/search/?q=%22Potassium+Citrate%22&sort=relevance');
    // await page.goto('https://www.reddit.com/r/KidneyStones/search/?q=Hydrochlorothiazide&sort=relevance');
    // await page.goto('https://www.reddit.com/r/KidneyStones/search/?q=rowatinex&sort=relevance');
    await page.goto('https://www.reddit.com/r/KidneyStones/search/?q=phosfood&sort=relevance');
    // await page.goto('https://www.reddit.com/r/KidneyStones/search/?q=garcinia&sort=relevance');
    // await page.goto('https://www.reddit.com/r/KidneyStones/search/?q=Hydroxycitric&sort=relevance');
    // await page.goto('https://www.reddit.com/r/KidneyStones/search/?q=%22Black+seed%22&sort=relevance');

    await page.waitForSelector('a[data-testid="post-title-text"]', { timeout: 30000 });

    // Scroll to load more search results
    await scrollForMoreResults(page);

    // Get all post URLs and titles
    const posts = await page.$$eval('a[data-testid="post-title-text"]',
      (elements: any[]) => elements.map(el => ({
        url: el.href,
        title: el.textContent.trim()
      })));

    console.log(`Found ${posts.length} posts to process`);

    // Process each post
    for (const post of posts) {
      try {
        const comments = await tryWithRetry(() => 
          extractCommentsFromPost(page, post.url, post.title)
        );
        allComments.push(...comments);
        console.log(`Found ${comments.length} relevant comments in post`);
        
        // Save progress after each post
        saveToCSV(allComments, 'reddit_comments_progress.csv');
        
        // Wait between requests to avoid rate limiting
        await delay(3000); // Increased base delay between requests
      } catch (error) {
        console.error(`Error processing post ${post.url} after all retries:`, error);
        continue;
      }
    }

    // Save final results
    saveToCSV(allComments, 'reddit_comments_final_' + keywords[0] + '.csv');
    console.log(`Finished processing all posts. Total comments found: ${allComments.length}`);

  } catch (error) {
    console.error('Fatal error:', error);
    // Save whatever we have in case of fatal error
    if (allComments.length > 0) {
      saveToCSV(allComments, 'reddit_comments_final_${keywords[0]}.csv');
      /// appendToCSV(allComments, `reddit_comments_final_${keywords[0]}.csv`);
    }
  }
});