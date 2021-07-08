# Balance Analysis

账单统计分析

支付宝微信账单处理无法自定义功能，或操作不够方便，一个自用的账目查看

# 准备

基于 flask + echarts + sqlite3 + Reactjs(Next.js)

`pip install -r requirement.txt`

从支付宝官方下载csv数据,

编码从gbk转换为utf8

`./gbk2utf8.sh <your csv>`


# 使用

`python3 alipay2json.py <your alipay csv> <your db path>`

db 填写路径即可，没有的话会自动生成

server使用示例

```
python3 alipay2json alipay_record_20210630_1612_1.csv alipay_record_20210630_1612_1.db
```

front_end

```
npm i
npm run dev
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
- [ ] 使用RxJs?

## Version

* 0.1.0 迁移到React

启用 Next.js 代码迁移到React 中

* 0.0.3 基本功能实现

flask + echarts5 + sqlite3 + 原生js

查看 月/周 统计

查看 月/周 详情。支持金额,名称,交易时间排序

标记忽略，查看忽略列表，撤销标记

提供 utf8 转换脚本
