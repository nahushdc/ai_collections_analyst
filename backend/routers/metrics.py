from fastapi import APIRouter

from backend.data.loader import get_dataframe
from backend.schemas import MetricsResponse, RegionsResponse, RegionData

router = APIRouter()


@router.get("/metrics", response_model=MetricsResponse)
async def get_metrics():
    df = get_dataframe()

    total_cases = len(df)

    # Check for State column (or use Region as fallback)
    if 'State' in df.columns:
        active_states = int(df['State'].nunique())
    elif 'Region' in df.columns:
        active_states = int(df['Region'].nunique())
    else:
        active_states = 0

    total_aum = float(df['POS'].sum())
    total_collection = float(df['Collected Amount'].sum())
    collection_rate = round(total_collection / total_aum * 100, 2) if total_aum > 0 else 0.0
    avg_pos = round(float(df['POS'].mean()), 2)

    avg_attempts = round(float(df['Call Sent count'].mean()), 2) if 'Call Sent count' in df.columns else 0.0
    avg_connects = round(float(df['Call Delivered count'].mean()), 2) if 'Call Delivered count' in df.columns else 0.0

    date_range_start = None
    date_range_end = None

    # Try Upload Date first, then fall back to Disbursement Date or Due Date
    date_col = None
    for col in ['Upload Date', 'Disbursement Date', 'Due Date']:
        if col in df.columns:
            date_col = col
            break

    if date_col:
        valid_dates = df[date_col].dropna()
        if len(valid_dates) > 0:
            date_range_start = str(valid_dates.min().strftime('%d %b %Y'))
            date_range_end = str(valid_dates.max().strftime('%d %b %Y'))

    return MetricsResponse(
        total_cases=total_cases,
        active_states=active_states,
        total_aum=total_aum,
        total_collection=total_collection,
        collection_rate=collection_rate,
        avg_pos=avg_pos,
        avg_attempts=avg_attempts,
        avg_connects=avg_connects,
        date_range_start=date_range_start,
        date_range_end=date_range_end,
    )


@router.get("/regions", response_model=RegionsResponse)
async def get_regions():
    df = get_dataframe()

    if 'Region' not in df.columns:
        return RegionsResponse(regions=[])

    total = len(df)
    grouped = df.groupby('Region').agg({
        'POS': 'sum',
        'Collected Amount': 'sum',
    }).reset_index()
    grouped['case_count'] = df.groupby('Region').size().values

    regions = []
    for _, row in grouped.iterrows():
        aum = float(row['POS'])
        collection = float(row['Collected Amount'])
        regions.append(RegionData(
            name=str(row['Region']).upper(),
            case_count=int(row['case_count']),
            case_percentage=round(int(row['case_count']) / total * 100, 1),
            aum=aum,
            collection=collection,
            conversion_rate=round(collection / aum * 100, 2) if aum > 0 else 0.0,
        ))

    regions.sort(key=lambda r: r.case_percentage, reverse=True)
    return RegionsResponse(regions=regions)
