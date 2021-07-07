# Balance Analysis

账单统计分析

支付宝微信账单处理无法自定义功能，或操作不够方便，一个自用的账目查看

# 准备

基于 flask + echarts + sqlite3 + 无框架js

`pip install -r requirement.txt`

从支付宝官方下载csv数据

# 使用

`python3 alipay2json.py <your alipay csv> <your db path>`

db 填写路径即可，没有的话会自动生成

使用示例

```
python3 alipay2json alipay_record_20210630_1612_1.csv alipay_record_20210630_1612_1.db
```




