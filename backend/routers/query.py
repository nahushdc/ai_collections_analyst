from fastapi import APIRouter, HTTPException

from backend.data.loader import get_dataframe
from backend.llm.prompt import get_system_prompt
from backend.llm.client import query_llm
from backend.query.executor import execute_pandas_code, detect_chart_type, sanitize_for_json
from backend.schemas import QueryRequest, QueryResponse, ChartSpec

router = APIRouter()


@router.post("/query", response_model=QueryResponse)
async def run_query(req: QueryRequest):
    df = get_dataframe()
    system_prompt = get_system_prompt(df)

    try:
        generated_code = query_llm(req.question, system_prompt)
    except Exception as e:
        return QueryResponse(
            success=False,
            question=req.question,
            row_count=0,
            columns=[],
            data=[],
            chart=None,
            generated_code="",
            error=f"LLM error: {str(e)}",
        )

    try:
        result = execute_pandas_code(generated_code, df)
    except Exception as e:
        return QueryResponse(
            success=False,
            question=req.question,
            row_count=0,
            columns=[],
            data=[],
            chart=None,
            generated_code=generated_code,
            error=f"Execution error: {str(e)}",
        )

    chart_spec_dict = detect_chart_type(result, req.question)
    chart_spec = ChartSpec(**chart_spec_dict) if chart_spec_dict else None

    data = sanitize_for_json(result.to_dict(orient='records'))

    return QueryResponse(
        success=True,
        question=req.question,
        row_count=len(result),
        columns=list(result.columns),
        data=data,
        chart=chart_spec,
        generated_code=generated_code,
    )
