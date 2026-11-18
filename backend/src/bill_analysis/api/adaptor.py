from bill_analysis.api.db_models import Transaction
from bill_analysis.api.schemas import AlipayRecord, WechatRecord


def alipay_to_unified(
    records: list[AlipayRecord],
    filename: str,
    user_id: int,
) -> list[Transaction]:
    return [
        Transaction(
            source="Alipay",
            order_no=r.order_no,
            merchant_no=r.merchant_no,
            time=r.time,
            type_=r.category,
            opposite=r.opposite,
            product=r.product,
            in_out=r.in_out,
            amount=r.amount,
            method=r.method,
            status=r.status,
            note=r.note,
            filename=filename,
            user_id=user_id,
        )
        for r in records
    ]


def wechat_to_unified(
    records: list[WechatRecord],
    filename: str,
    user_id: int,
) -> list[Transaction]:
    return [
        Transaction(
            source="Wechat",
            order_no=r.no,
            merchant_no=r.subno,
            time=r.time,
            type_=r.type_,
            opposite=r.oppo,
            product=r.prod,
            in_out=r.io,
            amount=r.amount,
            method=r.source,
            status=r.stat,
            note=r.note,
            filename=filename,
            user_id=user_id,
        )
        for r in records
    ]
