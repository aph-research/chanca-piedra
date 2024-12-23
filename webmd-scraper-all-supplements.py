import requests
from bs4 import BeautifulSoup
import json
import csv
from datetime import datetime
import time
import re
from dataclasses import dataclass
from typing import Optional

@dataclass
class ReviewTarget:
    name: str
    base_url: str
    num_pages: int
    condition_id: str
    is_supplement: bool

class WebMDReviewScraper:
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        }

    def get_url_for_page(self, target: ReviewTarget, page_number: int) -> str:
        """Construct the exact URL for a given page number."""
        return f"{target.base_url}?conditionid={target.condition_id}&sortval=1&page={page_number}&next_page=true"

    def extract_json_from_html(self, html_content: str) -> Optional[dict]:
        """Extract the JSON data containing reviews from the HTML."""
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            scripts = soup.find_all('script')
            
            for script in scripts:
                if not script.string:
                    continue
                
                if '__INITIAL_STATE__' in script.string:
                    if script.string.startswith('window.__INITIAL_STATE__='):
                        try:
                            json_str = script.string.split('=', 1)[1].strip()
                            if json_str.endswith(';'):
                                json_str = json_str[:-1]
                            
                            data = json.loads(json_str)
                            if 'vitamins_data' in data or 'drugs_data' in data:
                                return data
                            
                        except Exception as e:
                            print(f"Error parsing JSON: {str(e)}")
                            continue
            
            return None
            
        except Exception as e:
            print(f"Error extracting JSON: {str(e)}")
            return None

    def parse_review(self, review: dict, source: str) -> dict:
        """Parse a single review into a dictionary with the desired fields."""
        date_str = review.get('DatePosted', '')
        try:
            date_obj = datetime.strptime(date_str, '%m/%d/%Y %I:%M:%S %p')
            formatted_date = date_obj.strftime('%Y-%m-%d')
        except:
            formatted_date = date_str

        return {
            'source': source,
            'author_name': review.get('DisplayName', ''),
            'age_range': review.get('AgeRange', ''),
            'time_on_treatment': review.get('TimeRange', ''),
            'condition': review.get('SecondaryName_s', ''),
            'review_date': formatted_date,
            'overall_rating': review.get('OverAll_UserReviewRating', ''),
            'effectiveness': review.get('RatingCriteria1', ''),
            'ease_of_use': review.get('RatingCriteria2', ''),
            'satisfaction': review.get('RatingCriteria3', ''),
            'review_text': review.get('UserExperience', ''),
            'helpful_votes': review.get('FoundHelpfulCount', 0),
            'total_votes': review.get('TotalVotedCount', 0)
        }

    def get_page(self, target: ReviewTarget, page_number: int) -> list:
        """Get a single page of reviews."""
        url = self.get_url_for_page(target, page_number)
        print(f"Fetching URL: {url}")
        
        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            
            # Extract JSON data
            json_data = self.extract_json_from_html(response.text)
            if not json_data:
                return []
                
            # Navigate to reviews in the JSON structure based on type
            if target.is_supplement:
                data_container = json_data.get('vitamins_data', {})
                reviews = data_container.get('vitamin_review_nimvs', [{}])[0].get('review_nimvs', [])
            else:
                data_container = json_data.get('drugs_data', {})
                reviews = data_container.get('drug_review_nimvs', [{}])[0].get('review_nimvs', [])
            
            print(f"Found {len(reviews)} reviews on page {page_number}")
            return reviews
            
        except Exception as e:
            print(f"Error getting page {page_number}: {str(e)}")
            return []

    def scrape_reviews(self, target: ReviewTarget) -> list:
        """Scrape reviews for a specific target."""
        all_reviews = []
        
        for page in range(1, target.num_pages + 1):
            print(f"\nProcessing {target.name} - page {page}...")
            reviews = self.get_page(target, page)
            
            for review in reviews:
                parsed_review = self.parse_review(review, target.name)
                all_reviews.append(parsed_review)
                
            time.sleep(1)  # Be nice to their servers
            
        return all_reviews

def save_to_csv(reviews: list, filename: str = 'webmd_reviews.csv'):
    """Save the reviews to a CSV file."""
    if not reviews:
        print("No reviews to save")
        return
        
    fieldnames = reviews[0].keys()
    
    with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(reviews)
        
    print(f"Successfully saved {len(reviews)} reviews to {filename}")

def main():
    # Define targets
    targets = [
        # ReviewTarget(
        #     name="Chanca Piedra",
        #     base_url="https://reviews.webmd.com/vitamins-supplements/ingredientreview-441-chanca-piedra",
        #     num_pages=6,
        #     condition_id="",
        #     is_supplement=True
        # ),
        # ReviewTarget(
        #     name="Flomax",
        #     base_url="https://reviews.webmd.com/drugs/drugreview-4154-flomax-oral",
        #     num_pages=2,
        #     condition_id="4139",
        #     is_supplement=False
        # ),
        # ReviewTarget(
        #     name="Hydrochlorothiazide",
        #     base_url="https://reviews.webmd.com/drugs/drugreview-5310-hydrochlorothiazide-oral",
        #     num_pages=2,
        #     condition_id="2281",
        #     is_supplement=False
        # ),
        # ReviewTarget(
        #     name="Ashwagandha",
        #     base_url="https://reviews.webmd.com/vitamins-supplements/ingredientreview-953-ashwagandha",
        #     num_pages=15,
        #     condition_id="",
        #     is_supplement=True
        # ),
        # ReviewTarget(
        #     name="Melatonin",
        #     base_url="https://reviews.webmd.com/vitamins-supplements/ingredientreview-940-melatonin",
        #     num_pages=5,
        #     condition_id="1310",
        #     is_supplement=True
        # ),
        ReviewTarget(
            name="Black Seed",
            base_url="https://reviews.webmd.com/vitamins-supplements/ingredientreview-901-black-seed",
            num_pages=5,
            condition_id="",
            is_supplement=True
        ),
        ReviewTarget(
            name="Garcinia",
            base_url="https://reviews.webmd.com/vitamins-supplements/ingredientreview-818-GARCINIA",
            num_pages=49,
            condition_id="",
            is_supplement=True
        ),
    ]
    
    scraper = WebMDReviewScraper()
    all_reviews = []
    
    for target in targets:
        print(f"\nStarting to scrape {target.name}...")
        reviews = scraper.scrape_reviews(target)
        all_reviews.extend(reviews)
        print(f"Completed {target.name} - found {len(reviews)} reviews")
        time.sleep(2)  # Extra pause between different supplements
    
    save_to_csv(all_reviews, 'webmd_all_reviews_black_seed_garcinia.csv')

if __name__ == "__main__":
    main()