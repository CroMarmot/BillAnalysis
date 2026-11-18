import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import Box from "@mui/material/Box";
import Fab from "@mui/material/Fab";
import Switch from "@mui/material/Switch";
import RefreshIcon from "@mui/icons-material/Refresh";

import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import type { SpendingRecord } from "../fastapiService/types.gen";
import { handleApiError, success } from "../utils/feedbackService";
import { filterRecords } from "../utils/recordFilter";

import {
  billBatchAddTags,
  billBatchRemoveTags,
  billGetMonth,
  billGetWeek,
  billGetYear,
  billListTags,
  billPostMonthQuery,
  billPostWeekQuery,
  billPostYearQuery,
  billSetTransactionTags,
  billUpsertTransactionNote,
  billDeleteTransactionNote,
} from "../fastapiService/services.gen";
import type {
  InOutType,
  SummaryItem,
  TagResponse,
} from "../fastapiService/types.gen";
import { Pagination } from "@cromarmot/pagination";

type SummaryMap = { [key: string]: SummaryItem };

const getInfo = (
  echarts_div: HTMLDivElement,
  echarts_title: string,
  set_query_key: Function,
  set_query_in_out: Function,
  setAvailableKeys: (keys: string[]) => void,
  userId: number,
) => {
  const fetchFn =
    echarts_title === "月"
      ? (uid: number) => billGetMonth({ userId: uid })
      : echarts_title === "周"
        ? (uid: number) => billGetWeek({ userId: uid })
        : (uid: number) => billGetYear({ userId: uid });

  return fetchFn(userId)
    .then((res) => {
      const data = res as unknown as { [key: string]: SummaryMap };
      const myChart = echarts.init(echarts_div);

      const keysSet = new Set<string>();
      Object.entries(data).forEach(([_csvType, csvData]) => {
        Object.keys(csvData || {}).forEach((key) => {
          keysSet.add(key);
        });
      });
      const keysArr: string[] = Array.from(keysSet);
      keysArr.sort();
      setAvailableKeys(keysArr);

      myChart.setOption({
        title: {
          text: echarts_title,
        },
        tooltip: {},
        xAxis: {
          data: keysArr,
        },
        yAxis: {},
        legend: {
          left: "10%",
          selected: {
            Alipay不计收支: false,
            Wechat不计收支: false,
          },
        },
        series: [
          {
            name: "Alipay收入",
            type: "bar",
            stack: "two",
            data: keysArr.map(
              (key) => (data["Alipay"] as SummaryMap)?.[key]?.in_cnt / 100,
            ),
          },
          {
            name: "Wechat收入",
            type: "bar",
            stack: "two",
            data: keysArr.map(
              (key) => (data["Wechat"] as SummaryMap)?.[key]?.in_cnt / 100,
            ),
          },
          {
            name: "Alipay支出",
            type: "bar",
            stack: "one",
            data: keysArr.map(
              (key) => (data["Alipay"] as SummaryMap)?.[key]?.out_cnt / 100,
            ),
          },
          {
            name: "Wechat支出",
            type: "bar",
            stack: "one",
            data: keysArr.map(
              (key) => (data["Wechat"] as SummaryMap)?.[key]?.out_cnt / 100,
            ),
          },
          {
            name: "Alipay不计收支",
            type: "bar",
            stack: "three",
            data: keysArr.map(
              (key) =>
                ((data["Alipay"] as SummaryMap)?.[key]?.not_cnt ?? 0) / 100,
            ),
          },
          {
            name: "Wechat不计收支",
            type: "bar",
            stack: "three",
            data: keysArr.map(
              (key) =>
                ((data["Wechat"] as SummaryMap)?.[key]?.not_cnt ?? 0) / 100,
            ),
          },
        ],
      });

      myChart.on("click", (r: { dataIndex: number; seriesName: string }) => {
        if (r.seriesName.endsWith("支出")) {
          set_query_in_out("支出");
        } else if (r.seriesName.endsWith("收入")) {
          set_query_in_out("收入");
        } else if (r.seriesName.endsWith("不计收支")) {
          set_query_in_out("不计收支");
        }
        set_query_key(keysArr[r.dataIndex]);
      });
    })
    .catch(handleApiError);
};

const draw_echarts_pie = (
  echarts_div: HTMLDivElement,
  detail_state: SpendingRecord[],
) => {
  let opposite2count: { [key: string]: number } = {};
  detail_state.forEach((item) => {
    if (!opposite2count[item.opposite]) {
      opposite2count[item.opposite] = 0;
    }
    opposite2count[item.opposite] = Number(
      (opposite2count[item.opposite] + Number(item.amount)).toFixed(2),
    );
  });
  let data = Object.keys(opposite2count).map((key) => ({
    value: opposite2count[key],
    name: key,
  }));
  data.sort((a, b) => b.value - a.value);

  const myChart = echarts.init(echarts_div);
  myChart.setOption({
    title: {
      text: "详情",
      left: "center",
      top: 5,
    },
    tooltip: {
      trigger: "item",
    },
    legend: {
      type: "scroll",
      orient: "vertical",
      right: 10,
      top: 30,
      bottom: 10,
    },
    series: [
      {
        name: "详情",
        type: "pie",
        radius: "70%",
        center: ["50%", "45%"],
        data,
      },
    ],
  });
};

const draw_tag_pie = (
  echarts_div: HTMLDivElement,
  detail_state: SpendingRecord[],
  onTagClick?: (tagName: string) => void,
) => {
  let tag2amount: { [key: string]: number } = {};
  detail_state.forEach((item) => {
    const tags = item.tags || [];
    if (tags.length === 0) {
      const key = "\u{1F3F7} 无标签";
      tag2amount[key] = Number(
        ((tag2amount[key] || 0) + Number(item.amount)).toFixed(2),
      );
      return;
    }
    tags.forEach((t) => {
      const name = t.tag_name;
      if (!tag2amount[name]) tag2amount[name] = 0;
      tag2amount[name] = Number(
        (tag2amount[name] + Number(item.amount)).toFixed(2),
      );
    });
  });
  let data = Object.keys(tag2amount).map((key) => ({
    value: tag2amount[key],
    name: key,
  }));
  data.sort((a, b) => b.value - a.value);

  const myChart = echarts.init(echarts_div);
  myChart.setOption(
    {
      title: { text: "按标签", left: "center", top: 5 },
      tooltip: { trigger: "item" },
      legend: {
        type: "scroll",
        orient: "vertical",
        right: 10,
        top: 30,
        bottom: 10,
      },
      series: [
        {
          name: "按标签",
          type: "pie",
          radius: "70%",
          center: ["50%", "45%"],
          data,
        },
      ],
    },
    true,
  );
  if (onTagClick) {
    myChart.on("click", (params: { name: string }) => onTagClick(params.name));
  }
};

const draw_offset_chart = (
  echarts_div: HTMLDivElement,
  echarts_title: string,
  userId: number,
) => {
  const fetchFn =
    echarts_title === "月"
      ? (uid: number) => billGetMonth({ userId: uid })
      : echarts_title === "周"
        ? (uid: number) => billGetWeek({ userId: uid })
        : (uid: number) => billGetYear({ userId: uid });

  return fetchFn(userId)
    .then((res) => {
      const data = res as unknown as { [key: string]: SummaryMap };
      const myChart = echarts.init(echarts_div);

      const keysSet = new Set<string>();
      Object.entries(data).forEach(([_csvType, csvData]) => {
        Object.keys(csvData || {}).forEach((key) => keysSet.add(key));
      });
      const keysArr = Array.from(keysSet).sort();

      const netData = keysArr.map((key) => {
        let net = 0;
        Object.values(data).forEach((csvData) => {
          const item = (csvData as SummaryMap)?.[key];
          if (item) net += (item.in_cnt || 0) - (item.out_cnt || 0);
        });
        return net / 100;
      });

      myChart.setOption(
        {
          title: { text: `${echarts_title} (收入-支出)` },
          tooltip: {},
          xAxis: { data: keysArr },
          yAxis: {},
          series: [
            {
              name: "净额",
              type: "bar",
              data: netData,
              itemStyle: {
                color: (params: any) =>
                  params.value >= 0 ? "#5470c6" : "#ee6666",
              },
            },
          ],
        },
        true,
      );
    })
    .catch(handleApiError);
};

const applyTagFilter = (
  records: SpendingRecord[],
  positiveTags: number[],
  negativeTags: number[],
  noTagFilter: 0 | 1 | -1,
): SpendingRecord[] => {
  let filtered = records;
  if (positiveTags.length > 0 || noTagFilter === 1) {
    filtered = records.filter((r) => {
      const recordTagIds = (r.tags || []).map((t) => t.tag_id);
      if (noTagFilter === 1 && recordTagIds.length === 0) return true;
      if (positiveTags.some((id) => recordTagIds.includes(id))) return true;
      return false;
    });
  }

  if (negativeTags.length > 0 || noTagFilter === -1) {
    filtered = filtered.filter((r) => {
      const recordTagIds = (r.tags || []).map((t) => t.tag_id);
      if (noTagFilter === -1 && recordTagIds.length === 0) return false;
      if (negativeTags.some((id) => recordTagIds.includes(id))) return false;
      return true;
    });
  }

  return filtered;
};

const CommonRecord = ({
  echarts_title,
  refresh,
  updateFn,
  userId,
}: {
  echarts_title: string;
  refresh: Object;
  updateFn: Function;
  userId: number;
}) => {
  const styles = {
    canvas: {
      width: 1000,
      height: 600,
      margin: "0 auto",
    },
  };

  const echarts_div = useRef<HTMLDivElement>(null!);
  const echarts_pie_div = useRef<HTMLDivElement>(null!);
  const tag_pie_div = useRef<HTMLDivElement>(null!);
  const [detail_state, set_detail_state] = useState<SpendingRecord[]>([]);
  const [offsetDetailState, setOffsetDetailState] = useState<SpendingRecord[]>(
    [],
  );
  const [offsetMode, setOffsetMode] = useState(false);
  const [sort_col, set_sort_col] = useState("time");
  const [sort_order, set_sort_order] = useState(1);
  const [query_key, set_query_key] = useState("");
  const [query_in_out, set_query_in_out] = useState<InOutType>("支出");
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<TagResponse[]>([]);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [tagDialogTxId, setTagDialogTxId] = useState<number | null>(null);
  const [tagDialogSelected, setTagDialogSelected] = useState<number[]>([]);
  const TAG_NONE = -1;
  const [editingRemark, setEditingRemark] = useState<{
    id: number;
    value: string;
  } | null>(null);
  const [selectedTxIds, setSelectedTxIds] = useState<Set<number>>(new Set());
  const [batchTagOpen, setBatchTagOpen] = useState(false);
  const [batchAddTagIds, setBatchAddTagIds] = useState<number[]>([]);
  const [batchRemoveTagIds, setBatchRemoveTagIds] = useState<number[]>([]);

  const saveRemark = (element: SpendingRecord, value: string) => {
    setEditingRemark(null);
    if (value.trim() && value.trim() !== (element.remark || "")) {
      billUpsertTransactionNote({
        requestBody: {
          source: element.csvType,
          order_no: element.no,
          remark: value.trim(),
        },
        userId,
      })
        .then(() => {
          set_detail_state((prev: SpendingRecord[]) =>
            prev.map((r) =>
              r.id === element.id ? { ...r, remark: value.trim() } : r,
            ),
          );
        })
        .catch(handleApiError);
    } else if (!value.trim() && element.remark) {
      billDeleteTransactionNote({
        source: element.csvType,
        orderNo: element.no,
        userId,
      })
        .then(() => {
          set_detail_state((prev: SpendingRecord[]) =>
            prev.map((r) => (r.id === element.id ? { ...r, remark: "" } : r)),
          );
        })
        .catch(handleApiError);
    }
  };
  const [positiveTags, setPositiveTags] = useState<number[]>([]);
  const [negativeTags, setNegativeTags] = useState<number[]>([]);
  const [noTagFilter, setNoTagFilter] = useState<0 | 1 | -1>(0);
  const [searchOpposite, setSearchOpposite] = useState("");
  const [searchProduct, setSearchProduct] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const cycleTagFilter = (tagId: number) => {
    if (tagId === TAG_NONE) {
      setNoTagFilter((prev) => (((prev + 2) % 3) - 1) as 0 | 1 | -1);
      return;
    }
    if (positiveTags.includes(tagId)) {
      setPositiveTags((prev) => prev.filter((id) => id !== tagId));
      setNegativeTags((prev) => [...prev, tagId]);
    } else if (negativeTags.includes(tagId)) {
      setNegativeTags((prev) => prev.filter((id) => id !== tagId));
    } else {
      setPositiveTags((prev) => [...prev, tagId]);
    }
  };

  const getFilterState = (tagId: number): 0 | 1 | -1 => {
    if (tagId === TAG_NONE) return noTagFilter;
    if (positiveTags.includes(tagId)) return 1;
    if (negativeTags.includes(tagId)) return -1;
    return 0;
  };

  const filteredDetail = useMemo(() => {
    let result = applyTagFilter(
      detail_state,
      positiveTags,
      negativeTags,
      noTagFilter,
    );
    if (searchOpposite) {
      const kw = searchOpposite.toLowerCase();
      result = result.filter((r) =>
        (r.opposite || "").toLowerCase().includes(kw),
      );
    }
    if (searchProduct) {
      const kw = searchProduct.toLowerCase();
      result = result.filter((r) =>
        (r.product || "").toLowerCase().includes(kw),
      );
    }
    return result;
  }, [
    detail_state,
    positiveTags,
    negativeTags,
    noTagFilter,
    searchOpposite,
    searchProduct,
  ]);

  useEffect(() => {
    billListTags({ userId })
      .then((res) => {
        setAllTags(res as unknown as TagResponse[]);
      })
      .catch(handleApiError);
  }, [userId]);

  const openTagDialog = (tx: SpendingRecord) => {
    setTagDialogTxId(tx.id);
    setTagDialogSelected((tx.tags || []).map((t) => t.tag_id));
    setTagDialogOpen(true);
  };

  const saveTags = () => {
    if (tagDialogTxId === null) return;
    billSetTransactionTags({
      transactionId: tagDialogTxId,
      requestBody: tagDialogSelected,
    })
      .then((res) => {
        set_detail_state((prev: SpendingRecord[]) =>
          prev.map((r) => (r.id === tagDialogTxId ? { ...r, tags: res } : r)),
        );
        setTagDialogOpen(false);
        setTagDialogTxId(null);
        success("标签已保存");
      })
      .catch(handleApiError);
  };

  const toggleSelection = (id: number) => {
    setSelectedTxIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openBatchTagDialog = () => {
    setBatchAddTagIds([]);
    setBatchRemoveTagIds([]);
    setBatchTagOpen(true);
  };

  const saveBatchTags = () => {
    const txIds = Array.from(selectedTxIds);
    if (txIds.length === 0) return;
    const promises: Promise<any>[] = [];
    if (batchAddTagIds.length > 0) {
      promises.push(
        billBatchAddTags({
          requestBody: { transaction_ids: txIds, tag_ids: batchAddTagIds },
        }),
      );
    }
    if (batchRemoveTagIds.length > 0) {
      promises.push(
        billBatchRemoveTags({
          requestBody: { transaction_ids: txIds, tag_ids: batchRemoveTagIds },
        }),
      );
    }
    if (promises.length === 0) return;
    Promise.all(promises)
      .then(() => {
        set_detail_state((prev) =>
          prev.map((r) => {
            if (!txIds.includes(r.id)) return r;
            let tags = [...(r.tags || [])];
            if (batchRemoveTagIds.length > 0) {
              tags = tags.filter((t) => !batchRemoveTagIds.includes(t.tag_id));
            }
            if (batchAddTagIds.length > 0) {
              for (const tagId of batchAddTagIds) {
                const tag = allTags.find((t) => t.id === tagId);
                if (tag && !tags.some((t) => t.tag_id === tagId)) {
                  tags.push({ tag_id: tagId, tag_name: tag.name });
                }
              }
            }
            return { ...r, tags };
          }),
        );
        setBatchTagOpen(false);
        setSelectedTxIds(new Set());
        success("批量标签操作完成");
      })
      .catch(handleApiError);
  };

  const set_sort = (col: string) => {
    if (col === sort_col) {
      set_sort_order((order) => -1 * order);
    } else {
      set_sort_col(col);
      set_sort_order(1);
    }
  };

  const sortField =
    (field: string) => (a: SpendingRecord, b: SpendingRecord) => {
      const va = (a as any)[field] ?? "";
      const vb = (b as any)[field] ?? "";
      if (field === "amount") return sort_order * (Number(vb) - Number(va));
      return sort_order * (va > vb ? 1 : -1);
    };

  const material_table = () => {
    let table_data: SpendingRecord[] = [...filteredDetail];
    table_data.sort(sortField(sort_col));

    const totalAmount = table_data
      .reduce((sum, r) => sum + Number(r.amount), 0)
      .toFixed(2);
    const totalPages = Math.ceil(table_data.length / PAGE_SIZE);
    const displayPage = Math.max(0, Math.min(totalPages - 1, page));
    const pageData = table_data.slice(
      displayPage * PAGE_SIZE,
      (displayPage + 1) * PAGE_SIZE,
    );

    return (
      <div>
        <h2>
          {query_key} — 总金额: ¥{totalAmount} ({table_data.length} 条)
          {offsetMode &&
            (() => {
              const currentTotal = filteredDetail.reduce(
                (sum, r) => sum + Number(r.amount),
                0,
              );
              const oppositeTotal = offsetDetailState.reduce(
                (sum, r) => sum + Number(r.amount),
                0,
              );
              const net =
                query_in_out === "收入"
                  ? currentTotal - oppositeTotal
                  : oppositeTotal - currentTotal;
              const netStr = net.toFixed(2);
              return (
                <span
                  style={{
                    marginLeft: 16,
                    color: net >= 0 ? "#2e7d32" : "#c62828",
                  }}
                >
                  净额: ¥{netStr}
                </span>
              );
            })()}
        </h2>
        {!offsetMode && (
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div
              style={{ ...styles.canvas, flex: "1 1 480px" }}
              ref={echarts_pie_div}
            ></div>
            <div
              style={{ ...styles.canvas, flex: "1 1 480px" }}
              ref={tag_pie_div}
            ></div>
          </div>
        )}
        <TableContainer component={Paper}>
          <Table
            sx={{ minWidth: 900, tableLayout: "fixed" }}
            size="small"
            aria-label="simple table"
          >
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 40 }} padding="checkbox">
                  <Checkbox
                    checked={
                      pageData.length > 0 &&
                      pageData.every((r) => selectedTxIds.has(r.id))
                    }
                    indeterminate={
                      !pageData.every((r) => selectedTxIds.has(r.id)) &&
                      pageData.some((r) => selectedTxIds.has(r.id))
                    }
                    onChange={() => {
                      if (pageData.every((r) => selectedTxIds.has(r.id))) {
                        setSelectedTxIds((prev) => {
                          const next = new Set(prev);
                          pageData.forEach((r) => next.delete(r.id));
                          return next;
                        });
                      } else {
                        setSelectedTxIds((prev) => {
                          const next = new Set(prev);
                          pageData.forEach((r) => next.add(r.id));
                          return next;
                        });
                      }
                    }}
                  />
                </TableCell>
                <TableCell sx={{ width: 200 }}>
                  <Button size="small" onClick={() => set_sort("time")}>
                    交易时间
                    {sort_col === "time"
                      ? sort_order === 1
                        ? " ↑"
                        : " ↓"
                      : ""}
                  </Button>
                </TableCell>
                <TableCell sx={{ width: 120 }} align="right">
                  <Button size="small" onClick={() => set_sort("amount")}>
                    金额
                    {sort_col === "amount"
                      ? sort_order === 1
                        ? " ↑"
                        : " ↓"
                      : ""}
                  </Button>
                </TableCell>
                <TableCell sx={{ width: "30%" }}>
                  <Button size="small" onClick={() => set_sort("opposite")}>
                    商家
                    {sort_col === "opposite"
                      ? sort_order === 1
                        ? " ↑"
                        : " ↓"
                      : ""}
                  </Button>
                  <input
                    type="text"
                    placeholder="搜索商家..."
                    value={searchOpposite}
                    onChange={(e) => {
                      setSearchOpposite(e.target.value);
                      setPage(0);
                    }}
                    style={{
                      width: "100%",
                      marginTop: 4,
                      padding: "2px 4px",
                      fontSize: 12,
                      border: "1px solid #ccc",
                      borderRadius: 4,
                      boxSizing: "border-box",
                    }}
                  />
                </TableCell>
                <TableCell sx={{ width: "70%" }}>
                  商品说明
                  <input
                    type="text"
                    placeholder="搜索说明..."
                    value={searchProduct}
                    onChange={(e) => {
                      setSearchProduct(e.target.value);
                      setPage(0);
                    }}
                    style={{
                      width: "100%",
                      marginTop: 4,
                      padding: "2px 4px",
                      fontSize: 12,
                      border: "1px solid #ccc",
                      borderRadius: 4,
                      boxSizing: "border-box",
                    }}
                  />
                </TableCell>
                <TableCell sx={{ width: 120 }}>
                  <Button size="small" onClick={() => set_sort("type_")}>
                    交易分类
                    {sort_col === "type_"
                      ? sort_order === 1
                        ? " ↑"
                        : " ↓"
                      : ""}
                  </Button>
                </TableCell>
                <TableCell sx={{ width: 120 }}>数据源</TableCell>
                <TableCell sx={{ width: 140 }}>标签</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pageData.map((element: SpendingRecord) => (
                <TableRow key={element.id} hover>
                  <TableCell sx={{ width: 40 }} padding="checkbox">
                    <Checkbox
                      checked={selectedTxIds.has(element.id)}
                      onChange={() => toggleSelection(element.id)}
                    />
                  </TableCell>
                  <TableCell sx={{ width: 100, wordBreak: "break-word" }}>
                    {element.time?.substr(5)}
                  </TableCell>
                  <TableCell
                    sx={{ width: 120, wordBreak: "break-word" }}
                    align="right"
                  >
                    {offsetMode
                      ? (() => {
                          const isOpposite = offsetDetailState.some(
                            (r) => r.id === element.id,
                          );
                          const val = Number(element.amount);
                          const sign =
                            query_in_out === "收入"
                              ? isOpposite
                                ? "-"
                                : ""
                              : isOpposite
                                ? ""
                                : "-";
                          return (
                            <span
                              style={{
                                color: sign === "-" ? "#c62828" : "#2e7d32",
                              }}
                            >
                              {sign}¥{val.toFixed(2)}
                            </span>
                          );
                        })()
                      : element.amount}
                  </TableCell>
                  <TableCell sx={{ width: "30%", wordBreak: "break-word" }}>
                    {element.opposite}
                  </TableCell>
                  <TableCell
                    sx={{
                      width: "70%",
                      wordBreak: "break-word",
                      cursor: "pointer",
                    }}
                    onClick={() =>
                      setEditingRemark({
                        id: element.id,
                        value: element.remark || "",
                      })
                    }
                  >
                    {editingRemark?.id === element.id ? (
                      <div>
                        <div style={{ color: "#888", fontSize: "0.85em" }}>
                          {element.product}
                        </div>
                        <input
                          type="text"
                          value={editingRemark.value}
                          autoFocus
                          style={{ width: 180, marginTop: 2 }}
                          onChange={(e) =>
                            setEditingRemark({
                              ...editingRemark,
                              value: e.target.value,
                            })
                          }
                          onBlur={() =>
                            saveRemark(element, editingRemark.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              saveRemark(element, editingRemark.value);
                            if (e.key === "Escape") setEditingRemark(null);
                          }}
                        />
                      </div>
                    ) : (
                      <div>
                        <span>{element.product}</span>
                        {element.remark && (
                          <span
                            style={{
                              color: "#666",
                              marginLeft: 8,
                              fontSize: "0.9em",
                            }}
                          >
                            | {element.remark}
                          </span>
                        )}
                        {!element.remark && !element.product && (
                          <span style={{ color: "#bbb" }}>点击添加备注</span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell sx={{ wordBreak: "break-word" }}>
                    {element.type_}
                  </TableCell>
                  <TableCell sx={{ width: 80, wordBreak: "break-word" }}>
                    {element.csvType}
                  </TableCell>
                  <TableCell sx={{ width: 140, wordBreak: "break-word" }}>
                    {(element.tags || []).map((t) => (
                      <Chip
                        key={t.tag_id}
                        label={t.tag_name}
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                    <Button size="small" onClick={() => openTagDialog(element)}>
                      编辑
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            marginTop: 12,
            flexWrap: "wrap",
          }}
        >
          {(() => {
            const p = new Pagination();
            const info = p.setRange(1, totalPages || 1, displayPage + 1);
            return (
              <>
                <Button
                  size="small"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={!info.hasPrev}
                >
                  上一页
                </Button>
                {info.list.map((n: number) => (
                  <Button
                    key={n}
                    size="small"
                    variant={n === displayPage + 1 ? "contained" : "outlined"}
                    onClick={() => setPage(n - 1)}
                  >
                    {n}
                  </Button>
                ))}
                <Button
                  size="small"
                  onClick={() =>
                    setPage((p) => Math.min(Math.max(totalPages - 1, 0), p + 1))
                  }
                  disabled={!info.hasNext}
                >
                  下一页
                </Button>
              </>
            );
          })()}
        </div>
        {selectedTxIds.size > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 8,
              marginTop: 8,
              alignItems: "center",
            }}
          >
            <span>已选择 {selectedTxIds.size} 条</span>
            <Button
              size="small"
              variant="contained"
              onClick={() => {
                setSelectedTxIds(new Set());
              }}
            >
              清除选择
            </Button>
            <Button
              size="small"
              variant="contained"
              color="primary"
              onClick={openBatchTagDialog}
            >
              批量标签
            </Button>
          </div>
        )}
        <Dialog open={tagDialogOpen} onClose={() => setTagDialogOpen(false)}>
          <DialogTitle>编辑标签</DialogTitle>
          <DialogContent>
            <FormGroup>
              {allTags.map((tag) => (
                <FormControlLabel
                  key={tag.id}
                  control={
                    <Checkbox
                      checked={tagDialogSelected.includes(tag.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTagDialogSelected((prev) => [...prev, tag.id]);
                        } else {
                          setTagDialogSelected((prev) =>
                            prev.filter((id) => id !== tag.id),
                          );
                        }
                      }}
                    />
                  }
                  label={`${tag.name} (${tag.count})`}
                />
              ))}
              {allTags.length === 0 && (
                <span>暂无标签，请先在标签管理中创建</span>
              )}
            </FormGroup>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTagDialogOpen(false)}>取消</Button>
            <Button onClick={saveTags} variant="contained" color="primary">
              保存
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog open={batchTagOpen} onClose={() => setBatchTagOpen(false)}>
          <DialogTitle>
            批量标签 - 对已选的 {selectedTxIds.size} 条记录操作
          </DialogTitle>
          <DialogContent>
            <h4>添加标签</h4>
            <FormGroup>
              {allTags.map((tag) => (
                <FormControlLabel
                  key={`add-${tag.id}`}
                  control={
                    <Checkbox
                      checked={batchAddTagIds.includes(tag.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setBatchAddTagIds((prev) => [...prev, tag.id]);
                          setBatchRemoveTagIds((prev) =>
                            prev.filter((id) => id !== tag.id),
                          );
                        } else {
                          setBatchAddTagIds((prev) =>
                            prev.filter((id) => id !== tag.id),
                          );
                        }
                      }}
                    />
                  }
                  label={`${tag.name} (${tag.count})`}
                />
              ))}
              {allTags.length === 0 && <span>暂无标签</span>}
            </FormGroup>
            <h4 style={{ marginTop: 16 }}>移除标签</h4>
            <FormGroup>
              {allTags.map((tag) => (
                <FormControlLabel
                  key={`remove-${tag.id}`}
                  control={
                    <Checkbox
                      checked={batchRemoveTagIds.includes(tag.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setBatchRemoveTagIds((prev) => [...prev, tag.id]);
                          setBatchAddTagIds((prev) =>
                            prev.filter((id) => id !== tag.id),
                          );
                        } else {
                          setBatchRemoveTagIds((prev) =>
                            prev.filter((id) => id !== tag.id),
                          );
                        }
                      }}
                    />
                  }
                  label={`${tag.name} (${tag.count})`}
                />
              ))}
              {allTags.length === 0 && <span>暂无标签</span>}
            </FormGroup>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBatchTagOpen(false)}>取消</Button>
            <Button onClick={saveBatchTags} variant="contained" color="primary">
              执行
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    );
  };

  const activeDetail = useMemo(
    () =>
      offsetMode ? [...filteredDetail, ...offsetDetailState] : filteredDetail,
    [offsetMode, filteredDetail, offsetDetailState],
  );

  useEffect(() => {
    if (offsetMode) {
      const oppositeInOut: InOutType =
        query_in_out === "收入" ? "支出" : "收入";
      const queryFn =
        echarts_title === "月"
          ? billPostMonthQuery
          : echarts_title === "周"
            ? billPostWeekQuery
            : billPostYearQuery;
      queryFn({
        requestBody: { key: query_key, in_out: oppositeInOut },
        userId,
      })
        .then((res) => setOffsetDetailState(res as []))
        .catch(handleApiError);
    }
  }, [offsetMode, query_key, query_in_out, echarts_title, userId, refresh]);

  useEffect(() => {
    if (offsetMode) {
      draw_offset_chart(echarts_div.current, echarts_title, userId);
    } else {
      getInfo(
        echarts_div.current,
        echarts_title,
        set_query_key,
        set_query_in_out,
        setAvailableKeys,
        userId,
      );
    }
  }, [refresh, echarts_title, userId, offsetMode]);

  useEffect(() => {
    if (offsetMode) return; // pie charts hidden in offset mode
    draw_echarts_pie(echarts_pie_div.current, activeDetail);
    draw_tag_pie(tag_pie_div.current, activeDetail, (tagName: string) => {
      if (tagName === "\u{1F3F7} 无标签") {
        setNoTagFilter((prev) => (prev === 1 ? 0 : 1));
      } else {
        const tag = allTags.find((t) => t.name === tagName);
        if (tag) {
          // cycle: off -> positive -> negative -> off
          if (positiveTags.includes(tag.id)) {
            setPositiveTags((prev) => prev.filter((id) => id !== tag.id));
            setNegativeTags((prev) => [...prev, tag.id]);
          } else if (negativeTags.includes(tag.id)) {
            setNegativeTags((prev) => prev.filter((id) => id !== tag.id));
          } else {
            setPositiveTags((prev) => [...prev, tag.id]);
          }
          setNoTagFilter(0);
        }
      }
    });
  }, [refresh, activeDetail, allTags, positiveTags, negativeTags, offsetMode]);

  useEffect(() => {
    setSelectedTxIds(new Set());
  }, [query_key, query_in_out]);

  const fetchData = useCallback(() => {
    if (query_key === "") {
      return;
    }
    const queryFn =
      echarts_title === "月"
        ? billPostMonthQuery
        : echarts_title === "周"
          ? billPostWeekQuery
          : billPostYearQuery;

    queryFn({
      requestBody: {
        key: query_key,
        in_out: query_in_out,
      },
      userId,
    })
      .then((query_response) => {
        const records = filterRecords(
          query_response as SpendingRecord[],
          echarts_title,
        );
        set_detail_state(records);
      })
      .catch(handleApiError);
  }, [query_key, query_in_out, echarts_title, userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refresh]);

  return (
    <>
      <div style={styles.canvas} ref={echarts_div}></div>
      <Box
        sx={{
          display: "flex",
          gap: 1,
          flexWrap: "wrap",
          alignItems: "center",
          mb: 1,
        }}
      >
        {availableKeys.map((k) => (
          <Button
            key={k}
            size="small"
            onClick={() => set_query_key(k)}
            variant={query_key === k ? "contained" : "outlined"}
          >
            {k}
          </Button>
        ))}
      </Box>
      <Box
        sx={{
          display: "flex",
          gap: 1,
          flexWrap: "wrap",
          alignItems: "center",
          mb: 1,
        }}
      >
        {!offsetMode && (
          <>
            <Button
              onClick={() => set_query_in_out("收入")}
              variant={query_in_out === "收入" ? "contained" : "outlined"}
              color="primary"
            >
              收入
            </Button>
            <Button
              onClick={() => set_query_in_out("支出")}
              variant={query_in_out === "支出" ? "contained" : "outlined"}
              color="primary"
            >
              支出
            </Button>
            <Button
              onClick={() => set_query_in_out("不计收支")}
              variant={query_in_out === "不计收支" ? "contained" : "outlined"}
              color="primary"
            >
              不计收支
            </Button>
          </>
        )}
        <FormControlLabel
          control={
            <Switch
              checked={offsetMode}
              onChange={(e) => setOffsetMode(e.target.checked)}
              size="small"
            />
          }
          label="收入-支出"
          sx={{ ml: 2 }}
        />
      </Box>
      <Box
        sx={{
          display: "flex",
          gap: 1,
          mb: 1,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <span>标签筛选:</span>
        <Button
          size="small"
          variant="outlined"
          onClick={() => {
            billListTags({ userId })
              .then((res) => {
                setAllTags(res as unknown as TagResponse[]);
              })
              .catch(handleApiError);
          }}
        >
          刷新
        </Button>
        <Button
          size="small"
          variant={
            getFilterState(TAG_NONE) === 1
              ? "contained"
              : getFilterState(TAG_NONE) === -1
                ? "contained"
                : "outlined"
          }
          color={
            getFilterState(TAG_NONE) === 1
              ? "success"
              : getFilterState(TAG_NONE) === -1
                ? "error"
                : "inherit"
          }
          onClick={() => cycleTagFilter(TAG_NONE)}
        >
          没有tag
          {getFilterState(TAG_NONE) === 1
            ? " ✓"
            : getFilterState(TAG_NONE) === -1
              ? " ✗"
              : ""}
        </Button>
        {allTags.map((tag) => {
          const state = getFilterState(tag.id);
          return (
            <Button
              key={tag.id}
              size="small"
              variant={
                state === 1
                  ? "contained"
                  : state === -1
                    ? "contained"
                    : "outlined"
              }
              color={
                state === 1 ? "success" : state === -1 ? "error" : "inherit"
              }
              onClick={() => cycleTagFilter(tag.id)}
            >
              {tag.name} ({tag.count})
              {state === 1 ? " ✓" : state === -1 ? " ✗" : ""}
            </Button>
          );
        })}
      </Box>
      {material_table()}
      <Fab
        color="primary"
        size="small"
        sx={{ position: "fixed", bottom: 24, right: 24 }}
        onClick={() => {
          fetchData();
          success("数据已刷新");
        }}
      >
        <RefreshIcon />
      </Fab>
    </>
  );
};

export default CommonRecord;
