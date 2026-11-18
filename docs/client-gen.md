# 项目规范

## 前端自动生成代码

`frontend/src/fastapiService/` 目录下的所有文件均由 `yarn client-gen` 自动生成，**严禁手动修改**。

- 每次新增/修改后端 API 后，先启动后端服务，然后运行 `yarn client-gen` 重新生成
- OpenAPI 配置见 `frontend/openapi-ts.config.ts`，默认从 `http://localhost:5000/openapi.json` 读取 schema

## 生成步骤

```bash
# 1. 启动后端
cd backend && ba_host=0.0.0.0 ba_port=5000 bill-analysis serve &

# 2. 生成前端客户端
cd frontend && yarn client-gen
```