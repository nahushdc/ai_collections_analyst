from typing import Optional

import pandas as pd

from backend.config import settings


_cached_df: Optional[pd.DataFrame] = None


def load_and_process_data(file_path: str) -> pd.DataFrame:
    if file_path.endswith('.csv'):
        df = pd.read_csv(file_path, encoding='latin-1', low_memory=False)
    else:
        df = pd.read_excel(file_path)

    for col in df.columns:
        if df[col].dtype == 'object':
            df[col] = df[col].astype(str).str.replace('\n', ' ', regex=False)
            df[col] = df[col].str.replace('\r', ' ', regex=False)
            df[col] = df[col].replace('nan', pd.NA)

    date_columns = [col for col in df.columns if 'date' in col.lower()]
    for col in date_columns:
        df[col] = pd.to_datetime(df[col], errors='coerce')

    if 'Resolution amount' in df.columns:
        df['Collected Amount'] = df['Resolution amount'].fillna(0)
    elif 'Collected Amount' not in df.columns:
        df['Collected Amount'] = 0

    if 'Principal Balance Amount' in df.columns:
        df['POS'] = df['Principal Balance Amount'].fillna(0)
    elif 'Allocation amount' in df.columns:
        df['POS'] = df['Allocation amount'].fillna(0)
    elif 'POS' not in df.columns or df['POS'].isna().all():
        df['POS'] = df.get('Amount Pending', 0)

    call_columns = [
        'Call Sent count', 'Call Delivered count',
        'Calls Attempted Yesterday', 'Calls Delivered Yesterday',
    ]
    for col in call_columns:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

    df['Conversion Rate'] = df.apply(
        lambda row: (row['Collected Amount'] / row['POS'] * 100)
        if pd.notna(row['POS']) and row['POS'] != 0
        else 0,
        axis=1,
    )

    def get_pos_band(pos):
        if pd.isna(pos):
            return 'Unknown'
        elif pos < 10000:
            return '<10K'
        elif pos < 20000:
            return '10K+'
        elif pos < 30000:
            return '20K+'
        elif pos < 40000:
            return '30K+'
        else:
            return '40K+'

    df['POS Band'] = df['POS'].apply(get_pos_band)

    return df


def get_dataframe() -> pd.DataFrame:
    global _cached_df
    if _cached_df is None:
        _cached_df = load_and_process_data(settings.data_file_path)
    return _cached_df
