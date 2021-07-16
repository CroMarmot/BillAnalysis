from flask.sessions import NullSession
from alipay_analysis import AlipayAnalysis, AlipayAnalysisGroup, IgnoreSet, TABLE_IGNORE
from flask import Flask, render_template, request
from flask_cors import CORS
import argparse
import csv
import os
import json
import sqlite3
from datetime import datetime

# TODO use logging

app = Flask(__name__)
# 不用cors的话 可以用nginx
CORS(app)

alipay_groups = {}
ig_set = None
Alipay = "Alipay"


tencent_groups = {}


fileTypes = {
    "Alipay": "Alipay",
    "Tencent": "Tencent"
}


def getFilePath():
    parser = argparse.ArgumentParser(description='处理Alipay的交易记录')
    parser.add_argument('db', help='db file path')
    args = parser.parse_args()
    return args.db


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


def ignore_no(queryData):
    global ig_set, db_path
    ignore_set = ig_set.ignore_set
    op = queryData["op"]
    if op == 'append':
        con = sqlite3.connect(db_path)
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
        con = sqlite3.connect(db_path)
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


@app.route("/api/ignore_no", methods=["POST"])
def api_ignore_no():
    queryData = json.loads(request.get_data(as_text=True))

    ins_result = ignore_no(queryData)
    # TODO merge instead of replace
    if not ins_result:
        return json.dumps({"status": 418}), 418

    return json.dumps({"status": 200}, ensure_ascii=False)


@app.route("/api/month")
def api_month():
    month = {}
    global alipay_groups
    for key in alipay_groups:
        alipay_ins = alipay_groups[key]
        ins_month = alipay_ins.month()
        # TODO merge instead of replace
        for k in ins_month:
            month[k] = ins_month[k]

    return json.dumps(month, ensure_ascii=False)


@app.route("/api/month_query", methods=['POST'])
def api_month_query():
    queryData = json.loads(request.get_data(as_text=True))
    result = []

    global alipay_groups
    for key in alipay_groups:
        alipay_ins = alipay_groups[key]
        ins_result = alipay_ins.month_query(queryData)
        # TODO merge instead of replace
        result += ins_result

    return json.dumps(result, ensure_ascii=False)


@app.route("/api/week")
def api_week():
    week = {}
    global alipay_groups
    for key in alipay_groups:
        alipay_ins = alipay_groups[key]
        ins_week = alipay_ins.week()
        # TODO merge instead of replace
        for k in ins_week:
            week[k] = ins_week[k]

    return json.dumps(week, ensure_ascii=False)


@app.route("/api/week_query", methods=['POST'])
def api_week_query():
    queryData = json.loads(request.get_data(as_text=True))
    result = []

    global alipay_groups
    for key in alipay_groups:
        alipay_ins = alipay_groups[key]
        ins_result = alipay_ins.week_query(queryData)
        # TODO merge instead of replace
        result += ins_result

    return json.dumps(result, ensure_ascii=False)


@app.route("/api/ignore_list", methods=["POST"])
def api_ignore_list():
    queryData = json.loads(request.get_data(as_text=True))
    result = []

    global alipay_groups
    for key in alipay_groups:
        alipay_ins = alipay_groups[key]
        ins_result = alipay_ins.ignore_list(queryData)
        # TODO merge instead of replace
        result += ins_result

    return json.dumps(result, ensure_ascii=False)


@app.route('/api/file_list')
def file_list():
    result = []
    global alipay_groups
    for k in alipay_groups:
        result.append({
            "name": k,
            "type": Alipay
        })

    return json.dumps(result, ensure_ascii=False)


@app.route('/api/upload', methods=['POST'])
def api_upload():
    global alipay_groups
    if request.method == 'POST':
        f = request.files['file']
        csvType = request.form['csvType']
        upload_path = os.path.join(os.path.dirname(
            __file__), 'tmp/uploads', f.filename)
        f.save(upload_path)
        print(csvType, upload_path)

        if csvType == fileTypes["Alipay"]:
            # 注意：没有的文件夹一定要先创建，不然会提示没有该路径
            # TODO safe filename
            # TODO support any encode
            alipay_groups[f.filename] = AlipayAnalysis(
                upload_path, ig_set.ignore_set)
        else:
            print(csvType)

    return json.dumps({"ok": "?"}, ensure_ascii=False)


def main():
    global db_path, ig_set
    db_path = getFilePath()
    ig_set = IgnoreSet(db_path)

    app.run()


if __name__ == "__main__":
    main()
