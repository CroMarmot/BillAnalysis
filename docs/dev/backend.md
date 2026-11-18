# Backend 开发指南

## 编码规范

### API 响应必须使用 Pydantic 模型

所有 API 响应必须定义并使用 Pydantic `BaseModel`，**禁止** 直接返回 `dict`。

```python
# ✅ 正确
class UserResponse(BaseModel):
    id: int
    name: str

def list_users(...) -> list[UserResponse]:
    return [UserResponse(id=u.id, name=u.name) for u in users]

# ❌ 错误
def list_users(...) -> list[dict]:
    return [{"id": u.id, "name": u.name} for u in users]
```

例外情况：`POST /upload` 返回 `{"count": N}`，作为唯一特例允许使用 `dict[str, int]`。

### 所有 SQL 查询必须使用 SQLModel ORM

禁止使用 `text()` 执行原始 SQL。CRUD 操作均通过 SQLModel session 完成。

### user_id 必须为必填

所有需要用户上下文的端点的 `user_id` 参数必须使用 `Annotated[int, Query()]`，不得设置默认值。

## 运行测试

项目使用 [pytest] 运行测试，通过 [uv] 管理虚拟环境。

```sh
cd backend
uv run pytest
```

指定文件运行：

```sh
uv run pytest tests/unit/test_wechat_parser.py
```

带覆盖率：

```sh
uv run pytest --cov=bill_analysis
```

[pytest]: https://docs.pytest.org/
[uv]: https://docs.astral.sh/uv/
