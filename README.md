# Balance Analysis

账单统计分析

支付宝微信账单处理无法自定义功能，或操作不够方便，一个自用的账目查看

# 准备

基于 flask + echarts + sqlite3 + Reactjs

`pip install -r requirement.txt`

从支付宝官方下载csv数据,

编码从gbk转换为utf8

`./gbk2utf8.sh <your csv>`


# 使用

`python3 alipay2json.py <your db path>`

db 填写路径即可，没有的话会自动生成

server使用示例

```
python3 alipay2json alipay_record_all.db
```

front_end

```
yarn
yarn start
```

# 当前功能

上传csv文件

查看 月/周 统计

查看 月/周 详情。

支持金额,名称,交易时间排序

标记忽略，查看忽略列表，撤销标记

# TODO

- [ ] 读取备注，增加备注
- [ ] 支持腾讯账单
- [ ] 详情饼图 
- [ ] Ignore 导入 导出 scripts
- [ ] 上传管理
- [ ] 支持 编码自动识别
- [ ] 使用RxJs?
- [ ] 总额均值

## Version

* 0.2.x 弃用Next

Next 不使用SSR较复杂，有些三方库SSR支持也复杂，本身也不需要SSR，迁移

支持上传 csv

* 0.1.x 迁移到React

启用 create react app 代码迁移到React 中

原生js向reactjs tsx改动，关联关系和用户操作状态记录

使用Material-UI

* 0.0.x 基本功能实现

flask + echarts5 + sqlite3 + 原生js

查看 月/周 统计

查看 月/周 详情。支持金额,名称,交易时间排序

标记忽略，查看忽略列表，撤销标记

提供 utf8 转换脚本
