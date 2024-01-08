import csv
import logging
import sqlite3
from datetime import datetime
from typing import Dict

logger = logging.getLogger("bill_analysis.alipay")
record_len = 17
TABLE_IGNORE = "alipay_ignore_table"

"""
"交易号": "tradeNo",  # 0
"商家订单号": "outNo",  # 1
"交易创建时间": "createTime",  # 2
"付款时间": "payTime",  # 3
"最近修改时间": "modifyTime",  # 4
"交易来源地": "source",  # 5
"类型": "tradeType",  # 6
"交易对方": "opposite",  # 7
"商品名称": "productName",  # 8
"金额（元）": "amount",  # 9
"收/支": "in_out",  # 10
"交易状态": "trade_status",  # 11
"服务费（元）": "serviceFee",  # 12
"成功退款（元）": "successfulRefund",  # 13
"备注": "remark",  # 14
"资金状态": "fundState",  # 15
"""

Alipay = "Alipay"


class IgnoreSet:
    def __init__(self, db_path) -> None:
        con = sqlite3.connect(db_path)
        cur = con.cursor()
        cur.execute("CREATE TABLE IF NOT EXISTS " + TABLE_IGNORE + " (ignore_no text primary key)")
        cur.execute("SELECT ignore_no from " + TABLE_IGNORE + "")
        ignore_list = cur.fetchall()
        con.commit()
        con.close()
        self.ignore_set = set()
        for row in ignore_list:
            self.ignore_set.add(row[0])


class AlipayAnalysis:
    def __init__(self, file_path, ignore_set) -> None:
        self.data_mem = []
        self.ignore_set = ignore_set

        self.csv2mem(file_path)

    # check if it is Alipay
    @staticmethod
    def is_csv(file_path: str):
        if file_path.lower().endswith(".csv"):
            try:
                with open(file_path) as csvfile:
                    spamreader = csv.reader(csvfile)
                    for row in spamreader:
                        # first line
                        return row[0].startswith("支付宝")
            except Exception as e:
                logger.exception(e)
                return False
        return False

    def row2api(self, row):
        return {
            "csvType": Alipay,
            "no": row[0],
            "opposite": row[7],
            "amount": row[9],
            "time": row[2],
            "status": row[11],
            "refund": row[13],
        }

    def csv2mem(self, file_path):
        if not AlipayAnalysis.is_csv(file_path):
            logger.error("Not a Alipay csv or encode error:" + file_path)
            return
        self.data_mem = []
        with open(file_path) as csvfile:
            spamreader = csv.reader(csvfile)
            head = None
            for row in spamreader:
                if len(row) != record_len:
                    continue
                if head is None:
                    # 最后一个是空格
                    head = [x.strip().strip("\t") for x in row[:-1]]
                    continue
                self.data_mem.append([x.strip().strip("\t") for x in row[:-1]])
        self.data_mem.reverse()

    def month(self):
        month = {}
        for row in self.data_mem:
            # 创建时间 支付时间可能为空
            dateobj = datetime.strptime(row[2] + "+08:00", "%Y-%m-%d %H:%M:%S%z")
            no = row[0]
            amount = row[9]
            refund = row[13]
            in_out = row[10]
            month_str = f"{dateobj:%Y-%m}"
            if no in self.ignore_set:
                continue

            if month_str not in month:
                month[month_str] = {"in_cnt": 0, "out_cnt": 0}
            if in_out == "支出":
                month[month_str]["out_cnt"] += round(100 * (float(amount) - float(refund)))
            else:  # 收入
                month[month_str]["in_cnt"] += round(100 * float(amount))
        return month

    def month_query(self, query_data):
        # 默认查询支出
        if "in_out" not in query_data:
            query_data["in_out"] = "支出"

        month_result = []
        for row in self.data_mem:
            # 创建时间 支付时间可能为空
            dateobj = datetime.strptime(row[2] + "+08:00", "%Y-%m-%d %H:%M:%S%z")
            no = row[0]
            in_out = row[10]
            month_str = f"{dateobj:%Y-%m}"
            if no in self.ignore_set:
                continue

            if month_str != query_data["key"]:
                continue

            if in_out != query_data["in_out"]:
                continue

            month_result.append(self.row2api(row))
        return month_result

    def week(self):
        week = {}
        for row in self.data_mem:
            # 创建时间 支付时间可能为空
            dateobj = datetime.strptime(row[2] + "+08:00", "%Y-%m-%d %H:%M:%S%z")
            no = row[0]
            amount = row[9]
            refund = row[13]
            in_out = row[10]
            week_str = f"{dateobj:%Y-%W}"
            if no in self.ignore_set:
                continue

            if week_str not in week:
                week[week_str] = {"in_cnt": 0, "out_cnt": 0}
            if in_out == "支出":
                week[week_str]["out_cnt"] += round(100 * (float(amount) - float(refund)))
            else:  # 收入
                week[week_str]["in_cnt"] += round(100 * float(amount))
        return week

    def week_query(self, query_data):
        # 默认查询支出
        if "in_out" not in query_data:
            query_data["in_out"] = "支出"
        week_result = []
        for row in self.data_mem:
            # 创建时间 支付时间可能为空
            dateobj = datetime.strptime(row[2] + "+08:00", "%Y-%m-%d %H:%M:%S%z")
            no = row[0]
            in_out = row[10]
            week_str = f"{dateobj:%Y-%W}"
            if no in self.ignore_set:
                continue

            if week_str != query_data["key"]:
                continue

            if in_out != query_data["in_out"]:
                continue

            week_result.append(self.row2api(row))
        return week_result

    def ignore_list(self, query_data):
        # 默认查询支出
        if "in_out" not in query_data:
            query_data["in_out"] = "支出"

        result = []
        for row in self.data_mem:
            # dateobj = datetime.strptime(row[2]+"+08:00", "%Y-%m-%d %H:%M:%S%z")
            no = row[0]
            in_out = row[10]
            if no not in self.ignore_set:
                continue

            if in_out != query_data["in_out"]:
                continue

            result.append(self.row2api(row))

        return result


class AlipayAnalysisGroup:
    alipay_groups: Dict[str, AlipayAnalysis]

    def __init__(self, db_path) -> None:
        self.db_path = db_path
        self.ig_set = IgnoreSet(db_path)
        self.alipay_groups = {}

    def add_file(self, filename, upload_path):
        self.alipay_groups[filename] = AlipayAnalysis(upload_path, self.ig_set.ignore_set)

    def get_groups(self):
        result = []
        for k in self.alipay_groups:
            result.append({"name": k, "type": Alipay})
        return result

    def get_ignore_list(self, query_data):
        result = []
        for key in self.alipay_groups:
            alipay_ins = self.alipay_groups[key]
            ins_result = alipay_ins.ignore_list(query_data)
            # TODO merge instead of append
            result += ins_result

        return result

    def get_week(self):
        week = {}
        for key in self.alipay_groups:
            alipay_ins = self.alipay_groups[key]
            ins_week = alipay_ins.week()
            # TODO merge instead of replace
            for k in ins_week:
                week[k] = ins_week[k]

        return week

    def week_query(self, query_data):
        result = []

        for key in self.alipay_groups:
            alipay_ins = self.alipay_groups[key]
            ins_result = alipay_ins.week_query(query_data)
            # TODO merge instead of replace
            result += ins_result

        return result

    def get_month(self):
        month = {}
        for key in self.alipay_groups:
            alipay_ins = self.alipay_groups[key]
            ins_month = alipay_ins.month()
            # TODO merge instead of replace
            for k in ins_month:
                month[k] = ins_month[k]

        return month

    def month_query(self, query_data):
        result = []

        for key in self.alipay_groups:
            alipay_ins = self.alipay_groups[key]
            ins_result = alipay_ins.month_query(query_data)
            # TODO merge instead of replace
            result += ins_result
        return result

    def ignore_no(self, query_data):
        ignore_set = self.ig_set.ignore_set
        op = query_data["op"]
        if op == "append":
            con = sqlite3.connect(self.db_path)
            cur = con.cursor()
            ignore_set.add(query_data["no"])
            # TODO duplicate insert
            # TODO safe sql
            cur.execute(f"insert into {TABLE_IGNORE} values ('{query_data['no']}')")
            con.commit()
            con.close()
        elif op == "remove":
            if query_data["no"] not in ignore_set:
                return False
            con = sqlite3.connect(self.db_path)
            cur = con.cursor()
            ignore_set.remove(query_data["no"])
            # TODO duplicate insert
            # TODO safe sql
            cur.execute(f"DELETE FROM {TABLE_IGNORE} WHERE ignore_no ='{query_data['no']}' ")

            con.commit()
            con.close()
        else:
            return False
        return True
