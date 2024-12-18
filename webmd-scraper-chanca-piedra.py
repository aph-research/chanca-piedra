import requests
from bs4 import BeautifulSoup
import json
import csv
from datetime import datetime
import time
import re

class WebMDReviewScraper:
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        }
        self.base_url = "https://reviews.webmd.com/vitamins-supplements/ingredientreview-441-CHANCA-PIEDRA?"
    
    def get_url_for_page(self, page_number):
        """Construct the exact URL for a given page number."""
        return f"{self.base_url}conditionid=&sortval=1&page={page_number}&next_page=true"

    def extract_json_from_html(self, html_content):
        """Extract the JSON data containing reviews from the HTML."""
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            scripts = soup.find_all('script')
            for i, script in enumerate(scripts, 1):
                if not script.string:
                    continue
                
                if '__INITIAL_STATE__' in script.string:
                    script_content = script.string.strip()
                    # If this is the first script with the full state
                    if script_content.startswith('window.__INITIAL_STATE__='):
                        try:
                            # Extract everything after the equals sign up to the last semicolon
                            json_str = script_content.split('=', 1)[1].strip()
                            if json_str.endswith(';'):
                                json_str = json_str[:-1]
                            
                            data = json.loads(json_str)
                            if 'vitamins_data' in data:
                                print("Successfully found and parsed vitamins_data!")
                                return data
                            else:
                                print("JSON parsed but no vitamins_data found")
                        except json.JSONDecodeError as e:
                            print(f"JSON decode error: {str(e)}")
                            print(f"Error occurred near: {json_str[max(0, e.pos-50):min(len(json_str), e.pos+50)]}")
                        except Exception as e:
                            print(f"Other error parsing JSON: {str(e)}")
                        continue
                        
                    # For other scripts, try regex patterns
                    patterns = [
                        r'window\.__INITIAL_STATE__\s*=\s*({[^;]*})',
                        r'__INITIAL_STATE__\s*=\s*({[^;]*})',
                        r'({.*?"vitamins_data".*?})'
                    ]
                    
                    for pattern in patterns:
                        match = re.search(pattern, script_content, re.DOTALL)
                        if match:
                            try:
                                json_str = match.group(1).strip()
                                # Try to clean up the JSON string
                                json_str = json_str.replace('\\n', '\n').replace('\\"', '"')
                                if json_str.endswith(';'):
                                    json_str = json_str[:-1]
                                # Replace any escaped forward slashes
                                json_str = json_str.replace('\u002F', '/')
                                    
                                print(f"Found potential JSON with pattern: {pattern[:30]}...")
                                print(f"First 200 chars of cleaned JSON: {json_str[:200]}")
                                
                                data = json.loads(json_str)
                                if 'vitamins_data' in data:
                                    print("Successfully found and parsed vitamins_data!")
                                    return data
                                else:
                                    print("JSON parsed but no vitamins_data found")
                            except json.JSONDecodeError as e:
                                print(f"JSON decode error: {str(e)}")
                                print(f"Error occurred near: {json_str[max(0, e.pos-50):min(len(json_str), e.pos+50)]}")
                            except Exception as e:
                                print(f"Other error parsing JSON: {str(e)}")
                    
                    print("Could not extract valid JSON from this script")
            
            print("No valid JSON data found in any scripts")
            return None
            
        except Exception as e:
            print(f"Error extracting JSON: {str(e)}")
            return None

    def parse_review(self, review):
        """Parse a single review into a dictionary with the desired fields."""
        date_str = review.get('DatePosted', '')
        try:
            date_obj = datetime.strptime(date_str, '%m/%d/%Y %I:%M:%S %p')
            formatted_date = date_obj.strftime('%Y-%m-%d')
        except:
            formatted_date = date_str

        return {
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

    def get_page(self, page_number):
        """Get a single page of reviews."""
        url = self.get_url_for_page(page_number)
        print(f"Fetching URL: {url}")
        
        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            
            # Extract JSON data
            json_data = self.extract_json_from_html(response.text)
            if not json_data:
                return []
                
            # Navigate to reviews in the JSON structure
            vitamins_data = json_data.get('vitamins_data', {})
            review_container = vitamins_data.get('vitamin_review_nimvs', [{}])[0]
            reviews = review_container.get('review_nimvs', [])
            
            print(f"Found {len(reviews)} reviews on page {page_number}")
            return reviews
            
        except Exception as e:
            print(f"Error getting page {page_number}: {str(e)}")
            return []

    def scrape_reviews(self, num_pages=6):
        """Scrape reviews from all pages."""
        all_reviews = []
        
        for page in range(1, num_pages + 1):
            print(f"\nProcessing page {page}...")
            reviews = self.get_page(page)
            
            for review in reviews:
                parsed_review = self.parse_review(review)
                all_reviews.append(parsed_review)
                
            time.sleep(1)  # Be nice to their servers
            
        return all_reviews

def save_to_csv(reviews, filename='chanca_piedra_reviews.csv'):
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
    scraper = WebMDReviewScraper()
    reviews = scraper.scrape_reviews()
    save_to_csv(reviews)

if __name__ == "__main__":
    main()