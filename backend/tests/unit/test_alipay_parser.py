import os

from bill_analysis.alipay_parser import parse_alipay_csv
from bill_analysis.api.models import AlipayRecord

MOCK_FILE = os.path.join(os.path.dirname(__file__), "..", "mock", "utf8_支付宝mock.csv")


def test_parse_alipay_csv_returns_correct_count() -> None:
    records = parse_alipay_csv(MOCK_FILE)
    assert len(records) == 4, f"Expected 4 records, got {len(records)}"


def test_parse_alipay_csv_types() -> None:
    records = parse_alipay_csv(MOCK_FILE)
    for r in records:
        assert isinstance(r, AlipayRecord)
        assert isinstance(r.time, str)
        assert isinstance(r.category, str)
        assert isinstance(r.opposite, str)
        assert isinstance(r.account, str)
        assert isinstance(r.product, str)
        assert isinstance(r.in_out, str)
        assert isinstance(r.amount, int)
        assert isinstance(r.method, str)
        assert isinstance(r.status, str)
        assert isinstance(r.order_no, str)
        assert isinstance(r.merchant_no, str)
        assert isinstance(r.note, str)


def test_parse_alipay_csv_order_numbers_masked() -> None:
    records = parse_alipay_csv(MOCK_FILE)
    for r in records:
        if r.order_no:
            assert len(r.order_no) > 5, f"Order no too short: {r.order_no}"
            assert r.order_no.endswith("00000"), f"Order no not masked: {r.order_no}"
        if r.merchant_no and r.merchant_no != "/":
            assert len(r.merchant_no) > 5, f"Merchant no too short: {r.merchant_no}"
            assert r.merchant_no.endswith("00000"), f"Merchant no not masked: {r.merchant_no}"


def test_parse_alipay_csv_in_out_valid() -> None:
    records = parse_alipay_csv(MOCK_FILE)
    for r in records:
        assert r.in_out in ("收入", "支出", "不计收支"), f"Unexpected in_out: {r.in_out}"


def test_parse_alipay_csv_amounts() -> None:
    records = parse_alipay_csv(MOCK_FILE)
    for r in records:
        assert r.amount >= 0, f"Amount should be non-negative: {r.amount}"


def test_parse_alipay_csv_first_expense_record() -> None:
    records = parse_alipay_csv(MOCK_FILE)
    expense_records = [r for r in records if r.in_out == "支出"]
    assert len(expense_records) == 1
    r = expense_records[0]
    assert r.time == "2026-07-16 04:27:00"
    assert r.category == "餐饮美食"
    assert r.amount == 2340  # 21.72 元 = 2172 分
    assert r.status == "交易成功"
