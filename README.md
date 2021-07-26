# Balance Analysis

账单统计分析

支付宝微信账单处理无法自定义功能，或操作不够方便，一个自用的账目查看

## 准备

基于 flask + echarts + sqlite3 + Reactjs

`pip install -r requirement.txt`

从支付宝官方下载csv数据,

编码从gbk转换为utf8(支付宝账单需要)

`./gbk2utf8.sh <your csv>`

## 微信账单密码

微信每次只能下载3个月的账单，而且走邮箱带密码步骤十分繁琐，这里提供一个 数字密码爆破的脚本，需要修改代码里去掉字母的部分即可使用

https://github.com/CroMarmot/zipcracker~

## 使用

`python3 analysis.py <your db path>`

db 填写路径即可，没有的话会自动生成

server使用示例

```
python3 analysis.py record.db
```

front_end

```
yarn
yarn start
```

## 当前功能

上传csv文件

查看 月/周 统计

查看 月/周 详情。

支持金额,名称,交易时间排序

标记忽略，查看忽略列表，撤销标记

已支持 支付宝账单 和 微信账单

自动识别账单类型

详情饼图

## TODO

- [ ] 读取备注，增加备注
- [ ] 备注 映射管理
- [ ] Tag/Category
- [ ] Ignore 导入 导出 scripts
- [ ] 上传管理
- [ ] 支持 编码自动识别
- [ ] 使用RxJs?
- [ ] 总额均值
- [ ] 解决 Alipay/Wechat 内部的 合并 覆盖(目前用户保证账单，两份月周份无重复)
- [ ] 批量上传
- [ ] search
- [ ] i18n
