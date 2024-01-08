import csv
import logging
import os
import sqlite3
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List

logger = logging.getLogger("bill_analysis.wechat")
logger.setLevel(logging.DEBUG)
record_len = 11

Wechat = "Wechat"


def parse_zh_time(t: str) -> datetime:
    return datetime.strptime(t + "+08:00", "%Y-%m-%d %H:%M:%S%z")


class IgnoreSet:
    def __init__(self, db_path) -> None:
        con = sqlite3.connect(db_path)
        cur = con.cursor()
        # 记录no
        cur.execute("CREATE TABLE IF NOT EXISTS wechat_ignore_table (ignore_no text primary key)")
        cur.execute("SELECT ignore_no from wechat_ignore_table")
        ignore_list = cur.fetchall()
        con.commit()
        con.close()
        self.ignore_set = set()
        for row in ignore_list:
            self.ignore_set.add(row[0])


@dataclass
class DataRow:
    time: str  #  交易时间 0
    type_: str  # 交易类型 1
    oppo: str  # 交易对方 2
    prod: str  # 商品 3
    io: str  # 收/支 4
    amount: int  # 金额(元) 5 * 100
    source: str  # 支付方式 6
    stat: str  # 当前状态 7
    no: str  # 交易单号 8
    subno: str  # 商户单号 9
    note: str  # 备注 10
    filename: str  # 文件名


@dataclass
class FileMeta:
    name: str
    record_cnt: int


# 单条记录
@dataclass
class SingleResult:
    amount: str  # * 100
    io: str
    no: str
    oppo: str
    prod: str
    time: str


@dataclass
class WeekListResult:
    yearweek: str
    amount: str  # * 100
    io: str


@dataclass
class MonthListResult:
    yearmonth: str
    amount: str  # * 100
    io: str


@dataclass
class YearListResult:
    year: str
    amount: str  # * 100
    io: str


class WeChatDataDBHelper:
    db_path = ""

    def __init__(self, db_path) -> None:
        self.db_path = db_path
        con = sqlite3.connect(db_path)
        cur = con.cursor()
        # 一个数据可能出现在多个文件中, 一个文件中no互不重复
        # 这样删除文件时能保持重复的数据还在
        cur.execute(
            "CREATE TABLE IF NOT EXISTS wechat_data \
                (no text, time text, type text,oppo text,prod text,io text,\
                    amount INTEGER,source text,stat text,subno text,note text,filename text,\
                    PRIMARY KEY (no, filename) )"
        )
        con.commit()
        con.close()

    def insert(self, arr: List[DataRow]) -> None:
        con = sqlite3.connect(self.db_path)
        cur = con.cursor()
        for row in arr:
            cur.execute(
                "INSERT OR REPLACE INTO wechat_data \
                    (no, time, type,oppo,prod,io,amount,source,stat,subno,note,filename) \
                    VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
                [
                    row.no,
                    row.time,
                    row.type_,
                    row.oppo,
                    row.prod,
                    row.io,
                    row.amount,
                    row.source,
                    row.stat,
                    row.subno,
                    row.note,
                    row.filename,
                ],
            )
        con.commit()
        con.close()

    def parse_csv(self, csv_file_path: str, filename: str) -> List[DataRow]:
        """
        :params file_path where file locate
        :params filename 'key'
        """
        arr: List[DataRow] = []
        with open(csv_file_path) as csvfile:
            spamreader = csv.reader(csvfile)
            head = None
            for row in spamreader:
                if len(row) != record_len:  # 忽略前面几行
                    continue
                if head is None:
                    head = [x.strip().strip("\t") for x in row]
                    continue
                r = [x.strip().strip("\t") for x in row]
                if r[5].startswith("¥"):
                    r[5] = r[5].replace("¥", "")

                arr.append(
                    DataRow(
                        time=r[0],  #  交易时间 0
                        type_=r[1],  # 交易类型 1
                        oppo=r[2],  # 交易对方 2
                        prod=r[3],  # 商品 3
                        io=r[4],  # 收/支 4
                        amount=int(float(r[5]) * 100),  # 金额(元) 5
                        source=r[6],  # 支付方式 6
                        stat=r[7],  # 当前状态 7
                        no=r[8],  # 交易单号 8
                        subno=r[9],  # 商户单号 9
                        note=r[10],  # 备注 10
                        filename=filename,  # 文件名
                    )
                )
        return arr

    def add_file(self, csv_file_path: str, filename: str) -> None:
        arr = self.parse_csv(csv_file_path, filename)
        self.insert(arr)

    def remove_file(self, filename: str) -> None:
        con = sqlite3.connect(self.db_path)
        cur = con.cursor()
        cur.execute("DELETE from wechat_data where filename=?;", [filename])
        rows = cur.fetchall()
        logger.debug(str(rows))
        con.commit()
        con.close()

    # 文件 和 记录数
    def file_list(self) -> List[FileMeta]:
        con = sqlite3.connect(self.db_path)
        cur = con.cursor()
        cur.execute("SELECT filename, count(*) FROM wechat_data GROUP BY filename;")
        rows = cur.fetchall()
        logger.debug(str(rows))
        return [FileMeta(name=row[0], record_cnt=int(row[1])) for row in rows]

    # 周总 收入 支出
    def week_list(self) -> List[WeekListResult]:
        con = sqlite3.connect(self.db_path)
        cur = con.cursor()
        cur.execute(
            'SELECT yw, io, sum(amount) from \
                    (select DISTINCT no, amount, io, strftime("%Y-%W", time) as yw from wechat_data) \
                    GROUP by yw,io;'
        )
        rows = cur.fetchall()
        return [WeekListResult(yearweek=row[0], io=row[1], amount=row[2]) for row in rows]

    # 单周查询
    def week_query(self, week_str: str, in_out: str) -> List[SingleResult]:
        con = sqlite3.connect(self.db_path)
        cur = con.cursor()
        cur.execute(
            'SELECT no, io, amount, oppo,prod,time from \
            (select DISTINCT no, amount, io, oppo,prod,time, strftime("%Y-%W", time) as ym from wechat_data)\
                  WHERE ym=? and io=?;',
            [week_str, in_out],
        )
        rows = cur.fetchall()
        return [
            SingleResult(no=row[0], io=row[1], amount=row[2], oppo=row[3], prod=row[4], time=row[5]) for row in rows
        ]

    # 月总 收入 支出
    def month_list(self) -> List[MonthListResult]:
        con = sqlite3.connect(self.db_path)
        cur = con.cursor()
        cur.execute(
            'SELECT ym, io, sum(amount) from \
                    (select DISTINCT no, amount, io, strftime("%Y-%m", time) as ym from wechat_data) \
                    GROUP by ym,io;'
        )
        rows = cur.fetchall()
        return [MonthListResult(yearmonth=row[0], io=row[1], amount=row[2]) for row in rows]

    # 单月查询
    def month_query(self, month_str: str, in_out: str) -> List[SingleResult]:
        con = sqlite3.connect(self.db_path)
        cur = con.cursor()
        cur.execute(
            'SELECT no, io, amount, oppo,prod,time from \
            (select DISTINCT no, amount, io, oppo,prod,time, strftime("%Y-%m", time) as ym from wechat_data)\
                  WHERE ym=? and io=?;',
            [month_str, in_out],
        )
        rows = cur.fetchall()
        return [
            SingleResult(no=row[0], io=row[1], amount=row[2], oppo=row[3], prod=row[4], time=row[5]) for row in rows
        ]

    # 年总 收入 支出
    def year_list(self) -> List[YearListResult]:
        con = sqlite3.connect(self.db_path)
        cur = con.cursor()
        cur.execute(
            'SELECT y, io, sum(amount) from \
                    (select DISTINCT no, amount, io, strftime("%Y", time) as y from wechat_data) \
                    GROUP by y,io;'
        )
        rows = cur.fetchall()
        return [YearListResult(year=row[0], io=row[1], amount=row[2]) for row in rows]

    # 年总查询
    def year_query(self, key_str: str, in_out: str) -> List[SingleResult]:
        con = sqlite3.connect(self.db_path)
        cur = con.cursor()
        cur.execute(
            'SELECT no, io, amount, oppo,prod,time from \
            (select DISTINCT no, amount, io, oppo,prod,time, strftime("%Y", time) as y from wechat_data)\
                  WHERE y=? and io=?;',
            [key_str, in_out],
        )
        rows = cur.fetchall()
        return [
            SingleResult(no=row[0], io=row[1], amount=row[2], oppo=row[3], prod=row[4], time=row[5]) for row in rows
        ]


class WechatAnalysis:
    def __init__(self, file_path: str, ignore_set) -> None:
        self.data_mem = []
        self.ignore_set = ignore_set

    def in_out_check(self, row, compare_txt):
        return row[4] == compare_txt

    def is_spending(self, row):
        return self.in_out_check(row, "支出")

    def get_no(self, row):
        return row[8]

    def get_time_str(self, row):
        return row[0]

    def get_time(self, row) -> datetime:
        return parse_zh_time(self.get_time_str(row))

    def get_amount(self, row):
        # ¥14.00
        return row[5][1:]

    # check if it is Wechat
    @staticmethod
    def is_csv(file_path):
        if file_path.lower().endswith(".csv"):
            try:
                with open(file_path) as csvfile:
                    spamreader = csv.reader(csvfile)
                    for row in spamreader:
                        # first line
                        return "微信" in row[0]
            except Exception as e:
                logger.exception(e)
                return False
        return False

    @staticmethod
    def is_zip_file(file_path):
        filename: str = os.path.split(file_path)[-1]
        return filename.startswith("微信支付账单") and filename.lower().endswith(".zip")

    def row2api(self, row):
        return {
            "csvType": Wechat,
            "no": self.get_no(row),
            "opposite": row[2],
            "amount": self.get_amount(row),
            "time": self.get_time_str(row),
            "status": "",  # ??
            "refund": "",  # ??
        }

    def ignore_list(self, query_data):
        # 默认查询支出
        if "in_out" not in query_data:
            query_data["in_out"] = "支出"

        result = []
        for row in self.data_mem:
            if self.get_no(row) not in self.ignore_set:
                continue

            if not self.in_out_check(row, query_data["in_out"]):
                continue

            result.append(self.row2api(row))

        return result


class WechatAnalysisGroup:
    wechat_groups: Dict[str, WechatAnalysis]

    def __init__(self, db_path) -> None:
        self.db_path = db_path
        self.ig_set = IgnoreSet(db_path)
        self.wechat_groups = {}
        self.db_helper = WeChatDataDBHelper(self.db_path)

    def add_file(self, filename: str, upload_path: str) -> None:
        self.db_helper.add_file(upload_path, filename)

    def remove_file(self, filename: str) -> None:
        self.db_helper.remove_file(filename)

    def get_groups(self):
        li = self.db_helper.file_list()
        return [{"name": o.name, "type": Wechat, "cnt": o.record_cnt} for o in li]

    def get_ignore_list(self, query_data):
        result = []
        for key in self.wechat_groups:
            wechat_ins = self.wechat_groups[key]
            ins_result = wechat_ins.ignore_list(query_data)
            # TODO merge instead of append
            result += ins_result

        return result

    def get_week(self):
        week = {}
        li = self.db_helper.week_list()
        for o in li:
            if o.yearweek not in week:
                week[o.yearweek] = {
                    "in_cnt": 0,
                    "out_cnt": 0,
                }
            if o.io == "收入":
                week[o.yearweek]["in_cnt"] = o.amount
            elif o.io == "支出":
                week[o.yearweek]["out_cnt"] = o.amount
            else:
                logger.error("Unkown io:" + o.io)
        return week

    def week_query(self, query_data):
        in_out = query_data["in_out"] if "in_out" in query_data else "支出"
        month_str = query_data["key"]
        li = self.db_helper.week_query(month_str, in_out)
        return [
            {
                "csvType": Wechat,
                "no": o.no,
                "opposite": o.oppo,
                "amount": f"{int(o.amount)/100:.2f}",
                "time": o.time,
                "status": "",  # ??
                "refund": "",  # ??
            }
            for o in li
        ]

    def get_year(self):
        year = {}
        li = self.db_helper.year_list()
        for o in li:
            if o.year not in year:
                year[o.year] = {
                    "in_cnt": 0,
                    "out_cnt": 0,
                }
            if o.io == "收入":
                year[o.year]["in_cnt"] = o.amount
            elif o.io == "支出":
                year[o.year]["out_cnt"] = o.amount
            else:
                logger.error("Unkown io:" + o.io)
        return year

    def year_query(self, query_data: Dict[str, str]):
        # in_out = query_data["in_out"] if "in_out" in query_data else "支出"
        in_out = query_data["in_out"] if "in_out" in query_data else "支出"
        key_str = query_data["key"]
        li = self.db_helper.year_query(key_str, in_out)
        return [
            {
                "csvType": Wechat,
                "no": o.no,
                "opposite": o.oppo,
                "amount": f"{int(o.amount)/100:.2f}",
                "time": o.time,
                "status": "",  # ??
                "refund": "",  # ??
            }
            for o in li
        ]

    def get_month(self):
        month = {}
        li = self.db_helper.month_list()
        for o in li:
            if o.yearmonth not in month:
                month[o.yearmonth] = {
                    "in_cnt": 0,
                    "out_cnt": 0,
                }
            if o.io == "收入":
                month[o.yearmonth]["in_cnt"] = o.amount
            elif o.io == "支出":
                month[o.yearmonth]["out_cnt"] = o.amount
            else:
                logger.error("Unkown io:" + o.io)
        return month

    def month_query(self, query_data: Dict[str, str]):
        # in_out = query_data["in_out"] if "in_out" in query_data else "支出"
        in_out = query_data["in_out"] if "in_out" in query_data else "支出"
        month_str = query_data["key"]
        li = self.db_helper.month_query(month_str, in_out)
        return [
            {
                "csvType": Wechat,
                "no": o.no,
                "opposite": o.oppo,
                "amount": f"{int(o.amount)/100:.2f}",
                "time": o.time,
                "status": "",  # ??
                "refund": "",  # ??
            }
            for o in li
        ]

    def ignore_no(self, query_data):
        return True
        # ignore_set = self.ig_set.ignore_set
        # op = query_data["op"]
        # if op == "append":
        #     con = sqlite3.connect(self.db_path)
        #     cur = con.cursor()
        #     ignore_set.add(query_data["no"])
        #     # TODO duplicate insert
        #     # TODO safe sql
        #     cur.execute(f"insert into wechat_ignore_table values ('{query_data['no']}')")
        #     con.commit()
        #     con.close()
        # elif op == "remove":
        #     if query_data["no"] not in ignore_set:
        #         return False
        #     con = sqlite3.connect(self.db_path)
        #     cur = con.cursor()
        #     ignore_set.remove(query_data["no"])
        #     # TODO duplicate insert
        #     # TODO safe sql
        #     cur.execute(f"DELETE FROM wechat_ignore_table WHERE ignore_no ='{query_data['no']}' ")

        #     con.commit()
        #     con.close()
        # else:
        #     return False
        # return True
