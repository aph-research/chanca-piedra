import pandas as pd
from difflib import SequenceMatcher

def normalize_text(text):
    if pd.isna(text):
        return ''
    return str(text).lower().replace('\n', ' ').strip()

def similarity_ratio(a, b):
    return SequenceMatcher(None, normalize_text(a), normalize_text(b)).ratio()

# Read both CSVs
original_df = pd.read_csv('Amazon original.csv')
scraped_df = pd.read_csv('Amazon scraped.csv')

duplicates = []
for _, orig_row in original_df.iterrows():
    for _, scrap_row in scraped_df.iterrows():
        similarity = similarity_ratio(orig_row['Review'], scrap_row['text'])
        if similarity > 0.8:  # Threshold can be adjusted
            duplicates.append({
                'original_id': orig_row['ID'],
                'scraped_id': scrap_row['ID'],
                'similarity': similarity
            })

# Output results
pd.DataFrame(duplicates).to_csv('duplicate_pairs.csv', index=False)