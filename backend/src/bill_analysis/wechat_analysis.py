import csv
import os
import json
import sqlite3
import logging
from datetime import datetime


recordLen = 11
TABLE_IGNORE = "wechat_ignore_table"

"""
交易时间 0
交易类型 1
交易对方 2
商品 3
收/支 4
金额(元) 5
支付方式 6
当前状态 7
交易单号 8
商户单号 9
备注 10
"""

Wechat = 'Wechat'


class IgnoreSet:
    def __init__(self, db_path) -> None:
        con = sqlite3.connect(db_path)
        cur = con.cursor()
        cur.execute("CREATE TABLE IF NOT EXISTS " +
                    TABLE_IGNORE + " (ignore_no text primary key)")
        cur.execute("SELECT ignore_no from " + TABLE_IGNORE + "")
        ignore_list = cur.fetchall()
        con.commit()
        con.close()
        self.ignore_set = set()
        for row in ignore_list:
            self.ignore_set.add(row[0])


class WechatAnalysis:
    def __init__(self, file_path, ignore_set) -> None:
        self.data_mem = []
        self.ignore_set = ignore_set

        self.csv2mem(file_path)

    def in_out_check(self, row, compare_txt):
        return row[4] == compare_txt

    def is_spending(self, row):
        return self.in_out_check(row, '支出')

    def get_no(self, row):
        return row[8]

    def get_time_str(self, row):
        return row[0]

    def get_time(self, row):
        return datetime.strptime(self.get_time_str(row), "%Y-%m-%d %H:%M:%S")

    def get_amount(self, row):
        # ¥14.00
        return row[5][1:]

    # check if it is Wechat
    @staticmethod
    def csvType(file_path):
        with open(file_path) as csvfile:
            spamreader = csv.reader(csvfile)
            for row in spamreader:
                # first line
                return "微信" in row[0]
        return False

    def row2api(self, row):
        return {
            "csvType": Wechat,
            "no": self.get_no(row),
            "opposite": row[2],
            "amount": self.get_amount(row),
            "time": self.get_time_str(row),
            "status": '',  # ??
            "refund": '',  # ??
        }

    def full_list(self):
        jsonArr = []
        for row in self.data_mem:
            obj = {}
            for i in range(recordLen):
                obj[head[i]] = row[i]
            jsonArr.append(obj)
        return jsonArr

    def csv2mem(self, file_path):
        if not WechatAnalysis.csvType(file_path):
            logging.error("Not a Wechat csv or encode error:", file_path)
            return
        self.data_mem = []
        with open(file_path) as csvfile:
            spamreader = csv.reader(csvfile)
            head = None
            for row in spamreader:
                if len(row) != recordLen:
                    continue
                if head == None:
                    head = [x.strip().strip('\t') for x in row]
                    continue
                self.data_mem.append([x.strip().strip("\t") for x in row])
        self.data_mem.reverse()

    def month(self):
        month = {}
        for row in self.data_mem:
            # 创建时间 支付时间可能为空
            dateobj = self.get_time(row)
            amount = self.get_amount(row)
            refund = 0  # TODO ? wechat support ??
            month_str = "{0:%Y-%m}".format(dateobj)
            if self.get_no(row) in self.ignore_set:
                continue

            if month_str not in month:
                month[month_str] = {
                    "in_cnt": 0,
                    "out_cnt": 0
                }
            if self.is_spending(row):
                month[month_str]["out_cnt"] += round(100 *
                                                     (float(amount) - float(refund)))
            else:  # 收入 或 其它
                month[month_str]["in_cnt"] += round(100*float(amount))
        return month

    def month_query(self, queryData):
        # 默认查询支出
        # TODO 不要修改引用 ? 不同数据源的整合
        if "in_out" not in queryData:
            queryData["in_out"] = "支出"

        month_result = []
        for row in self.data_mem:
            # 创建时间 支付时间可能为空
            dateobj = self.get_time(row)
            month_str = "{0:%Y-%m}".format(dateobj)
            if self.get_no(row) in self.ignore_set:
                continue

            if month_str != queryData["key"]:
                continue

            if not self.in_out_check(row, queryData["in_out"]):
                continue

            month_result.append(self.row2api(row))
        return month_result

    def week(self):
        week = {}
        for row in self.data_mem:
            # 创建时间 支付时间可能为空
            dateobj = self.get_time(row)
            amount = self.get_amount(row)
            refund = 0  # TODO wechat support ?
            week_str = "{0:%Y-%W}".format(dateobj)
            if self.get_no(row) in self.ignore_set:
                continue

            if week_str not in week:
                week[week_str] = {
                    "in_cnt": 0,
                    "out_cnt": 0
                }
            if self.is_spending(row):
                week[week_str]["out_cnt"] += round(100 *
                                                   (float(amount)-float(refund)))
            else:  # 收入
                week[week_str]["in_cnt"] += round(100*float(amount))
        return week

    def week_query(self, queryData):
        # 默认查询支出
        if "in_out" not in queryData:
            queryData["in_out"] = "支出"
        week_result = []
        for row in self.data_mem:
            # 创建时间 支付时间可能为空
            dateobj = self.get_time(row)
            week_str = "{0:%Y-%W}".format(dateobj)
            if self.get_no(row) in self.ignore_set:
                continue

            if week_str != queryData["key"]:
                continue

            if not self.in_out_check(row, queryData["in_out"]):
                continue

            week_result.append(self.row2api(row))
        return week_result

    def ignore_list(self, queryData):
        # 默认查询支出
        if "in_out" not in queryData:
            queryData["in_out"] = "支出"

        result = []
        for row in self.data_mem:
            if self.get_no(row) not in self.ignore_set:
                continue

            if not self.in_out_check(row, queryData["in_out"]):
                continue

            result.append(self.row2api(row))

        return result


class WechatAnalysisGroup:
    wechat_groups = {}

    def __init__(self, db_path) -> None:
        self.db_path = db_path
        self.ig_set = IgnoreSet(db_path)

    def add_file(self, filename, upload_path):
        self.wechat_groups[filename] = WechatAnalysis(
            upload_path, self.ig_set.ignore_set)

    def get_groups(self):
        result = []
        for k in self.wechat_groups:
            result.append({
                "name": k,
                "type": Wechat
            })
        return result

    def get_ignore_list(self, queryData):
        result = []
        for key in self.wechat_groups:
            wechat_ins = self.wechat_groups[key]
            ins_result = wechat_ins.ignore_list(queryData)
            # TODO merge instead of append
            result += ins_result

        return result

    def get_week(self):
        week = {}
        for key in self.wechat_groups:
            wechat_ins = self.wechat_groups[key]
            ins_week = wechat_ins.week()
            # TODO merge instead of replace
            for k in ins_week:
                week[k] = ins_week[k]

        return week

    def week_query(self, queryData):
        result = []

        for key in self.wechat_groups:
            wechat_ins = self.wechat_groups[key]
            ins_result = wechat_ins.week_query(queryData)
            # TODO merge instead of replace
            result += ins_result

        return result

    def get_month(self):
        month = {}
        for key in self.wechat_groups:
            wechat_ins = self.wechat_groups[key]
            ins_month = wechat_ins.month()
            # TODO merge instead of replace
            for k in ins_month:
                month[k] = ins_month[k]

        return month

    def month_query(self, queryData):
        result = []

        for key in self.wechat_groups:
            wechat_ins = self.wechat_groups[key]
            ins_result = wechat_ins.month_query(queryData)
            # TODO merge instead of replace
            result += ins_result
        return result

    def ignore_no(self, queryData):
        ignore_set = self.ig_set.ignore_set
        op = queryData["op"]
        if op == 'append':
            con = sqlite3.connect(self.db_path)
            cur = con.cursor()
            ignore_set.add(queryData["no"])
            # TODO duplicate insert
            cur.execute(
                f"insert into {TABLE_IGNORE} values ('{queryData['no']}')")
            con.commit()
            con.close()
        elif op == "remove":
            if queryData["no"] not in ignore_set:
                return False
            con = sqlite3.connect(self.db_path)
            cur = con.cursor()
            ignore_set.remove(queryData["no"])
            # TODO duplicate insert
            cur.execute(
                f"DELETE FROM {TABLE_IGNORE} WHERE ignore_no ='{queryData['no']}' ")

            con.commit()
            con.close()
        else:
            return False
        return True
