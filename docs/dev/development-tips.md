# 开发调试技巧

## 日志方案

要求：终端直接可见 + 写入文件供其他终端/AI 读取。

### 后端

无需任何额外配置。启动后日志同时输出到终端和 `log/bill_analysis.log`：

```sh
cd backend
uv run python -m bill_analysis.main
# 另一个终端：tail -100 log/bill_analysis.log
```

### 前端

使用 `tee` 同时输出到终端和文件：

```sh
cd frontend
yarn start 2>&1 | tee frontend.log
# 另一个终端：tail -100 frontend.log
```
