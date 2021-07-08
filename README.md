# Balance Analysis

账单统计分析

支付宝微信账单处理无法自定义功能，或操作不够方便，一个自用的账目查看

# 准备

基于 flask + echarts + sqlite3 + 无框架js

`pip install -r requirement.txt`

从支付宝官方下载csv数据,

编码从gbk转换为utf8

`./gbk2utf8.sh <your csv>`


# 使用

`python3 alipay2json.py <your alipay csv> <your db path>`

db 填写路径即可，没有的话会自动生成

使用示例

```
python3 alipay2json alipay_record_20210630_1612_1.csv alipay_record_20210630_1612_1.db
```

# 当前功能

查看 月/周 统计

查看 月/周 详情。支持金额,名称,交易时间排序

标记忽略，查看忽略列表，撤销标记
# TODO

- [ ] 读取备注，增加备注
- [ ] 支持腾讯账单
- [ ] 详情饼图 
- [ ] 优化刷新，保持操作状态关系
- [ ] 使用React / RxJs?

