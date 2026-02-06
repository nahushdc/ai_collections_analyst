from io import BytesIO

import pandas as pd
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from backend.schemas import ExportRequest

router = APIRouter()


@router.post("/export")
async def export_excel(req: ExportRequest):
    df = pd.DataFrame(req.data, columns=req.columns)

    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Query Results')
    output.seek(0)

    from datetime import datetime
    filename = f"query_result_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
