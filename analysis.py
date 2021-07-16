from wechat_analysis import WechatAnalysisGroup
from flask.sessions import NullSession
from flask import Flask, render_template, request
from flask_cors import CORS
import argparse
import csv
import os
import json
import sqlite3
from datetime import datetime

from alipay_analysis import AlipayAnalysisGroup, Alipay
from wechat_analysis import WechatAnalysisGroup, Wechat

# TODO use logging

app = Flask(__name__)
# 不用cors的话 可以用nginx
CORS(app)

fileTypes = {
    "Alipay": Alipay,
    "Wechat": Wechat
}

AAG = None
WAG = None

# TODO 泛型合并 AAG WAG
AG = {}


def getFilePath():
    parser = argparse.ArgumentParser(description='处理Alipay/Wechat的交易记录')
    parser.add_argument('db', help='db file path')
    args = parser.parse_args()
    return args.db


@app.route("/api/ignore_no", methods=["POST"])
def api_ignore_no():
    queryData = json.loads(request.get_data(as_text=True))
    if queryData['csvType'] == Alipay:
        ins_result = AAG.ignore_no(queryData)
    elif queryData['csvType'] == Wechat:
        ins_result = WAG.ignore_no(queryData)
    else:
        return json.dumps({"status": 418}), 418

    if not ins_result:
        return json.dumps({"status": 418}), 418

    return json.dumps({"status": 200}, ensure_ascii=False)


@app.route("/api/month")
def api_month():
    month = {}
    # TODO merge instead of replace
    aag_month = AAG.get_month()
    for k in aag_month:
        month[k] = aag_month[k]

    wag_month = WAG.get_month()
    for k in wag_month:
        month[k] = wag_month[k]

    return json.dumps(month, ensure_ascii=False)


@app.route("/api/month_query", methods=['POST'])
def api_month_query():
    queryData = json.loads(request.get_data(as_text=True))
    result = AAG.month_query(queryData) + WAG.month_query(queryData)
    return json.dumps(result, ensure_ascii=False)


@app.route("/api/week")
def api_week():
    result = {}
    aag_week = AAG.get_week()
    for k in aag_week:
        result[k] = aag_week[k]

    wag_week = WAG.get_week()
    for k in wag_week:
        result[k] = wag_week[k]

    return json.dumps(result, ensure_ascii=False)


@app.route("/api/week_query", methods=['POST'])
def api_week_query():
    queryData = json.loads(request.get_data(as_text=True))
    result = AAG.week_query(queryData) + WAG.week_query(queryData)
    return json.dumps(result, ensure_ascii=False)


@app.route("/api/ignore_list", methods=["POST"])
def api_ignore_list():
    queryData = json.loads(request.get_data(as_text=True))
    result = AAG.get_ignore_list(queryData) + WAG.get_ignore_list(queryData)
    return json.dumps(result, ensure_ascii=False)


@app.route('/api/file_list')
def file_list():
    result = AAG.get_groups() + WAG.get_groups()

    return json.dumps(result, ensure_ascii=False)

# TODO 根据csv内容 自动监测类型


@app.route('/api/upload', methods=['POST'])
def api_upload():
    if request.method == 'POST':
        f = request.files['file']
        csvType = request.form['csvType']
        upload_path = os.path.join(os.path.dirname(
            __file__), 'tmp/uploads', f.filename)
        f.save(upload_path)

        # 注意：没有的文件夹一定要先创建，不然会提示没有该路径
        # TODO safe filename
        # TODO support any encode
        if csvType == fileTypes["Alipay"]:
            AAG.add_file(f.filename, upload_path)
        elif csvType == fileTypes["Wechat"]:
            WAG.add_file(f.filename, upload_path)
        else:
            print(csvType)
            return json.dumps({"not ok": 418}, ensure_ascii=False), 418
    else:
        print(request.method)
        return json.dumps({"not ok": 418}, ensure_ascii=False), 418

    return json.dumps({"ok": "?"}, ensure_ascii=False)


def main():
    global AAG, WAG
    db_path = getFilePath()
    AAG = AlipayAnalysisGroup(db_path)
    WAG = WechatAnalysisGroup(db_path)

    app.run()


if __name__ == "__main__":
    main()
