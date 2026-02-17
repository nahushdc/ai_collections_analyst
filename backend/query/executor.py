import textwrap
from typing import Optional

import pandas as pd
import numpy as np
from datetime import datetime


def execute_pandas_code(code: str, df: pd.DataFrame) -> pd.DataFrame:
    """
    Execute LLM-generated pandas code in a controlled namespace.
    Returns the result DataFrame.
    Merged from AI-data (textwrap.dedent, tab normalization) and collection-whisperer.
    """
    # Clean the code - remove markdown backticks if present
    code = code.replace('```python', '').replace('```', '').strip()

    # Use textwrap.dedent to remove common leading whitespace
    code = textwrap.dedent(code)

    # Normalize tabs to spaces
    code = code.replace('\t', '    ')

    # Create controlled namespace with only df and pd
    namespace = {
        'df': df.copy(),
        'pd': pd,
        'datetime': datetime,
    }

    # Execute the code
    exec(code, namespace)

    # Get the result
    if 'result' not in namespace:
        raise ValueError("Generated code did not produce a 'result' DataFrame")

    result = namespace['result']

    if not isinstance(result, pd.DataFrame):
        if isinstance(result, pd.Series):
            result = result.to_frame()
        else:
            raise ValueError("Result is not a DataFrame")

    return result


def detect_chart_type(df: pd.DataFrame, question: str) -> Optional[dict]:
    """
    Analyze result DataFrame shape and content to determine best chart type.
    From collection-whisperer.
    """
    display_df = df[
        ~df.iloc[:, 0].astype(str).str.contains('Grand Total', na=False)
    ]

    num_rows = len(display_df)
    category_col = display_df.columns[0]
    numeric_cols = [
        c for c in display_df.columns
        if display_df[c].dtype in ('float64', 'int64', 'Float64', 'Int64')
    ]
    rate_cols = [
        c for c in numeric_cols
        if 'rate' in c.lower() or 'conversion' in c.lower() or '%' in c.lower()
        or 'efficiency' in c.lower() or 'coverage' in c.lower() or 'connectivity' in c.lower()
        or 'generation' in c.lower() or 'intensity' in c.lower()
        or c.lower().startswith('avg ')
    ]
    # Exclude intermediate/helper columns from chart (counts, totals, raw aggregates)
    helper_keywords = ('count of cases', 'total cases', 'resolved count', 'aum', 'collected amount',
                        'total pos', 'call ptp', 'ivr ptp', 'whatsapp ptp', 'tara call ptp')
    amount_cols = [
        c for c in numeric_cols
        if c not in rate_cols and c.lower() not in helper_keywords
    ]

    is_temporal = any(
        kw in category_col.lower()
        for kw in ('date', 'month', 'week', 'year', 'day')
    )

    if num_rows <= 1 and len(numeric_cols) >= 1 and len(numeric_cols) <= 2:
        return {
            "chart_type": "single_value",
            "x_key": category_col,
            "y_keys": numeric_cols,
            "title": question,
        }

    if num_rows <= 1:
        return {
            "chart_type": "table_only",
            "x_key": "",
            "y_keys": [],
            "title": question,
        }

    if num_rows > 20:
        all_chart_cols = rate_cols[:4] + amount_cols[:6]
        if not all_chart_cols:
            return {
                "chart_type": "table_only",
                "x_key": "",
                "y_keys": [],
                "title": question,
            }
        return {
            "chart_type": "horizontal_bar",
            "x_key": category_col,
            "y_keys": all_chart_cols,
            "title": question,
        }

    if is_temporal:
        y_keys = (rate_cols[:2] if rate_cols else amount_cols[:4])
        if not y_keys:
            return {
                "chart_type": "table_only",
                "x_key": "",
                "y_keys": [],
                "title": question,
            }
        return {
            "chart_type": "line",
            "x_key": category_col,
            "y_keys": y_keys,
            "title": question,
        }

    if 2 <= num_rows <= 6 and len(rate_cols) == 0 and len(amount_cols) == 1:
        return {
            "chart_type": "pie",
            "x_key": category_col,
            "y_keys": amount_cols,
            "title": question,
        }

    # Include both rate and amount columns - frontend handles splitting by type
    all_chart_cols = rate_cols[:4] + amount_cols[:6]
    if all_chart_cols:
        return {
            "chart_type": "bar",
            "x_key": category_col,
            "y_keys": all_chart_cols,
            "title": question,
        }

    return {
        "chart_type": "table_only",
        "x_key": "",
        "y_keys": [],
        "title": question,
    }


def sanitize_for_json(data: list[dict]) -> list[dict]:
    """Convert numpy/pandas types to native Python for JSON serialization."""
    for row in data:
        for key, val in row.items():
            if isinstance(val, (np.integer,)):
                row[key] = int(val)
            elif isinstance(val, (np.floating,)):
                row[key] = None if np.isnan(val) else float(val)
            elif isinstance(val, pd.Timestamp):
                row[key] = val.isoformat() if pd.notna(val) else None
            elif val is pd.NaT:
                row[key] = None
            elif isinstance(val, float) and np.isnan(val):
                row[key] = None
    return data
