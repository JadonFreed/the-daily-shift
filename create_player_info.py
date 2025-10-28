import pandas as pd
import json

def create_final_player_json():
    """
    Combines player ratings data with lookup data (jersey number, age, height)
    and saves the result to 'nhl_players.json'.
    """

    # --- Part 1: Load Base Ratings and Create Traits ---

    try:
        df_ratings = pd.read_csv('all_skaters_ratings_final.csv')
    except FileNotFoundError:
        print("Error: 'all_skaters_ratings_final.csv' not found.")
        print("Please ensure this file is in the same directory.")
        return

    # Keep necessary columns, including the one for trait logic
    # Make sure 'I_F_takeaways_per60' exists in your ratings CSV for the trait logic
    # If it's missing, the trait logic will default to the simpler version.
    columns_to_keep = ['playerId', 'name', 'team', 'position', 'Overall_Talent_Rating']
    if 'I_F_takeaways_per60' in df_ratings.columns:
        columns_to_keep.append('I_F_takeaways_per60')

    df_base = df_ratings[columns_to_keep].copy() # Use .copy() to avoid SettingWithCopyWarning

    df_base = df_base.rename(columns={
        'playerId': 'id',
        'name': 'player_name',
        'team': 'team_abbr',
        'position': 'position',
        'Overall_Talent_Rating': 'rating'
    })

    # Cast types
    df_base['id'] = df_base['id'].astype(str)
    df_base['rating'] = df_base['rating'].round().astype(int)

    # Create new fields
    df_base['team_name'] = df_base['team_abbr']
    df_base['is_unique_fact'] = True
    df_base['rating_rank'] = df_base['rating'].rank(method='min', ascending=False)

    # Define the trait creation function
    def create_unique_trait(row):
        rank = row['rating_rank']
        pos = row['position']
        rating = row['rating']
        if rank == 1:
            return "League's highest-rated player. An elite playmaker."
        elif rank <= 10:
            return f"Top 10 rated player, elite {pos} talent."
        elif rank <= 50:
            return f"Top 50 rated player. A standout {pos} in the league."
        elif rating >= 80:
            return f"An excellent top-tier {pos}, known for high offensive contributions."
        else:
            # Use .get for safety in case the column is missing
            takeaways = row.get('I_F_takeaways_per60', 0)
            if takeaways > 1.0:
                return "Exceptional on the forecheck, known for high takeaway rate."
            else:
                return "Solid rotational player with consistent play."

    df_base['unique_trait'] = df_base.apply(create_unique_trait, axis=1)

    # Select only the columns needed for the intermediate profile
    base_cols = [
        'id', 'team_name', 'team_abbr', 'player_name',
        'position', 'rating', 'unique_trait', 'is_unique_fact'
    ]
    df_base_final = df_base[base_cols].copy() # Use .copy()

    # --- Part 2: Load Lookup Data and Enrich Profiles ---

    try:
        df_lookup = pd.read_csv('allPlayersLookup.csv')
    except FileNotFoundError:
        print("Error: 'allPlayersLookup.csv' not found.")
        print("Please ensure this file is in the same directory.")
        return

    # Calculate Age
    df_lookup['birthDate'] = pd.to_datetime(df_lookup['birthDate'], errors='coerce')
    # Use current date for age calculation
    current_date = pd.Timestamp('now')
    df_lookup['age'] = ((current_date - df_lookup['birthDate']).dt.days / 365.25).round(0).astype('Int64')

    # Select and rename columns to merge
    cols_to_merge = ['playerId', 'primaryNumber', 'height', 'age']
    df_lookup_subset = df_lookup[cols_to_merge].copy() # Use .copy()
    df_lookup_subset = df_lookup_subset.rename(columns={'primaryNumber': 'jersey_number'})

    # Set merge key type to string to match df_base_final['id']
    df_lookup_subset['playerId'] = df_lookup_subset['playerId'].astype(str)

    # --- Part 3: Merge, Clean, and Save ---

    # Merge the base profiles with the new lookup data
    df_merged = pd.merge(
        df_base_final,
        df_lookup_subset,
        left_on='id',
        right_on='playerId',
        how='left'
    )

    # Clean up: Drop the redundant 'playerId' column
    df_merged = df_merged.drop(columns=['playerId'])

    # Fill NaNs with placeholders for the UI
    df_merged['jersey_number'] = df_merged['jersey_number'].fillna('XX')
    # Convert jersey number to integer where possible, keep as string otherwise
    df_merged['jersey_number'] = df_merged['jersey_number'].apply(lambda x: int(x) if isinstance(x, (int, float)) and x == x and x != 'XX' else str(x).replace('.0',''))

    df_merged['height'] = df_merged['height'].fillna('?')
    # Convert age to string and replace <NA> or NaN with '?'
    df_merged['age'] = df_merged['age'].astype(str).fillna('?').replace('<NA>', '?').replace('nan', '?')


    # Ensure final column order
    final_columns = [
        'id', 'team_name', 'team_abbr', 'player_name',
        'position', 'rating', 'unique_trait', 'is_unique_fact',
        'jersey_number', 'age', 'height'
    ]
    # Select the final columns to ensure order and no extras
    df_final = df_merged[final_columns]

    # Save the final file
    df_final.to_json('nhl_players.json', orient='records', indent=2)

    print("Successfully created 'nhl_players.json'.")
    print("--- Sample of final data ---")
    print(df_final.head().to_markdown(index=False, numalign="left", stralign="left"))

# Run the function
if __name__ == "__main__":
    create_final_player_json()