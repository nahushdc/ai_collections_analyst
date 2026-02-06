from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.data.loader import get_dataframe
from backend.routers import query, metrics, export


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_dataframe()
    yield


app = FastAPI(title="Collections Whisperer API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(query.router, prefix="/api")
app.include_router(metrics.router, prefix="/api")
app.include_router(export.router, prefix="/api")
