import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
import re
from typing import Dict, Optional, Tuple

class WebMDSupplementRatingsScraper:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        
    def clean_url(self, url: str) -> str:
        """Clean malformed URLs that might have duplicate domains"""
        # Fix double domain issue
        if url.startswith('https://www.webmd.comhttps://'):
            url = url.replace('https://www.webmd.comhttps://', 'https://')
        return url

    def get_review_url(self, main_url: str) -> str:
        """Construct the review URL from the main URL format"""
        try:
            # Extract the supplement ID and name from the main URL
            match = re.search(r'ingredientmono-(\d+)/([^/]+)$', main_url)
            if match:
                supplement_id = match.group(1)
                supplement_name = match.group(2)
                review_url = f"https://reviews.webmd.com/vitamins-supplements/ingredientreview-{supplement_id}-{supplement_name.upper()}"
                print(f"Constructed review URL: {review_url}")
                return review_url
            return None
        except Exception as e:
            print(f"Error constructing review URL: {str(e)}")
            return None

    def get_ratings_from_review_url(self, url: str) -> Tuple[Optional[float], Optional[int]]:
        """Extract overall rating and number of reviews from a supplement's review page"""
        try:
            # First get the correct review URL 
            main_url = self.clean_url(url)
            review_url = self.get_review_url(main_url)
            
            if not review_url:
                print("Could not construct review URL")
                return None, None
                
            print(f"Fetching reviews from: {review_url}")
            
            response = requests.get(review_url, headers=self.headers)
            if not response.ok:
                print(f"Failed to get review page: {response.status_code}")
                return None, None
                
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Look for rating in the overall experience rating section
            try:
                rating_elem = soup.find('span', class_='rat-num')
                print(f"Rating element found: {rating_elem}")
                if rating_elem and rating_elem.text:
                    rating = float(rating_elem.text.strip())
                    
                    # Look for review count in active tab
                    active_tab = soup.find('li', class_='active-tab')
                    if active_tab:
                        tab_span = active_tab.find('span')
                        if tab_span and '(' in tab_span.text and ')' in tab_span.text:
                            count = int(tab_span.text.strip('()'))
                            print(f"Found rating {rating} and count {count}")
                            return rating, count
                    
                    # Backup method: Look in the schema metadata
                    scripts = soup.find_all('script', {'type': 'application/ld+json'})
                    for script in scripts:
                        try:
                            data = json.loads(script.string)
                            if data.get("@type") == "Product" and "aggregateRating" in data:
                                count = int(data["aggregateRating"]["reviewCount"])
                                print(f"Found rating {rating} and count {count} from metadata")
                                return rating, count
                        except:
                            continue
            
            except Exception as e:
                print(f"Error parsing rating: {str(e)}")
                return None, None
                
            return None, None
            
        except Exception as e:
            print(f"Error processing review page: {str(e)}")
            return None, None

    def scrape_all_ratings(self, input_csv: str) -> pd.DataFrame:
        """Scrape ratings for all supplements from the input CSV containing URLs"""
        # Read supplement URLs
        df = pd.read_csv(input_csv)
        
        # Add columns for ratings data if they don't exist
        if 'rating' not in df.columns:
            df['rating'] = None
        if 'num_reviews' not in df.columns:
            df['num_reviews'] = None
        
        # Process each supplement
        for idx, row in df.iterrows():
            print(f"\nProcessing {row['name']} ({idx + 1}/{len(df)})...")
            print(f"URL: {row['url']}")
            
            # Clean URL and update in DataFrame
            cleaned_url = self.clean_url(row['url'])
            df.at[idx, 'url'] = cleaned_url
            print(f"Cleaned URL: {cleaned_url}")
            
            rating, num_reviews = self.get_ratings_from_review_url(row['url'])
            print(f"Found rating: {rating}, num_reviews: {num_reviews}")
            
            # Update rating and review count in DataFrame
            df.at[idx, 'rating'] = rating
            df.at[idx, 'num_reviews'] = num_reviews
            
            time.sleep(1)  # Be nice to their servers
            
            # Save progress periodically
            if idx % 100 == 0:
                df.to_csv('webmd_supplement_ratings.csv', index=False)
        
        # Final save
        df.to_csv('webmd_supplement_ratings.csv', index=False)
        
        return df

def main():
    scraper = WebMDSupplementRatingsScraper()
    df = scraper.scrape_all_ratings('webmd_supplement_urls.csv')
    
if __name__ == "__main__":
    main()