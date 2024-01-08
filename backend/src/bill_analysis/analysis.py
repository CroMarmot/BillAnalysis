import argparse
import json
import logging
import os
import tempfile
from enum import Enum
from pathlib import Path

from flask import Flask, request
from flask_cors import CORS

# from .crack_zip import crack_zip
from .alipay_analysis import AlipayAnalysis, AlipayAnalysisGroup
from .wechat_analysis import WechatAnalysis, WechatAnalysisGroup

app_name = "bill_analysis"


class FileTypeEnum(str, Enum):
    Auto = "Auto"
    Alipay = "Alipay"
    Wechat = "Wechat"
    WechatZip = "WechatZip"


def main():
    logging.basicConfig(
        level=logging.NOTSET,
        format="%(asctime)s,%(msecs)03d %(levelname)-8s [%(filename)s:%(lineno)d] %(message)s",
        datefmt="%Y-%m-%d:%H:%M:%S",
    )
    logger = logging.getLogger(app_name + ".log")
    logger.setLevel(logging.DEBUG)

    app = Flask(app_name + ".flask")
    # 不用cors的话 可以用nginx
    CORS(app)

    aag: AlipayAnalysisGroup
    wag: WechatAnalysisGroup

    # TODO 泛型合并 AAG WAG
    # AG = {}

    def get_file_path():
        parser = argparse.ArgumentParser(description="处理Alipay/Wechat的交易记录")
        parser.add_argument("db", help="db file path")
        args = parser.parse_args()
        return args.db

    @app.route("/api/ignore_no", methods=["POST"])
    def api_ignore_no():
        query_data = json.loads(request.get_data(as_text=True))
        if query_data["csvType"] == FileTypeEnum.Alipay:
            ins_result = aag.ignore_no(query_data)
        elif query_data["csvType"] == FileTypeEnum.Wechat:
            ins_result = wag.ignore_no(query_data)
        else:
            return json.dumps({"status": 418}), 418

        if not ins_result:
            return json.dumps({"status": 418}), 418

        return json.dumps({"status": 200}, ensure_ascii=False)

    @app.route("/api/year")
    def api_year():
        result = {
            FileTypeEnum.Wechat: wag.get_year(),
            FileTypeEnum.Alipay: [],  # aag.get_month(),
        }
        return json.dumps(result, ensure_ascii=False)

    @app.route("/api/year_query", methods=["POST"])
    def api_year_query():
        query_data = json.loads(request.get_data(as_text=True))
        # result = aag.month_query(query_data) + wag.month_query(query_data)
        result = wag.year_query(query_data)
        return json.dumps(result, ensure_ascii=False)

    @app.route("/api/month")
    def api_month():
        result = {
            FileTypeEnum.Wechat: wag.get_month(),
            FileTypeEnum.Alipay: aag.get_month(),
        }
        return json.dumps(result, ensure_ascii=False)

    @app.route("/api/month_query", methods=["POST"])
    def api_month_query():
        query_data = json.loads(request.get_data(as_text=True))
        result = aag.month_query(query_data) + wag.month_query(query_data)
        return json.dumps(result, ensure_ascii=False)

    @app.route("/api/week")
    def api_week():
        result = {
            FileTypeEnum.Wechat: wag.get_week(),
            FileTypeEnum.Alipay: aag.get_week(),
        }

        return json.dumps(result, ensure_ascii=False)

    @app.route("/api/week_query", methods=["POST"])
    def api_week_query():
        query_data = json.loads(request.get_data(as_text=True))
        result = aag.week_query(query_data) + wag.week_query(query_data)
        return json.dumps(result, ensure_ascii=False)

    @app.route("/api/ignore_list", methods=["POST"])
    def api_ignore_list():
        query_data = json.loads(request.get_data(as_text=True))
        result = aag.get_ignore_list(query_data) + wag.get_ignore_list(query_data)
        return json.dumps(result, ensure_ascii=False)

    @app.route("/api/file_list")
    def file_list():
        result = aag.get_groups() + wag.get_groups()

        return json.dumps(result, ensure_ascii=False)

    @app.route("/api/remove_file", methods=["POST"])
    def remove_file():
        if request.method == "POST":
            filename = request.form["filename"]
            csv_type = request.form["csvType"]
            logger.debug("csv_type:" + csv_type)

            if csv_type == FileTypeEnum.Alipay:
                # TODO
                pass
            elif csv_type == FileTypeEnum.Wechat:
                wag.remove_file(filename)
            else:
                raise ValueError()
        else:
            logger.debug("req method:" + request.method)
            return json.dumps({"not ok": 418}, ensure_ascii=False), 418

        return json.dumps({"ok": "?"}, ensure_ascii=False)

    # TODO 根据csv内容 自动监测类型
    # TODO 自动暴力微信zip密码
    @app.route("/api/upload", methods=["POST"])
    def api_upload():
        if request.method == "POST":
            f = request.files["file"]
            if f.filename is None:
                # TODO resp
                raise ValueError()
            csv_type = request.form["csvType"]

            upload_folder = os.path.join(tempfile.gettempdir(), "bill_analysis", "uploads")
            logger.debug("upload folder:" + upload_folder)
            Path(upload_folder).mkdir(parents=True, exist_ok=True)  # 创建文件夹
            upload_path = os.path.join(upload_folder, f.filename)
            logger.debug("upload path:" + upload_path)
            f.save(upload_path)

            # TODO safe filename
            # TODO support any encode
            # TODO support wechat zip crack
            logging.debug("csv type:" + csv_type)

            def handle_alipay(f):
                aag.add_file(f.filename, upload_path)

            def handle_wechat(f):
                # TODO timestamp to filename, and hash to upload_path
                wag.add_file(f.filename, upload_path)

            if csv_type == FileTypeEnum.Alipay:
                handle_alipay(f)
            elif csv_type == FileTypeEnum.Wechat:
                handle_wechat(f)
            elif csv_type == FileTypeEnum.Auto:
                if AlipayAnalysis.is_csv(upload_path):
                    handle_alipay(f)
                elif WechatAnalysis.is_csv(upload_path):
                    handle_wechat(f)
                elif WechatAnalysis.is_zip_file(upload_path):
                    # 太耗时了
                    # ok, pwd = crack_zip(upload_path)
                    # logger.debug("crack result:" + str(ok))
                    # logger.debug("      password:" + str(pwd))
                    logger.info("""Use https://github.com/CroMarmot/zipcracker""")
                else:
                    return json.dumps({"not ok": 418}, ensure_ascii=False), 418
            else:
                return json.dumps({"not ok": 418}, ensure_ascii=False), 418
        else:
            logger.debug("req method:" + request.method)
            return json.dumps({"not ok": 418}, ensure_ascii=False), 418

        return json.dumps({"ok": "?"}, ensure_ascii=False)

    db_path = get_file_path()
    aag = AlipayAnalysisGroup(db_path)
    wag = WechatAnalysisGroup(db_path)
    app.run(debug=True)


if __name__ == "__main__":
    main()
