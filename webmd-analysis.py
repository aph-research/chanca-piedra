import pandas as pd
import numpy as np

def analyze_supplement_ratings(csv_file: str, target_supplement: str = 'chanca piedra'):
    # Read the CSV file
    df = pd.read_csv(csv_file)
    
    # Convert rating and num_reviews to numeric, replacing empty values with NaN
    df['rating'] = pd.to_numeric(df['rating'], errors='coerce')
    df['num_reviews'] = pd.to_numeric(df['num_reviews'], errors='coerce')
    
    # Function to calculate percentile for a given minimum number of reviews
    def get_percentile(min_reviews: int) -> float:
        # Filter supplements with minimum number of reviews
        filtered_df = df[df['num_reviews'] >= min_reviews]
        
        # Find target supplement's rating
        target_rating = filtered_df[filtered_df['name'].str.lower() == target_supplement.lower()]['rating'].iloc[0]
        
        # Calculate percentile and rank
        total_count = len(filtered_df)
        rank = (filtered_df['rating'] > target_rating).sum() + 1
        percentile = ((total_count - rank + 1) / total_count) * 100
        
        # Calculate statistics
        mean_rating = filtered_df['rating'].mean()
        median_rating = filtered_df['rating'].median()
        std_rating = filtered_df['rating'].std()
        z_score = (target_rating - mean_rating) / std_rating
        
        return {
            'total_supplements': total_count,
            'target_rating': target_rating,
            'percentile': percentile,
            'rank': rank,
            'mean_rating': mean_rating,
            'median_rating': median_rating,
            'std_rating': std_rating,
            'z_score': z_score
        }
    
    # Analyze for different minimum review thresholds
    thresholds = [10, 50, 100]
    results = {}
    
    for threshold in thresholds:
        try:
            results[threshold] = get_percentile(threshold)
        except Exception as e:
            print(f"Could not calculate percentile for {threshold} minimum reviews: {str(e)}")
    
    # Print overall statistics
    print("\nOverall Statistics:")
    print(f"Total supplements in database: {len(df)}")
    print(f"Supplements with at least one review: {len(df[df['num_reviews'].notna()])}")
    
    # Print percentile results
    print("\nChanca Piedra Percentile Analysis:")
    for threshold, result in results.items():
        print(f"\nFor supplements with {threshold}+ reviews:")
        print(f"Number of qualifying supplements: {result['total_supplements']}")
        print(f"Chanca Piedra rating: {result['target_rating']:.1f}")
        print(f"Average rating: {result['mean_rating']:.2f}")
        print(f"Median rating: {result['median_rating']:.2f}")
        print(f"Standard deviation: {result['std_rating']:.2f}")
        print(f"Z-score: {result['z_score']:.2f} standard deviations above mean")
        print(f"Rank: #{result['rank']} out of {result['total_supplements']} ({result['percentile']:.1f}th percentile)")
    
    # Print top supplements for each threshold
    for threshold in thresholds:
        filtered_df = df[df['num_reviews'] >= threshold].copy()
        # Convert num_reviews to integer type for display
        filtered_df['num_reviews'] = filtered_df['num_reviews'].astype(int)
        top_supplements = filtered_df.nlargest(10, 'rating')
        print(f"\nTop 10 highest rated supplements (min {threshold} reviews):")
        if len(top_supplements) > 0:
            # Reset index and drop it to remove the numerical IDs
            print(top_supplements[['name', 'rating', 'num_reviews']].reset_index(drop=True).to_string(index=False))
        else:
            print("No supplements found with this many reviews.")

if __name__ == "__main__":
    analyze_supplement_ratings('webmd_supplement_ratings.csv')