import type { SpendingRecord } from "../fastapiService/types.gen";

/** 已识别的交易状态 */
const RECOGNIZED_STATUSES = [
  "交易成功",
  "支付成功",
  "对方已收钱",
  "交易关闭",
  "已全额退款",
];

/** 不参与统计的状态 */
const EXCLUDED_STATUSES = ["交易关闭", "已全额退款"];

/**
 * 纯函数：过滤不参与统计的记录，并对非标准状态输出 console warning。
 * 应在 API 返回数据之后、所有前端处理之前调用。
 */
export function filterRecords(
  records: SpendingRecord[],
  label?: string,
): SpendingRecord[] {
  // warning: 非标准状态
  const unrecognized = records.filter(
    (r) => r.status && !RECOGNIZED_STATUSES.includes(r.status),
  );
  if (unrecognized.length > 0) {
    console.warn(
      `[${label ?? "filterRecords"}] 发现 ${unrecognized.length} 条非标准交易状态:`,
      unrecognized.map((r) => ({
        id: r.id,
        status: r.status,
        opposite: r.opposite,
        amount: r.amount,
        time: r.time,
      })),
    );
  }

  // filter: 排除不参与统计的状态
  return records.filter((r) => !r.status || !EXCLUDED_STATUSES.includes(r.status));
}
