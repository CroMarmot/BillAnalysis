# 账单统计分析

支付宝/微信账单处理无法自定义功能，或操作不够方便，一个自用的账目查看

基于 [flask] + [echarts] + [sqlite3] + [reactjs]
## 准备

`pip install -r requirement.txt`

从支付宝/微信 官方下载csv数据

支付宝账单需要 编码从gbk转换为utf8:

`./gbk2utf8.sh <your csv>`

## 微信账单密码

微信每次只能下载3个月的账单，而且走邮箱带密码步骤十分繁琐，这里提供一个 数字密码爆破的脚本，需要修改代码里去掉字母的部分即可使用

https://github.com/CroMarmot/zipcracker

```diff
-    alphabet += 'abcdefghijklmnopqrstuvwxyz'
-    alphabet += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
+#    alphabet += 'abcdefghijklmnopqrstuvwxyz'
+#    alphabet += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
```

## 使用

### backend

```
# 进入服务端文件夹
cd backend
# 创建虚拟环境
python3 -m venv venv
# 启用虚拟环境
. venv/bin/activate
# 安装模块及依赖
pip install -e .
# 启动服务, 其中<record.db>为存储文件,可以替换
python3 -m bill_analysis.analysis record.db
```

### frontend

```
# 进入前端文件夹
cd frontend
# 查看可用node版本
nvm ls-remote --lts
# 安装一个v16.x.x的版本, 原始代码比较老,没支持v18
nvm install v16.20.2
# 使用对应版本
nvm use v16.20.2
# 安装依赖
yarn
# 启动服务
yarn start
```

浏览器访问<http://localhost:3000/>

## 当前功能

 - 支持 支付宝账单 和 微信账单
 - 上传csv文件, 自动识别账单类型
 - 查看 月/周 统计(柱状)/详情(饼图+列表)
 - 支持金额,名称,交易时间排序
 - 标记忽略，查看忽略列表，撤销标记

## TODO

- [ ] 读取备注，增加备注
- [ ] 备注 映射管理
- [ ] Tag/Category
- [ ] Ignore 导入/导出 scripts
- [ ] 上传管理
- [ ] 支持 编码自动识别
- [ ] 使用RxJs?
- [ ] i18n
- [ ] 总额/均值
- [ ] 解决 Alipay/Wechat 内部的 合并 覆盖(目前用户保证账单，两份月周份无重复)
- [ ] 批量上传
- [ ] search
- [ ] 一些单元unit test 和 覆盖率报告

[flask]: https://flask.palletsprojects.com/en/2.0.x/
[echarts]: https://echarts.apache.org/
[sqlite3]: https://www.sqlite.org/index.html
[reactjs]: https://reactjs.org/
