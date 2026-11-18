# 项目结构

```
backend/
├── pyproject.toml          # 依赖 & 构建配置
└── src/bill_analysis/
    ├── main.py             # FastAPI 应用入口 + CLI
    ├── configs.py          # pydantic-settings 配置
    ├── state.py            # 全局状态
    ├── api/
    │   ├── models.py       # Pydantic 请求/响应模型
    │   ├── router.py       # API 路由
    │   ├── service.py      # 业务逻辑层
    │   ├── db_models.py    # SQLModel 表模型
    │   ├── schemas.py      # Pydantic DTO
    │   ├── adaptor.py      # 账单解析适配器
    │   └── db.py           # 数据库引擎 & 会话依赖
    ├── alipay_analysis.py  # 支付宝账单解析核心逻辑
    └── wechat_analysis.py  # 微信账单解析核心逻辑

frontend/
├── openapi-ts.config.ts    # @hey-api/openapi-ts 配置
├── package.json
└── src/
    ├── index.tsx           # 入口
    ├── App.tsx
    ├── fastapiService/     # 自动生成的 API 客户端 (⚠ 勿手动修改)
    │   ├── types.gen.ts
    │   ├── services.gen.ts
    │   └── core/
    ├── pages/Home.tsx
    ├── utils/
    │   └── apiErrorHandler.ts
    └── components/
        ├── CommonRecord.tsx
        ├── DataManager.tsx
        ├── UserManager.tsx
        └── IgnoreList.tsx
```
