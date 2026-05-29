from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import JSON, Column, DateTime, Float, Integer, String, Text, select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from src.core.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class DatasetRow(Base):
    __tablename__ = "eval_datasets"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    name = Column(String, nullable=False)
    feature = Column(String, nullable=False)
    cases = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))


class RunRow(Base):
    __tablename__ = "eval_runs"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    dataset_id = Column(String, nullable=False)
    dataset_name = Column(String, nullable=False)
    feature = Column(String, nullable=False)
    metrics = Column(JSON, nullable=False)
    status = Column(String, default="pending")
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    finished_at = Column(DateTime(timezone=True), nullable=True)
    total_cases = Column(Integer, default=0)
    passed_cases = Column(Integer, default=0)
    error = Column(Text, nullable=True)


class ResultRow(Base):
    __tablename__ = "eval_results"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    run_id = Column(String, nullable=False)
    case_index = Column(Integer, nullable=False)
    input = Column(Text, nullable=False)
    expected_output = Column(Text, nullable=True)
    actual_output = Column(Text, nullable=True)
    latency_ms = Column(Integer, nullable=True)
    metric_name = Column(String, nullable=False)
    score = Column(Float, nullable=True)
    passed = Column(Integer, nullable=True)  # 0/1
    reason = Column(Text, nullable=True)


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session
