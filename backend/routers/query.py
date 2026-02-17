from fastapi import APIRouter

from backend.data.loader import get_dataframe
from backend.llm.prompt import get_direct_query_prompt, get_preview_prompt, build_code_generation_prompt
from backend.llm.client import query_llm, parse_query, generate_code, modify_logic
from backend.query.executor import execute_pandas_code, detect_chart_type, sanitize_for_json
from backend.schemas import (
    QueryRequest, QueryResponse, ChartSpec,
    PreviewRequest, PreviewResponse, OutputColumn,
    ConfirmRequest, ConfirmResponse,
    ModifyLogicRequest, ModifyLogicResponse,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Existing direct one-shot query (backward compat)
# ---------------------------------------------------------------------------

@router.post("/query", response_model=QueryResponse)
async def run_query(req: QueryRequest):
    df = get_dataframe()
    system_prompt = get_direct_query_prompt(df)

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

    # Check if LLM indicated it cannot answer
    if generated_code.strip().startswith('# CANNOT_ANSWER:'):
        reason = generated_code.strip().replace('# CANNOT_ANSWER:', '').strip()
        return QueryResponse(
            success=False,
            question=req.question,
            row_count=0,
            columns=[],
            data=[],
            chart=None,
            generated_code="",
            error=reason,
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


# ---------------------------------------------------------------------------
# Two-step preview/confirm flow (from AI-data)
# ---------------------------------------------------------------------------

@router.post("/query/preview", response_model=PreviewResponse)
async def query_preview(req: PreviewRequest):
    df = get_dataframe()
    system_prompt = get_preview_prompt(df)

    preview_data = parse_query(req.question, system_prompt)

    return PreviewResponse(
        grouping_column=preview_data.get('grouping_column', ''),
        output_columns=[
            OutputColumn(
                name=col.get('name', ''),
                logic=col.get('logic', ''),
                type=col.get('type', 'metric'),
            )
            for col in preview_data.get('output_columns', [])
        ],
        row_labels=preview_data.get('row_labels', ['Grand Total']),
        filters=preview_data.get('filters', []),
        sort_by=preview_data.get('sort_by', ''),
        sort_ascending=preview_data.get('sort_ascending', False),
    )


@router.post("/query/confirm", response_model=ConfirmResponse)
async def query_confirm(req: ConfirmRequest):
    df = get_dataframe()

    # Build the code generation prompt with confirmed logic
    code_gen_prompt = build_code_generation_prompt(
        df, req.question, req.confirmed_logic, req.preview_data
    )

    try:
        generated = generate_code(
            f"Generate code for: {req.question}",
            code_gen_prompt,
        )
    except Exception as e:
        return ConfirmResponse(
            success=False,
            question=req.question,
            row_count=0,
            columns=[],
            data=[],
            chart=None,
            generated_code="",
            sql_code="",
            error=f"LLM error: {str(e)}",
        )

    try:
        result = execute_pandas_code(generated['python'], df)
    except Exception as e:
        return ConfirmResponse(
            success=False,
            question=req.question,
            row_count=0,
            columns=[],
            data=[],
            chart=None,
            generated_code=generated.get('python', ''),
            sql_code=generated.get('sql', ''),
            error=f"Execution error: {str(e)}",
        )

    chart_spec_dict = detect_chart_type(result, req.question)
    chart_spec = ChartSpec(**chart_spec_dict) if chart_spec_dict else None

    data = sanitize_for_json(result.to_dict(orient='records'))

    return ConfirmResponse(
        success=True,
        question=req.question,
        row_count=len(result),
        columns=list(result.columns),
        data=data,
        chart=chart_spec,
        generated_code=generated.get('python', ''),
        sql_code=generated.get('sql', ''),
    )


@router.post("/query/modify-logic", response_model=ModifyLogicResponse)
async def query_modify_logic(req: ModifyLogicRequest):
    df = get_dataframe()

    updated = modify_logic(req.current_logic, req.followup, df)

    return ModifyLogicResponse(updated_logic=updated)
