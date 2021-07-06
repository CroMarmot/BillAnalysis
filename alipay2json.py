from flask import Flask, render_template
import argparse
import csv
import os
import json
import sqlite3
from datetime import datetime

app = Flask(__name__)

recordLen = 17
file_path = ""


@app.route("/")
def index():
    return render_template("index.html")


def csv2json(file_path):
    jsonArr = []
    with open(file_path) as csvfile:
        spamreader = csv.reader(csvfile)
        head = None
        for row in spamreader:
            if len(row) == recordLen:
                if head == None:
                    head = [x.strip() for x in row]
                else:
                    obj = {}
                    for i in range(recordLen):
                        if head[i] == '':
                            continue
                        obj[head[i]] = row[i].strip().strip('\t')
                    jsonArr.append(obj)
    return json.dumps(jsonArr, ensure_ascii=False)


def csv2json_file(file_path):
    json_data = csv2json(file_path)
    output_path = os.path.splitext(file_path)[0]+'.json'
    with open(output_path, 'w') as jsonFile:
        jsonFile.write(json_data)
        jsonFile.close()
    print("Done:"+output_path)


@app.route("/api/full")
def full():
    global file_path
    return csv2json(file_path)


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
    args = parser.parse_args()
    return args.filepath


def csv2sqlite(file_path):
    table_name = 'alipay'

    col_name = {
        "交易号": "tradeNo",
        "商家订单号": "outNo",
        "交易创建时间": "createTime",
        "付款时间": "payTime",
        "最近修改时间": "modifyTime",
        "交易来源地": "source",
        "类型": "tradeType",
        "交易对方": "opposite",
        "商品名称": "productName",
        "金额（元）": "amount",
        "收/支": "in_out",
        "交易状态": "trade_status",
        "服务费（元）": "serviceFee",
        "成功退款（元）": "successfulRefund",
        "备注": "remark",
        "资金状态": "fundState",
    }

    output_path = os.path.splitext(file_path)[0]+'.db'
    con = sqlite3.connect(output_path)
    cur = con.cursor()

    with open(file_path) as csvfile:
        spamreader = csv.reader(csvfile)
        head = None
        for row in spamreader:
            if len(row) == recordLen:
                if head == None:
                    # 最后一个是空格
                    head = [col_name[x.strip()] + " text" for x in row[:-1]]
                    execute_sql = "CREATE TABLE " + \
                        table_name + " (" + ",".join(head) + ")"
                    cur.execute(execute_sql)
                else:
                    cur.execute("insert into " + table_name + " values (" + ",".join(
                        ["?" for i in row[:-1]]) + ")", [x.strip().strip("\t") for x in row[:-1]])

    con.commit()
    con.close()
    print("Done:"+output_path)


@app.route("/api/month")
def month():
    global file_path
    month = {}
    with open(file_path) as csvfile:
        spamreader = csv.reader(csvfile)
        head = None
        for row in spamreader:
            if len(row) == recordLen:
                if head == None:
                    # 最后一个是空格
                    head = row[:-1]
                else:
                    row = [x.strip().strip('\t') for x in row[:-1]]
                    # 创建时间 支付时间可能为空
                    dateobj = datetime.strptime(row[2], "%Y-%m-%d %H:%M:%S")
                    opposite = row[7]
                    product_name = row[8]
                    amount = row[9]
                    in_out = row[10]
                    trade_status = row[11]
                    month_str = "{0:%Y-%m}".format(dateobj)
                    week_str = "{0:%Y-%W}".format(dateobj)

                    if month_str not in month:
                        month[month_str] = {
                            "in_cnt": 0,
                            "out_cnt": 0
                        }
                    if in_out == '支出':
                        month[month_str]["out_cnt"] += round(100*float(amount))
                    else:  # 收入
                        month[month_str]["in_cnt"] += round(100*float(amount))
    return json.dumps(month, ensure_ascii=False)


@app.route("/api/week")
def week():
    global file_path
    week = {}
    with open(file_path) as csvfile:
        spamreader = csv.reader(csvfile)
        head = None
        for row in spamreader:
            if len(row) == recordLen:
                if head == None:
                    # 最后一个是空格
                    head = row[:-1]
                else:
                    row = [x.strip().strip('\t') for x in row[:-1]]
                    # 创建时间 支付时间可能为空
                    dateobj = datetime.strptime(row[2], "%Y-%m-%d %H:%M:%S")
                    opposite = row[7]
                    product_name = row[8]
                    amount = row[9]
                    in_out = row[10]
                    trade_status = row[11]
                    month_str = "{0:%Y-%m}".format(dateobj)
                    week_str = "{0:%Y-%W}".format(dateobj)

                    if week_str not in week:
                        week[week_str] = {
                            "in_cnt": 0,
                            "out_cnt": 0
                        }
                    if in_out == '支出':
                        week[week_str]["out_cnt"] += round(100*float(amount))
                    else:  # 收入
                        week[week_str]["in_cnt"] += round(100*float(amount))
    return json.dumps(week, ensure_ascii=False)


def main():
    global file_path
    file_path = getFilePath()

    app.run()
    # csv2json_file(file_path)
    # # csv2sqlite(file_path)
    # csv2report(file_path)


if __name__ == "__main__":
    main()
