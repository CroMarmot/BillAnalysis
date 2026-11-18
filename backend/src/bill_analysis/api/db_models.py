from sqlmodel import Field, Relationship, SQLModel


class TransactionTag(SQLModel, table=True):
    __tablename__ = "transaction_tags"
    transaction_id: int = Field(foreign_key="transactions.id", primary_key=True)
    tag_id: int = Field(foreign_key="tags.id", primary_key=True)


class Transaction(SQLModel, table=True):
    __tablename__ = "transactions"
    id: int | None = Field(default=None, primary_key=True)
    source: str
    order_no: str | None = None
    merchant_no: str | None = None
    time: str | None = None
    type_: str | None = None
    opposite: str | None = None
    product: str | None = None
    in_out: str | None = None
    amount: int | None = None
    method: str | None = None
    status: str | None = None
    note: str | None = None
    filename: str | None = None
    user_id: int = Field(default=1)

    tags: list["Tag"] = Relationship(link_model=TransactionTag, sa_relationship_kwargs={"lazy": "selectin", "overlaps": "transactions"})


class Tag(SQLModel, table=True):
    __tablename__ = "tags"
    id: int | None = Field(default=None, primary_key=True)
    name: str
    user_id: int = Field(default=1)

    transactions: list[Transaction] = Relationship(link_model=TransactionTag, sa_relationship_kwargs={"lazy": "selectin", "overlaps": "tags"})


class AutoTagRule(SQLModel, table=True):
    __tablename__ = "auto_tag_rules"
    id: int | None = Field(default=None, primary_key=True)
    field: str
    match_type: str
    pattern: str
    tag_id: int = Field(foreign_key="tags.id")
    user_id: int = Field(default=1)


class TransactionNote(SQLModel, table=True):
    __tablename__ = "transaction_notes"
    source: str = Field(primary_key=True)
    order_no: str = Field(primary_key=True)
    user_id: int = Field(primary_key=True)
    remark: str


class User(SQLModel, table=True):
    __tablename__ = "users"
    id: int | None = Field(default=None, primary_key=True)
    name: str
