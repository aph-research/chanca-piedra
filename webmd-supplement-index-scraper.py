import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
import re
from typing import Dict, List, Optional
import string

class WebMDSupplementIndexScraper:
    def __init__(self):
        self.base_url = "https://www.webmd.com/vitamins/alpha"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        
    def get_letter_page_urls(self) -> List[str]:
        """Get list of all alphabetical index page URLs"""
        urls = []
        # Add A-Z pages
        for letter in string.ascii_lowercase:
            urls.append(f"{self.base_url}/{letter}")
        # Add numbers page
        urls.append(f"{self.base_url}/0")
        return urls
        
    def get_supplements_from_page(self, url: str) -> List[Dict[str, str]]:
        """Get all supplement URLs and names from a letter page"""
        try:
            response = requests.get(url, headers=self.headers)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            supplements = []
            # Find all supplement links in the page
            links = soup.find_all('a', href=re.compile(r'/vitamins/ai/ingredientmono-\d+/'))
            
            for link in links:
                supplements.append({
                    'name': link.text.strip(),
                    'url': f"https://www.webmd.com{link['href']}",
                    'letter': url.split('/')[-1]  # Get letter/number from URL
                })
                
            return supplements
            
        except Exception as e:
            print(f"Error processing {url}: {str(e)}")
            return []

    def scrape_all_supplement_urls(self) -> pd.DataFrame:
        """Scrape supplement URLs from all letter pages"""
        all_supplements = []
        letter_urls = self.get_letter_page_urls()
        
        for url in letter_urls:
            print(f"Processing {url}...")
            supplements = self.get_supplements_from_page(url)
            all_supplements.extend(supplements)
            time.sleep(1)  # Be nice to their servers
            
        # Convert to DataFrame and save
        df = pd.DataFrame(all_supplements)
        df.to_csv('webmd_supplement_urls.csv', index=False)
        print(f"\nFound {len(df)} total supplements")
        
        # Print summary by letter
        print("\nSupplements per letter:")
        summary = df.groupby('letter').size()
        print(summary)
        
        return df

def main():
    scraper = WebMDSupplementIndexScraper()
    df = scraper.scrape_all_supplement_urls()
    
if __name__ == "__main__":
    main()