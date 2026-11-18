import logging
import os
import shutil
import tempfile
from datetime import datetime
from pathlib import Path

from fastapi import UploadFile
from fastapi.exceptions import HTTPException
from sqlalchemy import tuple_
from sqlmodel import Session, case, delete, func, select

from bill_analysis.alipay_parser import parse_alipay_csv
from bill_analysis.api.adaptor import alipay_to_unified, wechat_to_unified
from bill_analysis.api.db_models import AutoTagRule, Tag, Transaction, TransactionNote, TransactionTag, User
from bill_analysis.api.schemas import (
    ApplyResult,
    AutoTagRuleCreate,
    AutoTagRuleResponse,
    AutoTagRuleUpdate,
    BatchTagAddRequest,
    BatchTagRemoveRequest,
    TransactionNoteResponse,
    TransactionNoteUpsert,
    FileListItem,
    SpendingRecord,
    SummaryData,
    SummaryItem,
    TagCreate,
    TagQueryRequest,
    TagResponse,
    TagTrendItem,
    TagTrendRequest,
    TagTrendResponse,
    TagUpdate,
    TransactionTagResponse,
    UserCreate,
    UserResponse,
    UserUpdate,
)
from bill_analysis.configs import app_settings
from bill_analysis.wechat_parser import parse_wechat_xlsx

logger = logging.getLogger(app_settings.app_name + ".api.service")

_TIME_FMTS = {
    "year": "%Y",
    "month": "%Y-%m",
    "week": "%Y-%W",
}


# ── User services ────────────────────────────────────────────────────────────


def list_users(session: Session) -> list[UserResponse]:
    users = session.exec(select(User)).all()
    return [UserResponse(id=u.id, name=u.name) for u in users]


def create_user(session: Session, body: UserCreate) -> UserResponse:
    user = User(name=body.name)
    session.add(user)
    session.commit()
    session.refresh(user)
    return UserResponse(id=user.id, name=user.name)


def rename_user(session: Session, user_id: int, body: UserUpdate) -> UserResponse:
    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.name = body.name
    session.add(user)
    session.commit()
    session.refresh(user)
    return UserResponse(id=user.id, name=user.name)


def delete_user(session: Session, user_id: int) -> None:
    if user_id == 1:
        raise HTTPException(status_code=400, detail="Cannot delete default user")
    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    session.delete(user)
    session.commit()


# ── Summary services ─────────────────────────────────────────────────────────


def summary_by_period(session: Session, user_id: int, period: str) -> SummaryData:
    time_fmt = _TIME_FMTS[period]
    subq = (
        select(
            Transaction.source,
            Transaction.order_no,
            Transaction.amount,
            Transaction.in_out,
            func.strftime(time_fmt, Transaction.time).label("period"),
        )
        .where(
            Transaction.user_id == user_id,
            Transaction.time.is_not(None),
            Transaction.time != "",
        )
        .distinct()
        .subquery()
    )

    stmt = (
        select(
            subq.c.source,
            subq.c.period,
            func.sum(case((subq.c.in_out == "收入", subq.c.amount), else_=0)).label("in_cnt"),
            func.sum(case((subq.c.in_out == "支出", subq.c.amount), else_=0)).label("out_cnt"),
            func.sum(case((subq.c.in_out == "不计收支", subq.c.amount), else_=0)).label("not_cnt"),
        )
        .where(subq.c.period.is_not(None))
        .group_by(subq.c.source, subq.c.period)
        .order_by(subq.c.period)
    )

    rows = session.execute(stmt).all()

    result: dict[str, dict[str, SummaryItem]] = {}
    for row in rows:
        k = row.source
        if k not in result:
            result[k] = {}
        result[k][row.period] = SummaryItem(
            in_cnt=row.in_cnt,
            out_cnt=row.out_cnt,
            not_cnt=row.not_cnt,
        )
    return SummaryData(root=result)


def query_period(session: Session, user_id: int, period: str, key: str, in_out: str) -> list[SpendingRecord]:
    time_fmt = _TIME_FMTS[period]
    stmt = (
        select(Transaction)
        .where(
            Transaction.user_id == user_id,
            func.strftime(time_fmt, Transaction.time) == key,
            Transaction.in_out == in_out,
        )
        .distinct()
        .order_by(Transaction.time)
    )

    rows = session.exec(stmt).all()

    keys = [(t.source, t.order_no or "", user_id) for t in rows if t.order_no]
    notes = {}
    if keys:
        for note in session.exec(
            select(TransactionNote).where(
                tuple_(TransactionNote.source, TransactionNote.order_no, TransactionNote.user_id).in_(keys)
            )
        ).all():
            notes[(note.source, note.order_no)] = note.remark

    return [
        SpendingRecord(
            id=t.id,
            csvType=t.source,
            no=t.order_no,
            opposite=t.opposite,
            amount=f"{t.amount / 100:.2f}",
            time=t.time,
            status=t.status or "",
            refund="",
            product=t.product or "",
            type_=t.type_ or "",
            tags=[TransactionTagResponse(tag_id=tag.id, tag_name=tag.name) for tag in (t.tags or [])],
            remark=notes.get((t.source, t.order_no or ""), ""),
        )
        for t in rows
    ]


# ── File services ────────────────────────────────────────────────────────────


def list_files(session: Session, user_id: int) -> list[FileListItem]:
    stmt = (
        select(
            Transaction.filename,
            Transaction.source,
            func.count(func.distinct(Transaction.order_no)).label("cnt"),
        )
        .where(Transaction.user_id == user_id)
        .group_by(Transaction.filename, Transaction.source)
        .order_by(Transaction.filename)
    )

    rows = session.execute(stmt).all()

    return [FileListItem(name=row.filename, type=row.source, cnt=row.cnt) for row in rows]


def remove_file(session: Session, filename: str, user_id: int) -> None:
    stmt = delete(Transaction).where(
        Transaction.filename == filename,
        Transaction.user_id == user_id,
    )
    session.exec(stmt)
    session.commit()


# ── Upload services ──────────────────────────────────────────────────────────


def _ensure_utf8(path: str) -> str:
    try:
        with open(path, encoding="utf-8") as f:
            f.read()
        return path
    except UnicodeDecodeError:
        logger.info("File is not UTF-8, trying GBK conversion")
        with open(path, encoding="gbk") as f:
            content = f.read()
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return path


def _store_transactions(session: Session, rows: list[Transaction]) -> int:
    count = 0
    for row in rows:
        try:
            if row.order_no:
                existing = session.exec(
                    select(Transaction).where(
                        Transaction.source == row.source,
                        Transaction.order_no == row.order_no,
                        Transaction.user_id == row.user_id,
                    )
                ).first()
            else:
                existing = None
            if existing and existing.id is not None:
                for field, val in row.model_dump(exclude={"id"}).items():
                    setattr(existing, field, val)
                session.add(existing)
                count += 1
            else:
                session.add(row)
                count += 1
        except Exception:
            logger.exception(f"Skipping row: order_no={row.order_no}")
    session.commit()
    return count


def _process_single_file(session: Session, file: UploadFile, user_id: int) -> int:
    if file.filename is None:
        return 0

    upload_folder = os.path.join(tempfile.gettempdir(), "bill_analysis", "uploads")
    Path(upload_folder).mkdir(parents=True, exist_ok=True)
    upload_path = os.path.join(upload_folder, file.filename)

    content = file.file.read()
    with open(upload_path, "wb") as f:
        f.write(content)

    filename_lower = file.filename.lower()

    if filename_lower.endswith(".csv"):
        upload_path = _ensure_utf8(upload_path)
        records = parse_alipay_csv(upload_path)
        rows = alipay_to_unified(records, file.filename, user_id)
    elif filename_lower.endswith(".xlsx"):
        records = parse_wechat_xlsx(upload_path)
        rows = wechat_to_unified(records, file.filename, user_id)
    else:
        logger.warning("Skipping unsupported file: %s", file.filename)
        return 0

    count = _store_transactions(session, rows)
    for t in session.exec(
        select(Transaction).where(Transaction.filename == file.filename, Transaction.user_id == user_id)
    ).all():
        _apply_auto_tags_to_transaction(session, t)
    return count


def process_uploads(session: Session, files: list[UploadFile], user_id: int) -> dict[str, int]:
    total = 0
    for f in files:
        total += _process_single_file(session, f, user_id)
    return {"count": total}


def _add_tags_to_transaction(session: Session, transaction_id: int, tag_ids: list[int]) -> None:
    existing = {
        row.tag_id
        for row in session.exec(select(TransactionTag).where(TransactionTag.transaction_id == transaction_id))
    }
    for tag_id in tag_ids:
        if tag_id not in existing:
            session.add(TransactionTag(transaction_id=transaction_id, tag_id=tag_id))
    session.commit()


def _match_rule(transaction: Transaction, rule: AutoTagRule) -> bool:
    val = getattr(transaction, rule.field, None)
    if val is None:
        return False
    if rule.match_type == "exact":
        return val == rule.pattern
    if rule.match_type == "contains":
        return rule.pattern in val
    return False


def _apply_auto_tags_to_transaction(session: Session, transaction: Transaction) -> None:
    rules = session.exec(select(AutoTagRule).where(AutoTagRule.user_id == transaction.user_id)).all()
    tag_ids = [rule.tag_id for rule in rules if _match_rule(transaction, rule)]
    if tag_ids and transaction.id is not None:
        _add_tags_to_transaction(session, transaction.id, tag_ids)


# ── Tag services ─────────────────────────────────────────────────────────────


def list_tags(session: Session, user_id: int) -> list[TagResponse]:
    tags = session.exec(select(Tag).where(Tag.user_id == user_id)).all()
    tag_ids = [t.id for t in tags]
    counts = {
        row.tag_id: row[1]
        for row in session.exec(
            select(TransactionTag.tag_id, func.count(TransactionTag.tag_id))
            .where(TransactionTag.tag_id.in_(tag_ids))
            .group_by(TransactionTag.tag_id)
        ).all()
    }
    return sorted((TagResponse(id=t.id, name=t.name, count=counts.get(t.id, 0)) for t in tags), key=lambda r: -r.count)


def create_tag(session: Session, user_id: int, body: TagCreate) -> TagResponse:
    tag = Tag(name=body.name, user_id=user_id)
    session.add(tag)
    session.commit()
    session.refresh(tag)
    return TagResponse(id=tag.id, name=tag.name)


def rename_tag(session: Session, tag_id: int, body: TagUpdate) -> TagResponse:
    tag = session.get(Tag, tag_id)
    if tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")
    tag.name = body.name
    session.add(tag)
    session.commit()
    session.refresh(tag)
    return TagResponse(id=tag.id, name=tag.name)


def delete_tag(session: Session, tag_id: int) -> None:
    tag = session.get(Tag, tag_id)
    if tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")
    session.exec(delete(TransactionTag).where(TransactionTag.tag_id == tag_id))
    session.delete(tag)
    session.commit()


def get_transaction_tags(session: Session, transaction_id: int) -> list[TransactionTagResponse]:
    transaction = session.get(Transaction, transaction_id)
    if transaction is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return [TransactionTagResponse(tag_id=tag.id, tag_name=tag.name) for tag in (transaction.tags or [])]


def set_transaction_tags(session: Session, transaction_id: int, tag_ids: list[int]) -> list[TransactionTagResponse]:
    transaction = session.get(Transaction, transaction_id)
    if transaction is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    session.exec(delete(TransactionTag).where(TransactionTag.transaction_id == transaction_id))
    for tag_id in tag_ids:
        tag = session.get(Tag, tag_id)
        if tag is None:
            raise HTTPException(status_code=404, detail=f"Tag {tag_id} not found")
        session.add(TransactionTag(transaction_id=transaction_id, tag_id=tag_id))
    session.commit()
    session.refresh(transaction)
    return [TransactionTagResponse(tag_id=tag.id, tag_name=tag.name) for tag in (transaction.tags or [])]


# ── Batch tag services ─────────────────────────────────────────────────────


def batch_add_tags(session: Session, body: BatchTagAddRequest) -> dict[str, int]:
    added = 0
    for tx_id in body.transaction_ids:
        existing = {
            row.tag_id for row in session.exec(select(TransactionTag).where(TransactionTag.transaction_id == tx_id))
        }
        for tag_id in body.tag_ids:
            if tag_id not in existing:
                session.add(TransactionTag(transaction_id=tx_id, tag_id=tag_id))
                added += 1
    session.commit()
    return {"added": added}


def batch_remove_tags(session: Session, body: BatchTagRemoveRequest) -> dict[str, int]:
    removed = 0
    for tag_id in body.tag_ids:
        result = session.exec(
            delete(TransactionTag).where(
                TransactionTag.transaction_id.in_(body.transaction_ids),
                TransactionTag.tag_id == tag_id,
            )
        )
        removed += result.rowcount
    session.commit()
    return {"removed": removed}


# ── Auto-tag rule services ─────────────────────────────────────────────────


def list_auto_tag_rules(session: Session, user_id: int) -> list[AutoTagRuleResponse]:
    rules = session.exec(select(AutoTagRule).where(AutoTagRule.user_id == user_id)).all()
    tag_ids = [r.tag_id for r in rules]
    tags = {}
    if tag_ids:
        for t in session.exec(select(Tag).where(Tag.id.in_(tag_ids))).all():
            tags[t.id] = t.name
    return [
        AutoTagRuleResponse(
            id=r.id,
            field=r.field,
            match_type=r.match_type,
            pattern=r.pattern,
            tag_id=r.tag_id,
            tag_name=tags.get(r.tag_id, ""),
        )
        for r in rules
    ]


def create_auto_tag_rule(session: Session, user_id: int, body: AutoTagRuleCreate) -> AutoTagRuleResponse:
    tag = session.get(Tag, body.tag_id)
    if tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")
    rule = AutoTagRule(
        field=body.field,
        match_type=body.match_type,
        pattern=body.pattern,
        tag_id=body.tag_id,
        user_id=user_id,
    )
    session.add(rule)
    session.commit()
    session.refresh(rule)
    return AutoTagRuleResponse(
        id=rule.id,
        field=rule.field,
        match_type=rule.match_type,
        pattern=rule.pattern,
        tag_id=rule.tag_id,
        tag_name=tag.name,
    )


def update_auto_tag_rule(session: Session, rule_id: int, body: AutoTagRuleUpdate) -> AutoTagRuleResponse:
    rule = session.get(AutoTagRule, rule_id)
    if rule is None:
        raise HTTPException(status_code=404, detail="Auto-tag rule not found")
    if body.field is not None:
        rule.field = body.field
    if body.match_type is not None:
        rule.match_type = body.match_type
    if body.pattern is not None:
        rule.pattern = body.pattern
    if body.tag_id is not None:
        tag = session.get(Tag, body.tag_id)
        if tag is None:
            raise HTTPException(status_code=404, detail="Tag not found")
        rule.tag_id = body.tag_id
    session.add(rule)
    session.commit()
    session.refresh(rule)
    tag = session.get(Tag, rule.tag_id)
    return AutoTagRuleResponse(
        id=rule.id,
        field=rule.field,
        match_type=rule.match_type,
        pattern=rule.pattern,
        tag_id=rule.tag_id,
        tag_name=tag.name if tag else "",
    )


def delete_auto_tag_rule(session: Session, rule_id: int) -> None:
    rule = session.get(AutoTagRule, rule_id)
    if rule is None:
        raise HTTPException(status_code=404, detail="Auto-tag rule not found")
    session.delete(rule)
    session.commit()


def apply_auto_tag_rule(session: Session, rule_id: int, user_id: int) -> ApplyResult:
    rule = session.get(AutoTagRule, rule_id)
    if rule is None:
        raise HTTPException(status_code=404, detail="Auto-tag rule not found")
    transactions = session.exec(select(Transaction).where(Transaction.user_id == user_id)).all()
    matched = 0
    updated = 0
    for t in transactions:
        if _match_rule(t, rule) and t.id is not None:
            matched += 1
            existing = {
                row.tag_id for row in session.exec(select(TransactionTag).where(TransactionTag.transaction_id == t.id))
            }
            if rule.tag_id not in existing:
                session.add(TransactionTag(transaction_id=t.id, tag_id=rule.tag_id))
                updated += 1
    session.commit()
    return ApplyResult(matched=matched, updated=updated)


# ── Transaction note services ──────────────────────────────────────────────


def get_transaction_note(session: Session, source: str, order_no: str, user_id: int) -> TransactionNoteResponse | None:
    note = session.get(TransactionNote, (source, order_no, user_id))
    if note is None:
        return None
    return TransactionNoteResponse(source=note.source, order_no=note.order_no, remark=note.remark)


def upsert_transaction_note(session: Session, body: TransactionNoteUpsert, user_id: int) -> TransactionNoteResponse:
    note = session.get(TransactionNote, (body.source, body.order_no, user_id))
    if note is None:
        note = TransactionNote(source=body.source, order_no=body.order_no, user_id=user_id)
        session.add(note)
    note.remark = body.remark
    session.commit()
    session.refresh(note)
    return TransactionNoteResponse(source=note.source, order_no=note.order_no, remark=note.remark)


def delete_transaction_note(session: Session, source: str, order_no: str, user_id: int) -> None:
    note = session.get(TransactionNote, (source, order_no, user_id))
    if note is None:
        raise HTTPException(status_code=404, detail="Transaction note not found")
    session.delete(note)
    session.commit()


def apply_auto_tags(session: Session, user_id: int) -> ApplyResult:
    rules = session.exec(select(AutoTagRule).where(AutoTagRule.user_id == user_id)).all()
    if not rules:
        return ApplyResult(matched=0, updated=0)
    transactions = session.exec(select(Transaction).where(Transaction.user_id == user_id)).all()
    matched = 0
    updated = 0
    for t in transactions:
        matched_tag_ids = [rule.tag_id for rule in rules if _match_rule(t, rule)]
        if matched_tag_ids and t.id is not None:
            matched += 1
            existing = {
                row.tag_id for row in session.exec(select(TransactionTag).where(TransactionTag.transaction_id == t.id))
            }
            for tag_id in matched_tag_ids:
                if tag_id not in existing:
                    session.add(TransactionTag(transaction_id=t.id, tag_id=tag_id))
                    updated += 1
    session.commit()
    return ApplyResult(matched=matched, updated=updated)


def backup_database() -> dict[str, str]:
    db_path = Path(app_settings.db_path).resolve()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_name = f"{db_path.stem}_{timestamp}{db_path.suffix}"
    backup_path = db_path.parent / backup_name
    shutil.copy2(str(db_path), str(backup_path))
    logger.info("Database backed up to %s", backup_path)
    return {"path": str(backup_path)}


def list_backups() -> list[dict[str, str]]:
    db_path = Path(app_settings.db_path).resolve()
    pattern = f"{db_path.stem}_*{db_path.suffix}"
    backups = []
    for f in sorted(db_path.parent.glob(pattern), reverse=True):
        backups.append({"name": f.name, "size": str(f.stat().st_size), "mtime": str(int(f.stat().st_mtime))})
    return backups


def delete_backup(filename: str) -> None:
    db_path = Path(app_settings.db_path).resolve()
    if filename == db_path.name:
        raise HTTPException(status_code=400, detail="Cannot delete the current database")
    backup_path = db_path.parent / filename
    if not backup_path.exists():
        raise HTTPException(status_code=404, detail="Backup file not found")
    backup_path.unlink()
    logger.info("Backup deleted: %s", backup_path)


# ── Tag trend services ────────────────────────────────────────────────────


def tag_trend(session: Session, user_id: int, req: TagTrendRequest) -> list[TagTrendResponse]:
    time_fmt = _TIME_FMTS.get(req.period)
    if not time_fmt:
        raise HTTPException(status_code=400, detail="Invalid period")

    results: list[TagTrendResponse] = []
    for tag_id in req.tag_ids:
        tag = session.get(Tag, tag_id)
        if tag is None:
            continue

        stmt = (
            select(
                func.strftime(time_fmt, Transaction.time).label("period"),
                func.sum(Transaction.amount).label("total"),
            )
            .join(TransactionTag, TransactionTag.transaction_id == Transaction.id)
            .where(
                Transaction.user_id == user_id,
                TransactionTag.tag_id == tag_id,
                Transaction.in_out == req.in_out,
                Transaction.time.is_not(None),
                Transaction.time != "",
            )
            .group_by("period")
            .order_by("period")
        )
        rows = session.execute(stmt).all()
        results.append(
            TagTrendResponse(
                tag_id=tag_id,
                tag_name=tag.name,
                data=[TagTrendItem(period=r.period, amount=r.total or 0) for r in rows],
            )
        )
    return results


def tag_query(session: Session, user_id: int, req: TagQueryRequest) -> list[SpendingRecord]:
    time_fmt = _TIME_FMTS.get(req.period)
    if not time_fmt:
        raise HTTPException(status_code=400, detail="Invalid period")

    stmt = (
        select(Transaction)
        .join(TransactionTag, TransactionTag.transaction_id == Transaction.id)
        .where(
            Transaction.user_id == user_id,
            TransactionTag.tag_id == req.tag_id,
            func.strftime(time_fmt, Transaction.time) == req.key,
            Transaction.in_out == req.in_out,
        )
        .distinct()
        .order_by(Transaction.time)
    )
    rows = session.exec(stmt).all()

    keys = [(t.source, t.order_no or "", user_id) for t in rows if t.order_no]
    notes = {}
    if keys:
        for note in session.exec(
            select(TransactionNote).where(
                tuple_(TransactionNote.source, TransactionNote.order_no, TransactionNote.user_id).in_(keys)
            )
        ).all():
            notes[(note.source, note.order_no)] = note.remark

    return [
        SpendingRecord(
            id=t.id,
            csvType=t.source,
            no=t.order_no,
            opposite=t.opposite,
            amount=f"{t.amount / 100:.2f}",
            time=t.time,
            status=t.status or "",
            refund="",
            product=t.product or "",
            type_=t.type_ or "",
            tags=[TransactionTagResponse(tag_id=tag.id, tag_name=tag.name) for tag in (t.tags or [])],
            remark=notes.get((t.source, t.order_no or ""), ""),
        )
        for t in rows
    ]
