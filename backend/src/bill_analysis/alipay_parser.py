import csv

from bill_analysis.api.models import AlipayRecord


def parse_alipay_csv(filepath: str) -> list[AlipayRecord]:
    """
    解析支付宝账单 CSV (UTF-8) 文件，返回 AlipayRecord 列表。

    支付宝账单 CSV 格式（新版 12 列）：
      前若干行为元信息（导出信息、时间范围等）
      表头行: 交易时间,交易分类,交易对方,对方账号,商品说明,收/支,金额,收/付款方式,交易状态,交易订单号,商家订单号,备注
      其后为数据行
    """
    records: list[AlipayRecord] = []
    header_found = False

    with open(filepath, newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        for row in reader:
            if not row:
                continue
            if not header_found:
                if row[0] == "交易时间":
                    header_found = True
                continue

            if len(row) < 10:
                continue
            time_str = row[0].strip()
            time_str = time_str.replace("/", "-")
            parts = time_str.split(" ")
            if len(parts) == 2:
                date_part = parts[0]
                time_part = parts[1]
                date_parts = date_part.split("-")
                date_parts = [p.zfill(2) if len(p) < 2 else p for p in date_parts]
                if len(date_parts) == 3:
                    date_part = "-".join(date_parts)
                time_parts = time_part.split(":")
                time_parts = [p.zfill(2) if len(p) < 2 else p for p in time_parts]
                while len(time_parts) < 3:
                    time_parts.append("00")
                time_part = ":".join(time_parts[:3])
                time_str = f"{date_part} {time_part}"
            if not time_str:
                continue

            category = row[1].strip() if len(row) > 1 else ""
            opposite = row[2].strip() if len(row) > 2 else ""
            account = row[3].strip() if len(row) > 3 else ""
            product = row[4].strip() if len(row) > 4 else ""
            in_out = row[5].strip() if len(row) > 5 else ""
            amount_str = row[6].strip() if len(row) > 6 else "0"
            method = row[7].strip() if len(row) > 7 else ""
            status = row[8].strip() if len(row) > 8 else ""
            order_no = row[9].strip() if len(row) > 9 else ""
            merchant_no = row[10].strip() if len(row) > 10 else ""
            note = row[11].strip() if len(row) > 11 else ""

            try:
                amount_fen = int(round(float(amount_str) * 100))
            except (ValueError, TypeError):
                amount_fen = 0

            records.append(
                AlipayRecord(
                    time=time_str,
                    category=category,
                    opposite=opposite,
                    account=account,
                    product=product,
                    in_out=in_out,
                    amount=amount_fen,
                    method=method,
                    status=status,
                    order_no=order_no,
                    merchant_no=merchant_no,
                    note=note,
                )
            )

    return records
