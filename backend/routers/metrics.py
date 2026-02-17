from fastapi import APIRouter

import pandas as pd

from backend.data.loader import get_dataframe
from backend.schemas import MetricsResponse, RegionsResponse, RegionData, BucketsResponse, BucketData

router = APIRouter()


@router.get("/metrics", response_model=MetricsResponse)
async def get_metrics():
    df = get_dataframe()

    total_cases = len(df)

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


@router.get("/buckets", response_model=BucketsResponse)
async def get_buckets():
    df = get_dataframe()

    if 'DPD Bucket' not in df.columns:
        return BucketsResponse(buckets=[], total_cases=len(df))

    total = len(df)
    bucket_order = ['Pre-due', '0-30', '30-60', '60-90', '90+']
    counts = df.groupby('DPD Bucket').size()

    buckets = []
    for name in bucket_order:
        if name in counts.index:
            count = int(counts[name])
            buckets.append(BucketData(
                name=name,
                case_count=count,
                case_percentage=round(count / total * 100, 1),
            ))

    # Include any buckets not in the standard order
    for name in counts.index:
        if name not in bucket_order and str(name) != 'nan':
            count = int(counts[name])
            buckets.append(BucketData(
                name=str(name),
                case_count=count,
                case_percentage=round(count / total * 100, 1),
            ))

    return BucketsResponse(buckets=buckets, total_cases=total)
