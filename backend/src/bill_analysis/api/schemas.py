from enum import Enum

from pydantic import BaseModel, RootModel


class FileTypeEnum(str, Enum):
    Auto = "Auto"
    Alipay = "Alipay"
    Wechat = "Wechat"
    WechatZip = "WechatZip"


class InOutType(str, Enum):
    income = "收入"
    expense = "支出"
    not_counted = "不计收支"


class PeriodQueryRequest(BaseModel):
    key: str
    in_out: InOutType = InOutType.expense


class TagResponse(BaseModel):
    id: int
    name: str
    count: int = 0


class TagCreate(BaseModel):
    name: str


class TagUpdate(BaseModel):
    name: str


class TransactionTagResponse(BaseModel):
    tag_id: int
    tag_name: str


class TransactionNoteUpsert(BaseModel):
    source: str
    order_no: str
    remark: str


class TransactionNoteResponse(BaseModel):
    source: str
    order_no: str
    remark: str


class SpendingRecord(BaseModel):
    id: int
    csvType: str
    no: str
    opposite: str
    amount: str
    time: str
    type_: str = ""
    product: str = ""
    status: str = ""
    refund: str = ""
    tags: list[TransactionTagResponse] = []
    remark: str = ""


class FileListItem(BaseModel):
    name: str
    type: str
    cnt: int | None = None


class SummaryItem(BaseModel):
    in_cnt: int
    out_cnt: int
    not_cnt: int = 0


class UserResponse(BaseModel):
    id: int
    name: str


class UserCreate(BaseModel):
    name: str


class UserUpdate(BaseModel):
    name: str


class WechatRecord(BaseModel):
    time: str
    type_: str
    oppo: str
    prod: str
    io: str
    amount: int  # 金额(分), 即 元*100
    source: str
    stat: str
    no: str
    subno: str
    note: str


class AlipayRecord(BaseModel):
    time: str  # 交易时间
    category: str  # 交易分类
    opposite: str  # 交易对方
    account: str  # 对方账号
    product: str  # 商品说明
    in_out: str  # 收/支
    amount: int  # 金额(分), 即 元*100
    method: str  # 收/付款方式
    status: str  # 交易状态
    order_no: str  # 交易订单号
    merchant_no: str  # 商家订单号
    note: str  # 备注


class AutoTagRuleCreate(BaseModel):
    field: str
    match_type: str
    pattern: str
    tag_id: int


class AutoTagRuleUpdate(BaseModel):
    field: str | None = None
    match_type: str | None = None
    pattern: str | None = None
    tag_id: int | None = None


class AutoTagRuleResponse(BaseModel):
    id: int
    field: str
    match_type: str
    pattern: str
    tag_id: int
    tag_name: str


class BatchTagAddRequest(BaseModel):
    transaction_ids: list[int]
    tag_ids: list[int]


class BatchTagRemoveRequest(BaseModel):
    transaction_ids: list[int]
    tag_ids: list[int]


class ApplyResult(BaseModel):
    matched: int
    updated: int


class SummaryData(RootModel[dict[str, dict[str, SummaryItem]]]):
    pass


class TagTrendRequest(BaseModel):
    tag_ids: list[int]
    period: str  # "week" | "month" | "year"
    in_out: InOutType = InOutType.expense


class TagTrendItem(BaseModel):
    period: str
    amount: int  # 金额(分)


class TagTrendResponse(BaseModel):
    tag_id: int
    tag_name: str
    data: list[TagTrendItem]


class TagQueryRequest(BaseModel):
    tag_id: int
    period: str  # "week" | "month" | "year"
    key: str
    in_out: InOutType = InOutType.expense
