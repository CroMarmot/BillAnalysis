from collections.abc import Generator
from pathlib import Path
from typing import Annotated

from fastapi import Depends
from sqlmodel import Session, create_engine

from bill_analysis.configs import app_settings

_db_path = Path(app_settings.db_path).resolve()
engine = create_engine(
    f"sqlite:///{_db_path}",
    connect_args={"check_same_thread": False},
    echo=False,
)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


DBSessionDep = Annotated[Session, Depends(get_session)]
