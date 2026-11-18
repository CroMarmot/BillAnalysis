import os

from bill_analysis.api.models import WechatRecord
from bill_analysis.wechat_parser import parse_wechat_xlsx

MOCK_FILE = os.path.join(os.path.dirname(__file__), "..", "mock", "微信支付mock.xlsx")


def test_parse_wechat_xlsx_returns_correct_count() -> None:
    records = parse_wechat_xlsx(MOCK_FILE)
    assert len(records) == 37, f"Expected 37 records, got {len(records)}"


def test_parse_wechat_xlsx_types() -> None:
    records = parse_wechat_xlsx(MOCK_FILE)
    for r in records:
        assert isinstance(r, WechatRecord)
        assert isinstance(r.time, str)
        assert isinstance(r.type_, str)
        assert isinstance(r.oppo, str)
        assert isinstance(r.prod, str)
        assert isinstance(r.io, str)
        assert isinstance(r.amount, int)
        assert isinstance(r.source, str)
        assert isinstance(r.stat, str)
        assert isinstance(r.no, str)
        assert isinstance(r.subno, str)
        assert isinstance(r.note, str)


def test_parse_wechat_xlsx_order_numbers_masked() -> None:
    records = parse_wechat_xlsx(MOCK_FILE)
    for r in records:
        assert len(r.no) > 5, f"Order no too short: {r.no}"
        assert r.no.endswith("00000"), f"Order no not masked: {r.no}"
        if r.subno and r.subno != "/":
            assert r.subno.endswith("00000"), f"Subno not masked: {r.subno}"


def test_parse_wechat_xlsx_amounts() -> None:
    records = parse_wechat_xlsx(MOCK_FILE)
    for r in records:
        assert r.amount > 0, f"Amount should be positive: {r.amount}"
        assert r.io in ("收入", "支出"), f"Unexpected io value: {r.io}"


def test_parse_wechat_xlsx_first_record() -> None:
    records = parse_wechat_xlsx(MOCK_FILE)
    r = records[0]
    assert r.time == "2026-07-15 05:50:13"
    assert r.type_ == "其他"
    assert r.io == "收入"
    assert r.amount == 30  # 0.30 元 = 30 分
    assert r.stat == "已到账"
