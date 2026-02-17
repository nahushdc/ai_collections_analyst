from __future__ import annotations

from pydantic import BaseModel
from typing import Any, List, Optional


# ---------------------------------------------------------------------------
# Existing schemas (from collection-whisperer, backward compat)
# ---------------------------------------------------------------------------

class QueryRequest(BaseModel):
    question: str


class ChartSpec(BaseModel):
    chart_type: str
    x_key: str
    y_keys: List[str]
    title: str


class QueryResponse(BaseModel):
    success: bool
    question: str
    row_count: int
    columns: List[str]
    data: List[dict[str, Any]]
    chart: Optional[ChartSpec] = None
    generated_code: str = ""
    error: Optional[str] = None


class MetricsResponse(BaseModel):
    total_cases: int
    active_states: int
    total_aum: float
    total_collection: float
    collection_rate: float
    avg_pos: float
    avg_attempts: float
    avg_connects: float
    date_range_start: Optional[str] = None
    date_range_end: Optional[str] = None


class RegionData(BaseModel):
    name: str
    case_count: int
    case_percentage: float
    aum: float
    collection: float
    conversion_rate: float


class RegionsResponse(BaseModel):
    regions: List[RegionData]


class BucketData(BaseModel):
    name: str
    case_count: int
    case_percentage: float


class BucketsResponse(BaseModel):
    buckets: List[BucketData]
    total_cases: int


class ExportRequest(BaseModel):
    data: List[dict[str, Any]]
    columns: List[str]


# ---------------------------------------------------------------------------
# New schemas for two-step preview/confirm flow (from AI-data)
# ---------------------------------------------------------------------------

class OutputColumn(BaseModel):
    name: str
    logic: str
    type: str = "metric"


class PreviewRequest(BaseModel):
    question: str


class PreviewResponse(BaseModel):
    grouping_column: str
    output_columns: List[OutputColumn]
    row_labels: List[str]
    filters: List[str]
    sort_by: str
    sort_ascending: bool


class ConfirmRequest(BaseModel):
    question: str
    confirmed_logic: List[dict[str, str]]
    preview_data: dict[str, Any]


class ConfirmResponse(BaseModel):
    success: bool
    question: str
    row_count: int
    columns: List[str]
    data: List[dict[str, Any]]
    chart: Optional[ChartSpec] = None
    generated_code: str = ""
    sql_code: str = ""
    error: Optional[str] = None


class ModifyLogicRequest(BaseModel):
    current_logic: List[dict[str, str]]
    followup: str


class ModifyLogicResponse(BaseModel):
    updated_logic: List[dict[str, str]]
