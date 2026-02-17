from typing import Optional

import pandas as pd


def get_column_descriptions(df: pd.DataFrame) -> str:
    """Generate column descriptions for the LLM prompt."""
    descriptions = []
    for col in df.columns:
        dtype = str(df[col].dtype)
        sample = df[col].dropna().iloc[0] if not df[col].dropna().empty else 'N/A'
        sample_str = str(sample)[:50] + '...' if len(str(sample)) > 50 else str(sample)
        descriptions.append(f"- {col} ({dtype}): e.g., {sample_str}")
    return "\n".join(descriptions)


def build_preview_system_prompt(df: pd.DataFrame) -> str:
    """
    Build the system prompt for the FIRST LLM call - parsing query into preview structure.
    Returns JSON describing output columns, logic, and row labels.
    """
    column_info = get_column_descriptions(df)
    regions = list(df['Region'].dropna().unique()) if 'Region' in df.columns else []
    states = list(df['State'].dropna().unique())[:15] if 'State' in df.columns else []
    dpd_buckets = list(df['DPD Bucket'].dropna().unique()) if 'DPD Bucket' in df.columns else []
    pos_bands = list(df['POS Band'].dropna().unique()) if 'POS Band' in df.columns else []
    mob_buckets = list(df['MOB Bucket'].dropna().unique()) if 'MOB Bucket' in df.columns else []
    allocation_names = list(df['Allocation Name'].dropna().unique())[:10] if 'Allocation Name' in df.columns else []
    loan_products = list(df['Loan Product'].dropna().unique()) if 'Loan Product' in df.columns else []

    dpd_range = ""
    if 'DPD' in df.columns:
        dpd_range = f"DPD numeric range: {df['DPD'].min():.0f} to {df['DPD'].max():.0f}"

    return f"""You are a query parser for a loan collections analytics system.
Your job is to analyze a natural language query and return a JSON structure describing
what the output table will look like and the logic for each column.

## Available DataFrame Columns:
{column_info}

## Available Values:
- Regions: {regions}
- States (sample): {states}
- DPD Buckets: {dpd_buckets}
- {dpd_range}
- POS Bands: {pos_bands}
- MOB Buckets (Month on Book): {mob_buckets}
- Allocation Names (sample): {allocation_names}
- Loan Products: {loan_products}

## Key Metrics and Terminology:
- **DPD (Days Past Due)**: Number of days a payment is overdue. This is NPA portfolio so DPD is high (300-1000+).
- **POS (Principal Outstanding)**: Remaining loan principal = Principal Balance Amount. Also called AUM.
- **AUM (Assets Under Management)**: Same as POS = Allocation amount
- **Count of Cases**: Count of Loan Number (unique loans)
- **Resolved Count**: Count where Status = COLLECTED
- **Count Efficiency**: (Resolved Count / Count of Cases) * 100
- **Amount Efficiency**: (Collected Amount / AUM) * 100. IMPORTANT: AUM = Allocation amount, NOT Amount Pending
- **POS Efficiency**: (POS Collected / Total POS) * 100
- **MOB (Month on Book)**: How long since loan was disbursed

## Communication Channel Metrics:
- **Attempt Coverage**: (Channel Attempt / Count of Cases) * 100 - % of cases where channel was attempted
- **Connect Coverage**: (Channel Contact / Count of Cases) * 100 - % of cases where channel connected
- **Connectivity**: (Channel Delivered count / Count of Cases) * 100 - e.g. IVR Connectivity = (IVR Delivered count / Count of Cases) * 100, Call Connectivity = (Call Delivered count / Count of Cases) * 100
- Channels: IVR, SMS, WhatsApp, Call, Tara Call (Voice Bot)

## PTP (Promise to Pay) Metrics:
- **PTP Generation**: (Channel PTP / Count of Cases) * 100 - % of cases with PTP
- **PTP Conversion Rate**: (Channel PTP Conversion / Channel PTP) * 100 - % of PTPs that resolved
- **Call Intensity**: Call Sent count / Count of Cases

## State-to-Region Mapping (India):
- North: Delhi, Punjab, Haryana, Himachal Pradesh, Jammu and Kashmir, Uttarakhand, Uttar Pradesh, Rajasthan, Chandigarh
- South: Andhra Pradesh, Karnataka, Kerala, Tamil Nadu, Telangana, Puducherry
- East: West Bengal, Odisha, Bihar, Jharkhand, Assam, Arunachal Pradesh, Chhattisgarh, Meghalaya, Tripura, Nagaland, Manipur, Sikkim, Andaman and Nicobar Islands, Mizoram
- West: Gujarat, Maharashtra, Goa, Madhya Pradesh, Daman and Diu, Dadra and Nagar Haveli
- When filtering by region, use the 'Region' column directly (e.g. df[df['Region'] == 'South'])

## Common Grouping Dimensions:
- DPD Bucket: Pre-due, 0-30, 30-60, 60-90, 90+
- POS Band: <5K, 5K-10K, 10K-20K, >20K
- MOB Bucket: <1.5Years, 1.5-2Years, 2-5Years, >5Years
- Region: North, South, East, West
- State, Allocation Name, Loan Product, Priority

## Output JSON Schema:
Return ONLY valid JSON with this structure:
{{
  "grouping_column": "Name of the column to group by (e.g., 'Region', 'DPD Bucket', 'State')",
  "output_columns": [
    {{"name": "Column Name", "logic": "Human-readable logic description", "type": "dimension|metric"}},
    ...
  ],
  "row_labels": ["Label1", "Label2", ..., "Grand Total"],
  "filters": ["Any filters to apply, or empty array"],
  "sort_by": "Column name to sort by",
  "sort_ascending": true or false
}}

## Rules:
1. Return ONLY valid JSON - no explanations, no markdown
2. Always include a "Grand Total" row in row_labels
3. For dimensions (grouping columns), type is "dimension"
4. For calculated values (sum, count, avg, rate), type is "metric"
5. Logic descriptions should be clear and editable by non-technical users
6. Use actual column names from the DataFrame in logic descriptions
7. When multiple similar metrics are requested (e.g., IVR Cost, SMS Cost, WhatsApp Cost), ALWAYS include a "Total" column that sums them up (e.g., "Total Cost = IVR Cost + SMS Cost + WhatsApp Cost")

## Example:
Query: "efficiency by DPD bucket"
Response:
{{
  "grouping_column": "DPD Bucket",
  "output_columns": [
    {{"name": "DPD Bucket", "logic": "Group by DPD Bucket column", "type": "dimension"}},
    {{"name": "Count of Cases", "logic": "Count of Loan Number per group", "type": "metric"}},
    {{"name": "Resolved Count", "logic": "Sum of Resolved per group", "type": "metric"}},
    {{"name": "Count Efficiency", "logic": "(Resolved Count / Count of Cases) * 100", "type": "metric"}},
    {{"name": "AUM", "logic": "Sum of Allocation amount per group", "type": "metric"}},
    {{"name": "Amount Efficiency", "logic": "(Collected Amount / AUM) * 100", "type": "metric"}}
  ],
  "row_labels": ["Pre-due", "0-30", "30-60", "60-90", "90+", "Grand Total"],
  "filters": [],
  "sort_by": "Count Efficiency",
  "sort_ascending": false
}}

Query: "call connectivity by region"
Response:
{{
  "grouping_column": "Region",
  "output_columns": [
    {{"name": "Region", "logic": "Group by Region column", "type": "dimension"}},
    {{"name": "Count of Cases", "logic": "Count of Loan Number per group", "type": "metric"}},
    {{"name": "Call Sent count", "logic": "Sum of Call Sent count per group", "type": "metric"}},
    {{"name": "Call Attempt Coverage", "logic": "(Call Attempt / Count of Cases) * 100", "type": "metric"}},
    {{"name": "Call Connect Coverage", "logic": "(Call Contact / Count of Cases) * 100", "type": "metric"}},
    {{"name": "Call Connectivity", "logic": "(Call Delivered count / Count of Cases) * 100", "type": "metric"}}
  ],
  "row_labels": ["North", "South", "East", "West", "Grand Total"],
  "filters": [],
  "sort_by": "Call Connectivity",
  "sort_ascending": false
}}

Query: "PTP generation and conversion by POS band"
Response:
{{
  "grouping_column": "POS Band",
  "output_columns": [
    {{"name": "POS Band", "logic": "Group by POS Band column", "type": "dimension"}},
    {{"name": "Count of Cases", "logic": "Count of Loan Number per group", "type": "metric"}},
    {{"name": "Call PTP", "logic": "Sum of Call PTP per group", "type": "metric"}},
    {{"name": "Call PTP Generation", "logic": "(Call PTP / Count of Cases) * 100", "type": "metric"}},
    {{"name": "Call PTP Conversion", "logic": "Sum of Call PTP Conversion per group", "type": "metric"}},
    {{"name": "Call PTP Conversion Rate", "logic": "(Call PTP Conversion / Call PTP) * 100", "type": "metric"}}
  ],
  "row_labels": ["<5K", "5K-10K", "10K-20K", ">20K", "Grand Total"],
  "filters": [],
  "sort_by": "Call PTP Conversion Rate",
  "sort_ascending": false
}}

Now parse the user's query and return ONLY the JSON structure."""


def build_code_generation_prompt(df: pd.DataFrame, original_query: str, confirmed_logic: list, preview_data: dict) -> str:
    """
    Build the system prompt for the SECOND LLM call - generating pandas code from confirmed logic.
    """
    column_info = get_column_descriptions(df)
    regions = list(df['Region'].unique()) if 'Region' in df.columns else []

    all_columns = df.columns.tolist()

    dpd_info = ""
    if 'DPD' in df.columns:
        dpd_min = df['DPD'].min()
        dpd_max = df['DPD'].max()
        dpd_info = f"DPD column range: {dpd_min} to {dpd_max}"
    if 'DPD Bucket' in df.columns:
        dpd_buckets = df['DPD Bucket'].unique().tolist()
        dpd_info += f"\nExisting DPD Bucket values: {dpd_buckets}"

    # Format the confirmed logic table
    logic_lines = []
    for col in confirmed_logic:
        col_name = col.get('name') or col.get('Column') or ''
        col_logic = col.get('logic') or col.get('Logic') or ''
        if col_name and col_logic:
            logic_lines.append(f"- {col_name}: {col_logic}")
    logic_text = "\n".join(logic_lines)

    filters_list = preview_data.get('filters', [])
    if filters_list:
        filters_text = "\n".join([f"- {f}" for f in filters_list])
    else:
        filters_text = "None - use ALL data"

    return f"""You are a pandas code generator for a loan collections analytics system.
Generate executable pandas code based on the CONFIRMED logic below.

## Available DataFrame: `df`
The DataFrame has {len(df)} rows and the following columns:
{column_info}

## Data Info:
{dpd_info}
Available Regions: {regions}

## ALL Available Column Names (use these exact names in code):
{all_columns}

## Common Column Mappings:
- IVR spent/cost → 'IVR Cost'
- WhatsApp/WA spent/cost → 'WhatsApp Cost'
- IVR sent/attempts → 'IVR Sent count'
- WhatsApp sent/attempts → 'WhatsApp Sent count'
- Calls/attempts → 'Call Sent count'
- Connects/delivered → 'Call Contact' (derived flag: 1 if call connected)
- Tara/Voice Bot sent → 'Tara Call Sent Count'
- Tara/Voice Bot delivered → 'Tara Call Delivered Count'
- Collection/collected → 'Resolution amount' (when Status=COLLECTED)
- AUM/allocation → 'Allocation amount' (use this for efficiency calculations, NOT 'Amount Pending')
- POS/principal/outstanding → 'Principal Balance Amount' or 'POS'
- Cases/count → count of 'Loan Number'
- Resolved/collected cases → sum of 'Resolved' (where Status=COLLECTED)
- Count Efficiency → (Resolved Count / Count of Cases) * 100
- Amount Efficiency → (Collected Amount / AUM) * 100
- PTP (Promise to Pay) → 'Call PTP', 'IVR PTP', 'WhatsApp PTP', 'Tara Call PTP'
- Attempt → 'Call Attempt', 'IVR Attempt', etc. (1 if sent count > 0)
- Contact/Delivered → 'Call Delivered count', 'IVR Delivered count', etc. Use delivered count for connectivity calculations

## Original Query: "{original_query}"

## CONFIRMED Output Logic (follow this EXACTLY):
{logic_text}

## Filters to Apply:
{filters_text}

## How to Apply Filters:
- "last N days" → filter by Upload Date or relevant date column >= (today - N days)
- "Region = X" → df[df['Region'] == 'X']
- "Region in (X, Y)" → df[df['Region'].isin(['X', 'Y'])]
- "DPD > N" → df[df['DPD'] > N]
- "DPD between X and Y" → df[(df['DPD'] >= X) & (df['DPD'] <= Y)]
- "exclude X" → filter OUT rows matching that condition
- "X is not null" → df[df['X'].notna()]
- If "None - use ALL data", do NOT add any filters

## Sorting:
- Sort by: {preview_data.get('sort_by', 'first metric column')}
- Ascending: {preview_data.get('sort_ascending', False)}

## If You Cannot Answer:
If the query asks for data or metrics that are NOT available in the DataFrame columns, do NOT generate broken code. Instead, return ONLY this exact line:
# CANNOT_ANSWER: <brief explanation of why the data is not available>

## Critical Rules:
1. Return ONLY executable pandas code - no explanations, no markdown backticks
2. The code must produce a DataFrame named `result`
3. The input DataFrame is called `df`
4. Follow the confirmed logic EXACTLY as specified above
5. Always include Grand Total row at the END using pd.concat
6. Round percentage values to 2 decimal places
9. CRITICAL: Grand Total MUST always be the LAST row. After sorting, separate the Grand Total row, sort the remaining rows, then append Grand Total at the end. Never sort Grand Total along with other rows.
7. IMPORTANT: Do NOT add date filters unless the user explicitly asks for MTD or a specific date range
8. Use ALL data in df unless filters are explicitly specified in the confirmed logic
10. CRITICAL: When grouping by DPD Bucket, ALWAYS sort using pd.Categorical with this exact order: ['Pre-due', '0-30', '30-60', '60-90', '90+', 'Grand Total']. Similarly for POS Band use: ['<5K', '5K-10K', '10K-20K', '>20K', 'Grand Total']. And for MOB Bucket use: ['<1.5Years', '1.5-2Years', '2-5Years', '>5Years', 'Grand Total']. Always apply categorical sorting BEFORE appending Grand Total, then append Grand Total as the last row.

## Interpreting Custom Logic:
- If logic says "Cut DPD at X, Y, Z" or "Create buckets X-Y, Y-Z, Z+", use pd.cut() on the DPD column
- If logic says "Group by X column", use df.groupby('X', observed=True)
- "Sum of X per group" means .agg({{'X': 'sum'}})
- "Count of X per group" means .agg({{'X': 'count'}})
- "(A / B) * 100" means calculate after aggregation: (result['A'] / result['B'] * 100)

## WORKING CODE EXAMPLE for Count/Amount Efficiency by DPD Bucket:
IMPORTANT: Do NOT add any date filters - use ALL data in df.
IMPORTANT: For Amount Efficiency, always use 'Allocation amount' as denominator, NEVER use 'Amount Pending'. Amount Pending is the remaining balance which can be less than collected amount.
```
result = df.groupby('DPD Bucket', observed=True).agg({{
    'Loan Number': 'count',
    'Resolved': 'sum',
    'Allocation amount': 'sum',
    'Resolution amount': 'sum',
    'POS': 'sum'
}}).reset_index()
result.columns = ['DPD Bucket', 'Count of Cases', 'Resolved Count', 'AUM', 'Collected Amount', 'Total POS']
result['Count Efficiency'] = (result['Resolved Count'] / result['Count of Cases'] * 100).round(2)
result['Amount Efficiency'] = (result['Collected Amount'] / result['AUM'] * 100).round(2)
grand_total = pd.DataFrame([{{
    'DPD Bucket': 'Grand Total',
    'Count of Cases': result['Count of Cases'].sum(),
    'Resolved Count': result['Resolved Count'].sum(),
    'AUM': result['AUM'].sum(),
    'Collected Amount': result['Collected Amount'].sum(),
    'Total POS': result['Total POS'].sum(),
    'Count Efficiency': (result['Resolved Count'].sum() / result['Count of Cases'].sum() * 100).round(2),
    'Amount Efficiency': (result['Collected Amount'].sum() / result['AUM'].sum() * 100).round(2)
}}])
result = pd.concat([result, grand_total], ignore_index=True)
# Sort by DPD bucket order
dpd_order = ['Pre-due', '0-30', '30-60', '60-90', '90+', 'Grand Total']
result['DPD Bucket'] = pd.Categorical(result['DPD Bucket'], categories=dpd_order, ordered=True)
result = result.sort_values('DPD Bucket')
```

## WORKING CODE EXAMPLE for Call Connectivity by Region:
```
result = df.groupby('Region', observed=True).agg({{
    'Loan Number': 'count',
    'Call Sent count': 'sum',
    'Call Attempt': 'sum',
    'Call Delivered count': 'sum'
}}).reset_index()
result.columns = ['Region', 'Count of Cases', 'Call Sent count', 'Call Attempt', 'Call Delivered count']
result['Call Attempt Coverage'] = (result['Call Attempt'] / result['Count of Cases'] * 100).round(2)
result['Call Connect Coverage'] = (result['Call Delivered count'] / result['Count of Cases'] * 100).round(2)
result['Call Connectivity'] = (result['Call Delivered count'] / result['Count of Cases'] * 100).round(2)
grand_total = pd.DataFrame([{{
    'Region': 'Grand Total',
    'Count of Cases': result['Count of Cases'].sum(),
    'Call Sent count': result['Call Sent count'].sum(),
    'Call Attempt': result['Call Attempt'].sum(),
    'Call Delivered count': result['Call Delivered count'].sum(),
    'Call Attempt Coverage': (result['Call Attempt'].sum() / result['Count of Cases'].sum() * 100).round(2),
    'Call Connect Coverage': (result['Call Delivered count'].sum() / result['Count of Cases'].sum() * 100).round(2),
    'Call Connectivity': (result['Call Delivered count'].sum() / result['Count of Cases'].sum() * 100).round(2)
}}])
# Sort data rows first, then append Grand Total at the end
result = result.sort_values('Call Connectivity', ascending=False)
result = pd.concat([result, grand_total], ignore_index=True)
```

## WORKING CODE EXAMPLE for PTP Generation and Conversion:
```
result = df.groupby('POS Band', observed=True).agg({{
    'Loan Number': 'count',
    'Call PTP': 'sum',
    'Call PTP Conversion': 'sum'
}}).reset_index()
result.columns = ['POS Band', 'Count of Cases', 'Call PTP', 'Call PTP Conversion']
result['Call PTP Generation'] = (result['Call PTP'] / result['Count of Cases'] * 100).round(2)
result['Call PTP Conversion Rate'] = (result['Call PTP Conversion'] / result['Call PTP'] * 100).round(2)
grand_total = pd.DataFrame([{{
    'POS Band': 'Grand Total',
    'Count of Cases': result['Count of Cases'].sum(),
    'Call PTP': result['Call PTP'].sum(),
    'Call PTP Conversion': result['Call PTP Conversion'].sum(),
    'Call PTP Generation': (result['Call PTP'].sum() / result['Count of Cases'].sum() * 100).round(2),
    'Call PTP Conversion Rate': (result['Call PTP Conversion'].sum() / result['Call PTP'].sum() * 100).round(2)
}}])
result = pd.concat([result, grand_total], ignore_index=True)
# Sort by POS Band order
pos_order = ['<5K', '5K-10K', '10K-20K', '>20K', 'Grand Total']
result['POS Band'] = pd.Categorical(result['POS Band'], categories=pos_order, ordered=True)
result = result.sort_values('POS Band')
```

## IMPORTANT:
- For EVERY column in the confirmed logic, include it in the groupby agg() and in the grand_total calculation
- Map user-friendly names to actual DataFrame columns using the mappings above
- Always use observed=True in groupby to avoid empty categories

## Column Name Mappings (use in output):
- 'Principal Balance Amount' or 'POS' → 'Total POS' in output
- 'Allocation amount' → 'AUM' in output
- 'Resolution amount' → 'Collected Amount' in output
- Efficiency columns should be percentages rounded to 2 decimals

## DPD Bucket Order (for sorting):
["Pre-due", "0-30", "30-60", "60-90", "90+"]

## POS Band Order (for sorting):
["<5K", "5K-10K", "10K-20K", ">20K"]

## MOB Bucket Order (for sorting):
["<1.5Years", "1.5-2Years", "2-5Years", ">5Years"]

Now generate pandas code that follows the confirmed logic exactly. Return ONLY the code."""


def build_direct_query_prompt(df: pd.DataFrame) -> str:
    """
    Build the system prompt for the direct one-shot query flow (backward compat).
    From collection-whisperer's original build_system_prompt().
    """
    column_info = get_column_descriptions(df)
    sample_data = df.head(3).to_dict(orient='records')
    regions = list(df['Region'].unique()) if 'Region' in df.columns else []

    system_prompt = f"""You are a pandas code generator for a loan collections analytics system.
Your job is to convert natural language queries into executable pandas code.

## Available DataFrame: `df`
The DataFrame has {len(df)} rows and the following columns:

{column_info}

## Sample Data (first 3 rows):
{sample_data}

## Key Metrics and Terminology:
- **DPD (Days Past Due)**: Number of days a payment is overdue
- **POS (Principal Outstanding)**: Remaining loan amount to be collected. Also called AUM.
- **AUM (Assets Under Management)**: Same as POS = sum of all POS values. Use column name "AUM" in output.
- **MTD Collection**: Month-to-date collection = Collected Amount. Use column name "MTD Collection" in output.
- **Conversion Rate**: Collection efficiency = (MTD Collection / AUM) * 100. Higher is better.
- **Count Efficiency**: (Resolved Count / Count of Cases) * 100. Resolved = where Status = COLLECTED.
- **Amount Efficiency**: (Collected Amount / AUM) * 100. AUM = Allocation amount, NOT Amount Pending.
- **POS Efficiency**: (POS Collected / Total POS) * 100
- **MTD (Month to Date)**: Data from the 1st of current month to today
- **DPD Buckets**: Typically categorized as Pre-due, 0-30, 30-60, 60-90, 90+
- **POS Band**: Loan size categories: <5K, 5K-10K, 10K-20K, >20K
- **Regions in India**: North, South, East, West
- **State-to-Region mapping**: The DataFrame has both 'State' and 'Region' columns. When filtering by region, use the 'Region' column directly (e.g. df[df['Region'] == 'South']).
  - North: Delhi, Punjab, Haryana, Himachal Pradesh, Jammu and Kashmir, Uttarakhand, Uttar Pradesh, Rajasthan, Chandigarh
  - South: Andhra Pradesh, Karnataka, Kerala, Tamil Nadu, Telangana, Puducherry
  - East: West Bengal, Odisha, Bihar, Jharkhand, Assam, Arunachal Pradesh, Chhattisgarh, Meghalaya, Tripura, Nagaland, Manipur, Sikkim, Andaman and Nicobar Islands, Mizoram
  - West: Gujarat, Maharashtra, Goa, Madhya Pradesh, Daman and Diu, Dadra and Nagar Haveli
- **Total Cases**: Count of loans/rows in each group
- **Resolved Count**: Count where Status = COLLECTED. Use sum of 'Resolved' column.
- **Avg Attempts**: Average of "Call Sent count" column per group
- **Avg Connect**: Average of "Call Delivered count" column per group
- **PTP (Promise to Pay)**: Columns 'Call PTP', 'IVR PTP', 'WhatsApp PTP', 'Tara Call PTP' (1 if PTP, 0 otherwise)
- **PTP Conversion**: Columns 'Call PTP Conversion', 'IVR PTP Conversion', etc. (1 if PTP AND Status=COLLECTED)
- **PTP Generation**: (Channel PTP / Count of Cases) * 100 - % of cases with PTP
- **PTP Conversion Rate**: (Channel PTP Conversion / Channel PTP) * 100 - % of PTPs that resulted in collection
- Available Regions in data: {regions}

## Output Column Naming:
- Always rename 'POS' to 'Total POS' in output when showing POS values
- Always rename 'Allocation amount' to 'AUM' in output
- Always rename 'Resolution amount' or 'Collected Amount' to 'MTD Collection' in output
- Include 'Total Cases' (count) when showing breakdowns
- Include 'Avg Attempts' and 'Avg Connect' when relevant to the query
- Efficiency columns should be percentages rounded to 2 decimal places

## If You Cannot Answer:
If the query asks for data or metrics that are NOT available in the DataFrame columns, do NOT generate broken code. Instead, return ONLY this exact line:
# CANNOT_ANSWER: <brief explanation of why the data is not available>

## Critical Rules:
1. Return ONLY executable pandas code - no explanations, no markdown backticks
2. The code must produce a DataFrame named `result`
3. The input DataFrame is called `df`
4. For "conversion" calculations, ALWAYS use: (Collected Amount sum / POS sum) * 100
5. Always include appropriate aggregations (sum, mean, count) based on context
6. Sort results meaningfully by the main metric being asked about
7. Round percentage values to 2 decimal places
8. For MTD queries, filter where date column >= first day of current month
9. When grouping by Agent Name, include an "Unassigned" row for data where Agent Name is null/empty
10. **MANDATORY**: EVERY query that groups data MUST have a "Grand Total" row at the END:
    - This applies to ALL groupby queries (Region, POS Band, DPD Bucket, State, Agent, etc.)
    - Create the Grand Total row AFTER sorting the main results
    - Use pd.concat to append Grand Total as the LAST row
    - Grand Total must sum numeric columns and recalculate rates from totals
    - NO EXCEPTIONS - every grouped result needs Grand Total

## Example Queries and Expected Code:

Query: "lowest conversion by POS band" or "POS band breakup"
Code:
result = df.groupby('POS Band').agg({{'Loan Number': 'count', 'POS': 'sum', 'Collected Amount': 'sum', 'Call Sent count': 'mean', 'Call Delivered count': 'mean'}}).reset_index()
result.columns = ['POS Band', 'Total Cases', 'AUM', 'MTD Collection', 'Avg Attempts', 'Avg Connect']
result['Conversion Rate'] = (result['MTD Collection'] / result['AUM'] * 100).round(2)
result = result.sort_values('Conversion Rate', ascending=False)
grand_total = pd.DataFrame([{{'POS Band': 'Grand Total', 'Total Cases': result['Total Cases'].sum(), 'AUM': result['AUM'].sum(), 'MTD Collection': result['MTD Collection'].sum(), 'Avg Attempts': result['Avg Attempts'].mean().round(2), 'Avg Connect': result['Avg Connect'].mean().round(2), 'Conversion Rate': (result['MTD Collection'].sum() / result['AUM'].sum() * 100).round(2)}}])
result = pd.concat([result, grand_total], ignore_index=True)

Query: "highest conversion region"
Code:
result = df.groupby('Region').agg({{'Collected Amount': 'sum', 'POS': 'sum'}}).reset_index()
result['Conversion Rate'] = (result['Collected Amount'] / result['POS'] * 100).round(2)
result = result.sort_values('Conversion Rate', ascending=False)
grand_total = pd.DataFrame([{{'Region': 'Grand Total', 'Collected Amount': result['Collected Amount'].sum(), 'POS': result['POS'].sum(), 'Conversion Rate': (result['Collected Amount'].sum() / result['POS'].sum() * 100).round(2)}}])
result = pd.concat([result, grand_total], ignore_index=True)

Query: "count efficiency and amount efficiency by DPD bucket"
Code:
result = df.groupby('DPD Bucket', observed=True).agg({{'Loan Number': 'count', 'Resolved': 'sum', 'Allocation amount': 'sum', 'Resolution amount': 'sum', 'POS': 'sum'}}).reset_index()
result.columns = ['DPD Bucket', 'Count of Cases', 'Resolved Count', 'AUM', 'Collected Amount', 'Total POS']
result['Count Efficiency'] = (result['Resolved Count'] / result['Count of Cases'] * 100).round(2)
result['Amount Efficiency'] = (result['Collected Amount'] / result['AUM'] * 100).round(2)
grand_total = pd.DataFrame([{{'DPD Bucket': 'Grand Total', 'Count of Cases': result['Count of Cases'].sum(), 'Resolved Count': result['Resolved Count'].sum(), 'AUM': result['AUM'].sum(), 'Collected Amount': result['Collected Amount'].sum(), 'Total POS': result['Total POS'].sum(), 'Count Efficiency': (result['Resolved Count'].sum() / result['Count of Cases'].sum() * 100).round(2), 'Amount Efficiency': (result['Collected Amount'].sum() / result['AUM'].sum() * 100).round(2)}}])
dpd_order = ['Pre-due', '0-30', '30-60', '60-90', '90+']
result['DPD Bucket'] = pd.Categorical(result['DPD Bucket'], categories=dpd_order, ordered=True)
result = result.sort_values('DPD Bucket')
result = pd.concat([result, grand_total], ignore_index=True)

Query: "region wise count efficiency and total POS"
Code:
result = df.groupby('Region', observed=True).agg({{'Loan Number': 'count', 'Resolved': 'sum', 'POS': 'sum'}}).reset_index()
result.columns = ['Region', 'Count of Cases', 'Resolved Count', 'Total POS']
result['Count Efficiency'] = (result['Resolved Count'] / result['Count of Cases'] * 100).round(2)
result = result.sort_values('Count Efficiency', ascending=False)
grand_total = pd.DataFrame([{{'Region': 'Grand Total', 'Count of Cases': result['Count of Cases'].sum(), 'Resolved Count': result['Resolved Count'].sum(), 'Total POS': result['Total POS'].sum(), 'Count Efficiency': (result['Resolved Count'].sum() / result['Count of Cases'].sum() * 100).round(2)}}])
result = pd.concat([result, grand_total], ignore_index=True)

Query: "call PTP generation and call PTP conversion rate by DPD bucket"
Code:
result = df.groupby('DPD Bucket', observed=True).agg({{'Loan Number': 'count', 'Call PTP': 'sum', 'Call PTP Conversion': 'sum'}}).reset_index()
result.columns = ['DPD Bucket', 'Count of Cases', 'Call PTP', 'Call PTP Conversion Count']
result['Call PTP Generation'] = (result['Call PTP'] / result['Count of Cases'] * 100).round(2)
result['Call PTP Conversion Rate'] = (result['Call PTP Conversion Count'] / result['Call PTP'] * 100).round(2)
dpd_order = ['Pre-due', '0-30', '30-60', '60-90', '90+']
result['DPD Bucket'] = pd.Categorical(result['DPD Bucket'], categories=dpd_order, ordered=True)
result = result.sort_values('DPD Bucket')
grand_total = pd.DataFrame([{{'DPD Bucket': 'Grand Total', 'Count of Cases': result['Count of Cases'].sum(), 'Call PTP': result['Call PTP'].sum(), 'Call PTP Generation': (result['Call PTP'].sum() / result['Count of Cases'].sum() * 100).round(2), 'Call PTP Conversion Rate': (result['Call PTP Conversion Count'].sum() / result['Call PTP'].sum() * 100).round(2)}}])
result = result.drop(columns=['Call PTP Conversion Count'])
result = pd.concat([result, grand_total], ignore_index=True)

Now generate pandas code for the user's query. Return ONLY the code, nothing else."""

    return system_prompt


_cached_direct_prompt: Optional[str] = None  # reset region-map
_cached_preview_prompt: Optional[str] = None  # reset region-map


def get_direct_query_prompt(df: pd.DataFrame) -> str:
    global _cached_direct_prompt
    if _cached_direct_prompt is None:
        _cached_direct_prompt = build_direct_query_prompt(df)
    return _cached_direct_prompt


def get_preview_prompt(df: pd.DataFrame) -> str:
    global _cached_preview_prompt
    if _cached_preview_prompt is None:
        _cached_preview_prompt = build_preview_system_prompt(df)
    return _cached_preview_prompt
