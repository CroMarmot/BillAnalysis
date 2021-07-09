import csv
import os
import json
import sqlite3
from datetime import datetime


recordLen = 17
TABLE_IGNORE = "alipay_ignore_table"

"""
{
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
}

"""


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


class AlipayAnalysis:
    def __init__(self, file_path, ignore_set) -> None:
        self.data_mem = []
        self.ignore_set = ignore_set

        self.csv2mem(file_path)

    def full_list(self):
        jsonArr = []
        for row in self.data_mem:
            obj = {}
            for i in range(recordLen):
                obj[head[i]] = row[i]
            jsonArr.append(obj)
        return jsonArr

    def csv2mem(self, file_path):
        self.data_mem = []
        with open(file_path) as csvfile:
            spamreader = csv.reader(csvfile)
            head = None
            for row in spamreader:
                if len(row) != recordLen:
                    continue
                if head == None:
                    # 最后一个是空格
                    head = [x.strip().strip('\t') for x in row[:-1]]
                    continue
                self.data_mem.append([x.strip().strip("\t") for x in row[:-1]])
        self.data_mem.reverse()

    def month(self):
        month = {}
        for row in self.data_mem:
            # 创建时间 支付时间可能为空
            dateobj = datetime.strptime(row[2], "%Y-%m-%d %H:%M:%S")
            no = row[0]
            amount = row[9]
            refund = row[13]
            in_out = row[10]
            month_str = "{0:%Y-%m}".format(dateobj)
            if no in self.ignore_set:
                continue

            if month_str not in month:
                month[month_str] = {
                    "in_cnt": 0,
                    "out_cnt": 0
                }
            if in_out == '支出':
                month[month_str]["out_cnt"] += round(100 *
                                                     (float(amount) - float(refund)))
            else:  # 收入
                month[month_str]["in_cnt"] += round(100*float(amount))
        return month

    def month_query(self, queryData):
        # 默认查询支出
        if "in_out" not in queryData:
            queryData["in_out"] = "支出"

        month_result = []
        for row in self.data_mem:
            # 创建时间 支付时间可能为空
            dateobj = datetime.strptime(row[2], "%Y-%m-%d %H:%M:%S")
            no = row[0]
            in_out = row[10]
            month_str = "{0:%Y-%m}".format(dateobj)
            if no in self.ignore_set:
                continue

            if month_str != queryData["key"]:
                continue

            if in_out != queryData["in_out"]:
                continue

            month_result.append(row)
        return month_result

    def week(self):
        week = {}
        for row in self.data_mem:
            # 创建时间 支付时间可能为空
            dateobj = datetime.strptime(row[2], "%Y-%m-%d %H:%M:%S")
            no = row[0]
            amount = row[9]
            refund = row[13]
            in_out = row[10]
            week_str = "{0:%Y-%W}".format(dateobj)
            if no in self.ignore_set:
                continue

            if week_str not in week:
                week[week_str] = {
                    "in_cnt": 0,
                    "out_cnt": 0
                }
            if in_out == '支出':
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
            dateobj = datetime.strptime(row[2], "%Y-%m-%d %H:%M:%S")
            no = row[0]
            in_out = row[10]
            week_str = "{0:%Y-%W}".format(dateobj)
            if no in self.ignore_set:
                continue

            if week_str != queryData["key"]:
                continue

            if in_out != queryData["in_out"]:
                continue

            week_result.append(row)
        return week_result

    def ignore_list(self, queryData):
        # 默认查询支出
        if "in_out" not in queryData:
            queryData["in_out"] = "支出"

        result = []
        for row in self.data_mem:
            dateobj = datetime.strptime(row[2], "%Y-%m-%d %H:%M:%S")
            no = row[0]
            in_out = row[10]
            if no not in self.ignore_set:
                continue

            if in_out != queryData["in_out"]:
                continue

            result.append(row)

        return result
