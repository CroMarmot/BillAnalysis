# 账单统计分析

支付宝/微信账单处理无法自定义功能，或操作不够方便，一个自用的账目查看

基于 [FastAPI] + [pydantic] + [echarts] + [reactjs]

后端使用 FastAPI + pydantic，前端通过 [@hey-api/openapi-ts] 自动生成 API 客户端。

## Quickstart

### backend (Ubuntu, Python 3.10+)

使用 [uv] 管理虚拟环境：

```sh
cd backend
uv sync
uv run bill-analysis
```

服务默认监听 http://0.0.0.0:5000，首次启动自动创建 `record.db`。

### frontend

```sh
cd frontend
yarn
yarn client-gen        # API 变更后重新生成客户端 (需 backend 运行中)
yarn start             # 开发服务器 http://localhost:3000
```

[FastAPI]: https://fastapi.tiangolo.com/
[pydantic]: https://docs.pydantic.dev/
[echarts]: https://echarts.apache.org/
[reactjs]: https://reactjs.org/
[@hey-api/openapi-ts]: https://heyapi.dev/
[uv]: https://docs.astral.sh/uv/
