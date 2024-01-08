export interface SpendingRecord {
    csvType: string; // csv 类型
    no: string; // 交易编号
    opposite: string; // 对方
    amount: string; // 金额
    time: string; // 交易时间
    status: string; // 交易状态
    refund: string; // 退款
  }