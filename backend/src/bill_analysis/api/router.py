import logging
from typing import Annotated

from fastapi import APIRouter, File, Form, Query, UploadFile
from starlette.responses import Response
from starlette import status

from bill_analysis.api import service
from bill_analysis.api.db import DBSessionDep
from bill_analysis.api.models import (
    ApplyResult,
    AutoTagRuleCreate,
    AutoTagRuleResponse,
    AutoTagRuleUpdate,
    BatchTagAddRequest,
    BatchTagRemoveRequest,
    FileListItem,
    PeriodQueryRequest,
    SpendingRecord,
    SummaryData,
    TagCreate,
    TagQueryRequest,
    TagResponse,
    TagTrendRequest,
    TagTrendResponse,
    TagUpdate,
    TransactionNoteResponse,
    TransactionNoteUpsert,
    TransactionTagResponse,
    UserCreate,
    UserResponse,
    UserUpdate,
)
from bill_analysis.configs import app_settings

logger = logging.getLogger(app_settings.app_name + ".api")

router = APIRouter()


# ── Users ──────────────────────────────────────────────────────────────────


@router.get("/users")
def list_users(session: DBSessionDep) -> list[UserResponse]:
    return service.list_users(session)


@router.post("/users", status_code=201)
def create_user(body: UserCreate, session: DBSessionDep) -> UserResponse:
    return service.create_user(session, body)


@router.patch("/users/{user_id}")
def rename_user(user_id: int, body: UserUpdate, session: DBSessionDep) -> UserResponse:
    return service.rename_user(session, user_id, body)


@router.delete("/users/{user_id}", status_code=204)
def delete_user(session: DBSessionDep, user_id: int) -> Response:
    service.delete_user(session, user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ── Period summaries ────────────────────────────────────────────────────────


@router.get("/year")
def get_year(session: DBSessionDep, user_id: Annotated[int, Query()]) -> SummaryData:
    return service.summary_by_period(session, user_id, "year")


@router.post("/year_query")
def post_year_query(
    req: PeriodQueryRequest, session: DBSessionDep, user_id: Annotated[int, Query()]
) -> list[SpendingRecord]:
    return service.query_period(session, user_id, "year", req.key, req.in_out)


@router.get("/month")
def get_month(session: DBSessionDep, user_id: Annotated[int, Query()]) -> SummaryData:
    return service.summary_by_period(session, user_id, "month")


@router.post("/month_query")
def post_month_query(
    req: PeriodQueryRequest, session: DBSessionDep, user_id: Annotated[int, Query()]
) -> list[SpendingRecord]:
    return service.query_period(session, user_id, "month", req.key, req.in_out)


@router.get("/week")
def get_week(session: DBSessionDep, user_id: Annotated[int, Query()]) -> SummaryData:
    return service.summary_by_period(session, user_id, "week")


@router.post("/week_query")
def post_week_query(
    req: PeriodQueryRequest, session: DBSessionDep, user_id: Annotated[int, Query()]
) -> list[SpendingRecord]:
    return service.query_period(session, user_id, "week", req.key, req.in_out)


# ── File management ────────────────────────────────────────────────────────


@router.get("/file_list")
def get_file_list(session: DBSessionDep, user_id: Annotated[int, Query()]) -> list[FileListItem]:
    return service.list_files(session, user_id)


@router.post("/remove_file", status_code=204)
def post_remove_file(
    session: DBSessionDep,
    filename: str = Form(...),
    csvType: str = Form(...),
    user_id: int = Form(...),
) -> Response:
    service.remove_file(session, filename, user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ── Upload ─────────────────────────────────────────────────────────────────


@router.post("/upload")
async def post_upload(
    session: DBSessionDep, files: list[UploadFile] = File(...), user_id: int = Form(...)
) -> dict[str, int]:
    return service.process_uploads(session, files, user_id)


# ── Tags ────────────────────────────────────────────────────────────────────


@router.get("/tags")
def list_tags(session: DBSessionDep, user_id: Annotated[int, Query()]) -> list[TagResponse]:
    return service.list_tags(session, user_id)


@router.post("/tags", status_code=201)
def create_tag(body: TagCreate, session: DBSessionDep, user_id: Annotated[int, Query()]) -> TagResponse:
    return service.create_tag(session, user_id, body)


@router.patch("/tags/{tag_id}")
def rename_tag(tag_id: int, body: TagUpdate, session: DBSessionDep) -> TagResponse:
    return service.rename_tag(session, tag_id, body)


@router.delete("/tags/{tag_id}", status_code=204)
def delete_tag(session: DBSessionDep, tag_id: int) -> Response:
    service.delete_tag(session, tag_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/transactions/{transaction_id}/tags")
def get_transaction_tags(transaction_id: int, session: DBSessionDep) -> list[TransactionTagResponse]:
    return service.get_transaction_tags(session, transaction_id)


@router.put("/transactions/{transaction_id}/tags")
def set_transaction_tags(transaction_id: int, body: list[int], session: DBSessionDep) -> list[TransactionTagResponse]:
    return service.set_transaction_tags(session, transaction_id, body)


@router.post("/transactions/batch/tags/add")
def batch_add_tags(body: BatchTagAddRequest, session: DBSessionDep) -> dict[str, int]:
    return service.batch_add_tags(session, body)


@router.post("/transactions/batch/tags/remove")
def batch_remove_tags(body: BatchTagRemoveRequest, session: DBSessionDep) -> dict[str, int]:
    return service.batch_remove_tags(session, body)


# ── Auto-tag rules ─────────────────────────────────────────────────────────


@router.get("/auto_tag_rules")
def list_auto_tag_rules(session: DBSessionDep, user_id: Annotated[int, Query()]) -> list[AutoTagRuleResponse]:
    return service.list_auto_tag_rules(session, user_id)


@router.post("/auto_tag_rules", status_code=201)
def create_auto_tag_rule(
    body: AutoTagRuleCreate, session: DBSessionDep, user_id: Annotated[int, Query()]
) -> AutoTagRuleResponse:
    return service.create_auto_tag_rule(session, user_id, body)


@router.patch("/auto_tag_rules/{rule_id}")
def update_auto_tag_rule(rule_id: int, body: AutoTagRuleUpdate, session: DBSessionDep) -> AutoTagRuleResponse:
    return service.update_auto_tag_rule(session, rule_id, body)


@router.delete("/auto_tag_rules/{rule_id}", status_code=204)
def delete_auto_tag_rule(session: DBSessionDep, rule_id: int) -> Response:
    service.delete_auto_tag_rule(session, rule_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/auto_tag_rules/{rule_id}/apply")
def post_apply_auto_tag_rule(rule_id: int, session: DBSessionDep, user_id: Annotated[int, Query()]) -> ApplyResult:
    return service.apply_auto_tag_rule(session, rule_id, user_id)


@router.post("/apply_auto_tags")
def post_apply_auto_tags(session: DBSessionDep, user_id: Annotated[int, Query()]) -> ApplyResult:
    return service.apply_auto_tags(session, user_id)


# ── Transaction notes ──────────────────────────────────────────────────────


@router.get("/transaction_notes")
def get_transaction_note(
    session: DBSessionDep,
    source: str = Query(),
    order_no: str = Query(),
    user_id: int = Query(),
) -> TransactionNoteResponse | None:
    return service.get_transaction_note(session, source, order_no, user_id)


@router.put("/transaction_notes")
def upsert_transaction_note(
    body: TransactionNoteUpsert,
    session: DBSessionDep,
    user_id: int = Query(),
) -> TransactionNoteResponse:
    return service.upsert_transaction_note(session, body, user_id)


@router.delete("/transaction_notes", status_code=204)
def delete_transaction_note(
    session: DBSessionDep,
    source: str = Query(),
    order_no: str = Query(),
    user_id: int = Query(),
) -> Response:
    service.delete_transaction_note(session, source, order_no, user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/backup_db")
def backup_database() -> dict[str, str]:
    return service.backup_database()


@router.get("/backups")
def list_backups() -> list[dict[str, str]]:
    return service.list_backups()


@router.delete("/backups/{filename}", status_code=204)
def delete_backup(filename: str) -> Response:
    service.delete_backup(filename)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ── Tag trend ─────────────────────────────────────────────────────────────


@router.post("/tag_trend")
def post_tag_trend(
    req: TagTrendRequest, session: DBSessionDep, user_id: Annotated[int, Query()]
) -> list[TagTrendResponse]:
    return service.tag_trend(session, user_id, req)


@router.post("/tag_query")
def post_tag_query(
    req: TagQueryRequest, session: DBSessionDep, user_id: Annotated[int, Query()]
) -> list[SpendingRecord]:
    return service.tag_query(session, user_id, req)
