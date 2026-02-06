from __future__ import annotations

from pydantic import BaseModel
from typing import Any, List, Optional


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


class ExportRequest(BaseModel):
    data: List[dict[str, Any]]
    columns: List[str]
