from typing import Optional

import pandas as pd

from backend.config import settings


_cached_df: Optional[pd.DataFrame] = None  # reload v8


def load_and_process_data(file_path: str) -> pd.DataFrame:
    """
    Load data from CSV/Excel file and calculate derived columns.
    Ported from AI-data's full load_and_process_data() with all column mappings,
    derived columns, PTP flags, etc.
    """
    # Load data - detect format from extension
    if file_path.endswith('.csv'):
        df = pd.read_csv(file_path, encoding='latin-1', low_memory=False)
    else:
        df = pd.read_excel(file_path)

    # Clean embedded newlines from string columns (especially remarks fields)
    for col in df.columns:
        if df[col].dtype == 'object':
            df[col] = df[col].astype(str).str.replace('\n', ' ', regex=False)
            df[col] = df[col].str.replace('\r', ' ', regex=False)
            df[col] = df[col].replace('nan', pd.NA)

    # Parse date columns - identify columns with 'date' in name (case-insensitive)
    date_columns = [col for col in df.columns if 'date' in col.lower()]
    for col in date_columns:
        df[col] = pd.to_datetime(df[col], errors='coerce')

    # ==========================================================================
    # Column Mappings - normalize different file formats to standard names
    # ==========================================================================

    # Map to "Collected Amount" (collections/payments)
    if 'Resolution amount' in df.columns:
        df['Collected Amount'] = pd.to_numeric(df['Resolution amount'], errors='coerce').fillna(0)
    elif 'paid_amount' in df.columns:
        df['Collected Amount'] = pd.to_numeric(df['paid_amount'], errors='coerce').fillna(0)
    elif 'transaction_amount_paid' in df.columns:
        df['Collected Amount'] = pd.to_numeric(df['transaction_amount_paid'], errors='coerce').fillna(0)
    elif 'Collected Amount' not in df.columns:
        df['Collected Amount'] = 0

    # Map to "POS" (Principal Outstanding / AUM)
    if 'Principal Balance Amount' in df.columns:
        df['POS'] = pd.to_numeric(df['Principal Balance Amount'], errors='coerce').fillna(0)
    elif 'allocation_amount' in df.columns:
        df['POS'] = pd.to_numeric(df['allocation_amount'], errors='coerce').fillna(0)
    elif 'amount_pending' in df.columns:
        df['POS'] = pd.to_numeric(df['amount_pending'], errors='coerce').fillna(0)
    elif 'Allocation amount' in df.columns:
        df['POS'] = pd.to_numeric(df['Allocation amount'], errors='coerce').fillna(0)
    elif 'POS' not in df.columns or df['POS'].isna().all():
        df['POS'] = df.get('Amount Pending', 0)

    # Map to "Region"
    if 'region' in df.columns and 'Region' not in df.columns:
        df['Region'] = df['region']

    # Map to "State"
    if 'customer_state' in df.columns and 'State' not in df.columns:
        df['State'] = df['customer_state']

    # Map to "DPD Bucket"
    if 'dpd_bucket' in df.columns and 'DPD Bucket' not in df.columns:
        df['DPD Bucket'] = df['dpd_bucket']

    # Map to "Agent Name"
    if 'agent_name' in df.columns and 'Agent Name' not in df.columns:
        df['Agent Name'] = df['agent_name']
    elif 'allocated_to_agent_name' in df.columns and 'Agent Name' not in df.columns:
        df['Agent Name'] = df['allocated_to_agent_name']

    # Map to "Loan Number"
    if 'loan_number' in df.columns and 'Loan Number' not in df.columns:
        df['Loan Number'] = df['loan_number']

    # Map cost columns
    if 'ivr_cost' in df.columns and 'IVR Cost' not in df.columns:
        df['IVR Cost'] = pd.to_numeric(df['ivr_cost'], errors='coerce').fillna(0)
    if 'wa_cost' in df.columns and 'WhatsApp Cost' not in df.columns:
        df['WhatsApp Cost'] = pd.to_numeric(df['wa_cost'], errors='coerce').fillna(0)
    if 'sms_cost' in df.columns and 'SMS Cost' not in df.columns:
        df['SMS Cost'] = pd.to_numeric(df['sms_cost'], errors='coerce').fillna(0)
    if 'call_cost' in df.columns and 'Call Cost' not in df.columns:
        df['Call Cost'] = pd.to_numeric(df['call_cost'], errors='coerce').fillna(0)

    # Map contact/call columns
    if 'contact_call_sent' in df.columns and 'Call Sent count' not in df.columns:
        df['Call Sent count'] = pd.to_numeric(df['contact_call_sent'], errors='coerce').fillna(0)
    if 'contact_call_delivered' in df.columns and 'Call Delivered count' not in df.columns:
        df['Call Delivered count'] = pd.to_numeric(df['contact_call_delivered'], errors='coerce').fillna(0)
    if 'contact_ivr_sent' in df.columns and 'IVR Sent count' not in df.columns:
        df['IVR Sent count'] = pd.to_numeric(df['contact_ivr_sent'], errors='coerce').fillna(0)
    if 'contact_wa_sent' in df.columns and 'WhatsApp Sent count' not in df.columns:
        df['WhatsApp Sent count'] = pd.to_numeric(df['contact_wa_sent'], errors='coerce').fillna(0)

    # Convert call-related columns to numeric (for old format)
    call_columns = ['Call Sent count', 'Call Delivered count', 'Calls Attempted Yesterday', 'Calls Delivered Yesterday']
    for col in call_columns:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

    # Derive Call Delivered count from Call Sent count * Call Delivery Percentage
    # (Jan-2026 CSV removed Call Delivered count column)
    if 'Call Delivered count' not in df.columns:
        if 'Call Sent count' in df.columns and 'Call Delivery Percentage' in df.columns:
            sent = pd.to_numeric(df['Call Sent count'], errors='coerce').fillna(0)
            pct = pd.to_numeric(df['Call Delivery Percentage'], errors='coerce').fillna(0)
            df['Call Delivered count'] = (sent * pct / 100).round(0).astype(int)
        else:
            df['Call Delivered count'] = 0

    # Calculate Conversion Rate = (Collected Amount / POS) * 100
    df['Conversion Rate'] = df.apply(
        lambda row: (row['Collected Amount'] / row['POS'] * 100)
        if pd.notna(row['POS']) and row['POS'] != 0
        else 0,
        axis=1,
    )

    # Calculate POS Band
    def get_pos_band(pos):
        if pd.isna(pos):
            return 'Unknown'
        elif pos < 5000:
            return '<5K'
        elif pos < 10000:
            return '5K-10K'
        elif pos < 20000:
            return '10K-20K'
        else:
            return '>20K'

    df['POS Band'] = df['POS'].apply(get_pos_band)

    # Calculate DPD Bucket (granular ranges)
    if 'DPD' in df.columns:
        def get_dpd_bucket(dpd):
            if pd.isna(dpd):
                return 'Unknown'
            elif dpd < 0:
                return 'Pre-due'
            elif dpd < 30:
                return '0-30'
            elif dpd < 60:
                return '30-60'
            elif dpd < 90:
                return '60-90'
            else:
                return '90+'
        df['DPD Bucket'] = df['DPD'].apply(get_dpd_bucket)

    # Calculate MOB Bucket (Month on Book)
    if 'Month on Book' in df.columns:
        def get_mob_bucket(mob):
            if pd.isna(mob):
                return 'Unknown'
            elif mob < 18:
                return '<1.5Years'
            elif mob < 24:
                return '1.5-2Years'
            elif mob < 60:
                return '2-5Years'
            else:
                return '>5Years'
        df['MOB Bucket'] = df['Month on Book'].apply(get_mob_bucket)

    # Map State to Region (India)
    state_region_map = {
        'Delhi': 'North', 'Punjab': 'North', 'Haryana': 'North', 'Himachal Pradesh': 'North',
        'Jammu and Kashmir': 'North', 'Uttarakhand': 'North', 'Uttar Pradesh': 'North',
        'Rajasthan': 'North', 'Chandigarh': 'North',
        'Gujarat': 'West', 'Maharashtra': 'West', 'Goa': 'West', 'Daman and Diu': 'West',
        'Madhya Pradesh': 'West', 'Dadra and Nagar Haveli': 'West',
        'Kerala': 'South', 'Tamil Nadu': 'South', 'Karnataka': 'South', 'Andhra Pradesh': 'South',
        'Telangana': 'South', 'Puducherry': 'South', 'Lakshadweep': 'South',
        'West Bengal': 'East', 'Odisha': 'East', 'Bihar': 'East', 'Jharkhand': 'East',
        'Assam': 'East', 'Arunachal Pradesh': 'East', 'Chhattisgarh': 'East',
        'Meghalaya': 'East', 'Tripura': 'East', 'Nagaland': 'East', 'Manipur': 'East',
        'Sikkim': 'East', 'Andaman and Nicobar Islands': 'East', 'Mizoram': 'East',
    }
    if 'State' in df.columns and 'Region' not in df.columns:
        df['Region'] = df['State'].map(state_region_map)

    # Calculate Resolved flag
    if 'Status' in df.columns:
        df['Resolved'] = (df['Status'] == 'COLLECTED').astype(int)

    # Calculate PTP flags based on dispositions
    if 'IVR Interactive Response' in df.columns:
        df['IVR PTP'] = df['IVR Interactive Response'].isin(['Promise to pay']).astype(int)
    if 'WhatsApp Interactive Response' in df.columns:
        df['WhatsApp PTP'] = df['WhatsApp Interactive Response'].isin(['Promise to pay']).astype(int)
    if 'Best Disposition' in df.columns:
        ptp_dispositions = ['Maintain Balance', 'Promised to Pay', 'Already Paid', 'Paid on Call', 'Claims Paid', 'Partially Paid']
        df['Call PTP'] = df['Best Disposition'].isin(ptp_dispositions).astype(int)
    if 'Voice Bot Best Disposition' in df.columns:
        tara_ptp_dispositions = ['Promised to Pay', 'Claims Paid', 'Already Paid', 'Paid on Call', 'Maintain Balance', 'PART PAID']
        df['Tara Call PTP'] = df['Voice Bot Best Disposition'].isin(tara_ptp_dispositions).astype(int)

    # Calculate Attempt and Contact flags
    for channel in ['IVR', 'WhatsApp', 'SMS', 'Call']:
        sent_col = f'{channel} Sent count'
        delivered_col = f'{channel} Delivered count'
        if sent_col in df.columns:
            df[f'{channel} Attempt'] = (df[sent_col] > 0).astype(int)
        if delivered_col in df.columns:
            df[f'{channel} Contact'] = (df[delivered_col] > 0).astype(int)

    # Tara Call (Voice Bot) specific
    if 'Tara Call Sent Count' in df.columns:
        df['Tara Call Attempt'] = (df['Tara Call Sent Count'] > 0).astype(int)
    if 'Tara Call Delivered Count' in df.columns:
        df['Tara Call Contact'] = (df['Tara Call Delivered Count'] > 0).astype(int)

    # Calculate PTP Conversions (PTP that resulted in collection)
    if 'Call PTP' in df.columns:
        df['Call PTP Conversion'] = ((df.get('Call PTP', 0) == 1) & (df['Status'] == 'COLLECTED')).astype(int)
    if 'IVR PTP' in df.columns:
        df['IVR PTP Conversion'] = ((df.get('IVR PTP', 0) == 1) & (df['Status'] == 'COLLECTED')).astype(int)
    if 'WhatsApp PTP' in df.columns:
        df['WhatsApp PTP Conversion'] = ((df.get('WhatsApp PTP', 0) == 1) & (df['Status'] == 'COLLECTED')).astype(int)
    if 'Tara Call PTP' in df.columns:
        df['Tara Call PTP Conversion'] = ((df.get('Tara Call PTP', 0) == 1) & (df['Status'] == 'COLLECTED')).astype(int)

    # Overall PTP (any channel)
    ptp_cols = ['IVR PTP', 'WhatsApp PTP', 'Call PTP', 'Tara Call PTP']
    existing_ptp_cols = [col for col in ptp_cols if col in df.columns]
    if existing_ptp_cols:
        df['Overall PTP'] = (df[existing_ptp_cols].sum(axis=1) > 0).astype(int)
        df['Overall PTP Conversion'] = ((df['Overall PTP'] == 1) & (df['Status'] == 'COLLECTED')).astype(int)

    # Overall Attempted and Contactable
    attempt_cols = ['IVR Attempt', 'WhatsApp Attempt', 'SMS Attempt', 'Call Attempt', 'Tara Call Attempt']
    existing_attempt_cols = [col for col in attempt_cols if col in df.columns]
    if existing_attempt_cols:
        df['Overall Attempted'] = (df[existing_attempt_cols].sum(axis=1) > 0).astype(int)

    contact_cols = ['IVR Contact', 'WhatsApp Contact', 'SMS Contact', 'Call Contact', 'Tara Call Contact']
    existing_contact_cols = [col for col in contact_cols if col in df.columns]
    if existing_contact_cols:
        df['Overall Contactable'] = (df[existing_contact_cols].sum(axis=1) > 0).astype(int)

    # Voice specific (IVR + Call + Tara)
    voice_attempt_cols = ['IVR Attempt', 'Call Attempt', 'Tara Call Attempt']
    existing_voice_attempt = [col for col in voice_attempt_cols if col in df.columns]
    if existing_voice_attempt:
        df['Voice Attempted'] = (df[existing_voice_attempt].sum(axis=1) > 0).astype(int)

    voice_contact_cols = ['IVR Contact', 'Call Contact', 'Tara Call Contact']
    existing_voice_contact = [col for col in voice_contact_cols if col in df.columns]
    if existing_voice_contact:
        df['Voice Contactable'] = (df[existing_voice_contact].sum(axis=1) > 0).astype(int)

    return df


def get_dataframe() -> pd.DataFrame:
    global _cached_df
    if _cached_df is None:
        _cached_df = load_and_process_data(settings.data_file_path)
    return _cached_df
