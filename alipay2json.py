from flask import Flask, render_template, request
import argparse
import csv
import os
import json
import sqlite3
from datetime import datetime


app = Flask(__name__)

recordLen = 17
file_path = ""
db_path = ""
TABLE_IGNORE = "ignore_table"
data_mem = []
ignore_set = set()

col_name = {
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


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/full")
def api_full():
    global data_mem
    jsonArr = []
    for row in data_mem:
        obj = {}
        for i in range(recordLen):
            if head[i] == '':
                continue
            obj[head[i]] = row[i].strip().strip('\t')
        jsonArr.append(obj)
    return json.dumps(jsonArr, ensure_ascii=False)


# TODO
# feature:
# 查看月曲线
# 查看周曲线
# 查看月详情
# 查看周详情
# 标记忽略 / 取消忽略标记 / 查看忽略标记列表


def getFilePath():
    parser = argparse.ArgumentParser(description='转换Alipay的交易记录成json')
    parser.add_argument('filepath', help='filepath')
    parser.add_argument('db', help='db file path')
    args = parser.parse_args()
    return args.filepath, args.db


def csv2mem(file_path):
    global data_mem
    data_mem = []

    with open(file_path) as csvfile:
        spamreader = csv.reader(csvfile)
        head = None
        for row in spamreader:
            if len(row) == recordLen:
                if head == None:
                    # 最后一个是空格
                    head = [x.strip().strip('\t') for x in row[:-1]]
                else:
                    data_mem.append([x.strip().strip("\t") for x in row[:-1]])

    data_mem.reverse()


@app.route("/api/ignore_no", methods=["POST"])
def api_ignore_no():
    global db_path
    queryData = json.loads(request.get_data(as_text=True))
    op = queryData["op"]
    if op == 'append':
        con = sqlite3.connect(db_path)
        cur = con.cursor()
        ignore_set.add(queryData["no"])
        # TODO duplicate insert
        cur.execute(f"insert into {TABLE_IGNORE} values ('{queryData['no']}')")
        con.commit()
        con.close()
    elif op == "remove":
        if queryData["no"] in ignore_set:
            con = sqlite3.connect(db_path)
            cur = con.cursor()
            ignore_set.remove(queryData["no"])
            # TODO duplicate insert
            cur.execute(
                f"DELETE FROM {TABLE_IGNORE} WHERE ignore_no ='{queryData['no']}' ")

            con.commit()
            con.close()
        else:
            return json.dumps({"status": 418}, ensure_ascii=False), 418
    else:
        return json.dumps({"status": 418}, ensure_ascii=False), 418
    return json.dumps({"status": 200}, ensure_ascii=False)


@app.route("/api/month")
def api_month():
    month = {}
    global file_path, data_mem
    for row in data_mem:
        # 创建时间 支付时间可能为空
        dateobj = datetime.strptime(row[2], "%Y-%m-%d %H:%M:%S")
        no = row[0]
        amount = row[9]
        refund = row[13]
        in_out = row[10]
        month_str = "{0:%Y-%m}".format(dateobj)
        if no in ignore_set:
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
    return json.dumps(month, ensure_ascii=False)


@app.route("/api/month_query", methods=['POST'])
def api_month_query():
    queryData = json.loads(request.get_data(as_text=True))
    # 默认查询支出
    if "in_out" not in queryData:
        queryData["in_out"] = "支出"

    month_result = []
    global file_path, data_mem
    for row in data_mem:
        # 创建时间 支付时间可能为空
        dateobj = datetime.strptime(row[2], "%Y-%m-%d %H:%M:%S")
        no = row[0]
        in_out = row[10]
        month_str = "{0:%Y-%m}".format(dateobj)
        if no in ignore_set:
            continue

        if month_str != queryData["key"]:
            continue

        if in_out != queryData["in_out"]:
            continue

        month_result.append(row)
    return json.dumps(month_result, ensure_ascii=False)


@app.route("/api/week")
def api_week():
    week = {}
    global file_path, data_mem
    for row in data_mem:
        # 创建时间 支付时间可能为空
        dateobj = datetime.strptime(row[2], "%Y-%m-%d %H:%M:%S")
        no = row[0]
        amount = row[9]
        refund = row[13]
        in_out = row[10]
        week_str = "{0:%Y-%W}".format(dateobj)
        if no in ignore_set:
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
    return json.dumps(week, ensure_ascii=False)


@app.route("/api/week_query", methods=['POST'])
def api_week_query():
    queryData = json.loads(request.get_data(as_text=True))
    # 默认查询支出
    if "in_out" not in queryData:
        queryData["in_out"] = "支出"
    global file_path, data_mem
    week_result = []
    for row in data_mem:
        # 创建时间 支付时间可能为空
        dateobj = datetime.strptime(row[2], "%Y-%m-%d %H:%M:%S")
        no = row[0]
        in_out = row[10]
        week_str = "{0:%Y-%W}".format(dateobj)
        if no in ignore_set:
            continue

        if week_str != queryData["key"]:
            continue

        if in_out != queryData["in_out"]:
            continue

        week_result.append(row)
    return json.dumps(week_result, ensure_ascii=False)


@app.route("/api/ignore_list", methods=["POST"])
def api_ignore_list():
    global ignore_set, data_mem

    queryData = json.loads(request.get_data(as_text=True))
    # 默认查询支出
    if "in_out" not in queryData:
        queryData["in_out"] = "支出"

    result = []
    for row in data_mem:
        dateobj = datetime.strptime(row[2], "%Y-%m-%d %H:%M:%S")
        no = row[0]
        in_out = row[10]
        if no not in ignore_set:
            continue

        if in_out != queryData["in_out"]:
            continue

        result.append(row)
    return json.dumps(result, ensure_ascii=False)


def main():
    global file_path, db_path, ignore_set
    file_path, db_path = getFilePath()

    con = sqlite3.connect(db_path)
    cur = con.cursor()
    cur.execute("CREATE TABLE IF NOT EXISTS " +
                TABLE_IGNORE + " (ignore_no text primary key)")
    cur.execute("SELECT ignore_no from " + TABLE_IGNORE + "")
    ignore_list = cur.fetchall()
    con.commit()
    con.close()

    for row in ignore_list:
        ignore_set.add(row[0])

    csv2mem(file_path)

    app.run()


if __name__ == "__main__":
    main()
