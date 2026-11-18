from datetime import datetime

from openpyxl import load_workbook

from bill_analysis.api.models import WechatRecord


def parse_wechat_xlsx(filepath: str) -> list[WechatRecord]:
    """
    解析微信账单 xlsx 文件，返回 WechatRecord 列表。

    微信账单 xlsx 结构：
      - 前若干行为元信息（昵称、时间范围等）
      - 第 18 行为表头: 交易时间, 交易类型, 交易对方, 商品, 收/支, 金额(元), 支付方式, 当前状态, 交易单号, 商户单号, 备注
      - 第 19 行起为数据行
    """
    wb = load_workbook(filepath)
    ws = wb.active
    if ws is None:
        raise ValueError(f"No active sheet in {filepath}")

    records: list[WechatRecord] = []

    for row in ws.iter_rows(min_row=1, values_only=True):
        # 跳过空行和非数据行：数据行第0列是 datetime 类型
        first = row[0]
        if not isinstance(first, datetime):
            continue

        time_val = first
        type_ = str(row[1] or "")
        oppo = str(row[2] or "")
        prod = str(row[3] or "")
        io = str(row[4] or "")
        amount_yuan = row[5]
        source = str(row[6] or "")
        stat = str(row[7] or "")
        no = str(row[8] or "")
        subno = str(row[9] or "") if row[9] is not None else ""
        note = str(row[10] or "")

        time_str = time_val.strftime("%Y-%m-%d %H:%M:%S")
        amount_fen = int(round(float(amount_yuan) * 100)) if amount_yuan is not None else 0

        records.append(
            WechatRecord(
                time=time_str,
                type_=type_,
                oppo=oppo,
                prod=prod,
                io=io,
                amount=amount_fen,
                source=source,
                stat=stat,
                no=no,
                subno=subno,
                note=note,
            )
        )

    return records
