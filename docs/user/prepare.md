# 数据准备

从支付宝/微信官方下载 CSV 数据。

## 支付宝

支付宝账单需要将编码从 GBK 转换为 UTF-8：

```sh
./gbk2utf8.sh <your csv>
```

## 微信账单密码

微信每次只能下载 3 个月的账单，且走邮箱带密码步骤十分繁琐。这里提供一个数字密码爆破脚本，需修改代码去掉字母部分即可使用：

https://github.com/CroMarmot/zipcracker

```diff
-    alphabet += 'abcdefghijklmnopqrstuvwxyz'
-    alphabet += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
+#    alphabet += 'abcdefghijklmnopqrstuvwxyz'
+#    alphabet += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
```
