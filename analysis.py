from flask.sessions import NullSession
from alipay_analysis import AlipayAnalysis, AlipayAnalysisGroup, Alipay
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

fileTypes = {
    "Alipay": Alipay,
    "Tencent": "Tencent"
}

AAG = None


def getFilePath():
    parser = argparse.ArgumentParser(description='处理Alipay的交易记录')
    parser.add_argument('db', help='db file path')
    args = parser.parse_args()
    return args.db


@app.route("/api/ignore_no", methods=["POST"])
def api_ignore_no():
    queryData = json.loads(request.get_data(as_text=True))

    ins_result = AAG.ignore_no(queryData)
    # TODO merge instead of replace
    if not ins_result:
        return json.dumps({"status": 418}), 418

    return json.dumps({"status": 200}, ensure_ascii=False)


@app.route("/api/month")
def api_month():
    month = AAG.get_month()
    return json.dumps(month, ensure_ascii=False)


@app.route("/api/month_query", methods=['POST'])
def api_month_query():
    queryData = json.loads(request.get_data(as_text=True))
    result = AAG.month_query(queryData)
    return json.dumps(result, ensure_ascii=False)


@app.route("/api/week")
def api_week():
    week = AAG.get_week()
    return json.dumps(week, ensure_ascii=False)


@app.route("/api/week_query", methods=['POST'])
def api_week_query():
    queryData = json.loads(request.get_data(as_text=True))
    result = AAG.week_query(queryData)
    return json.dumps(result, ensure_ascii=False)


@app.route("/api/ignore_list", methods=["POST"])
def api_ignore_list():
    queryData = json.loads(request.get_data(as_text=True))
    result = AAG.get_ignore_list(queryData)
    return json.dumps(result, ensure_ascii=False)


@app.route('/api/file_list')
def file_list():
    result = AAG.get_groups()

    return json.dumps(result, ensure_ascii=False)


@app.route('/api/upload', methods=['POST'])
def api_upload():
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
            AAG.add_file(f.filename, upload_path)
        else:
            print(csvType)
    else:
        print(request.method)

    return json.dumps({"ok": "?"}, ensure_ascii=False)


def main():
    global db_path, AAG
    db_path = getFilePath()
    AAG = AlipayAnalysisGroup(db_path)

    app.run()


if __name__ == "__main__":
    main()
