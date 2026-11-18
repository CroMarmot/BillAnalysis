import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";

import type { SpendingRecord, TagResponse } from "../fastapiService/types.gen";
import {
  billListTags,
  billSetTransactionTags,
  billUpsertTransactionNote,
  billDeleteTransactionNote,
} from "../fastapiService/services.gen";
import { handleApiError, success } from "../utils/feedbackService";
import { filterRecords } from "../utils/recordFilter";
import { Pagination } from "@cromarmot/pagination";

/* ── pie chart helpers ─────────────────────────────────────────── */

const draw_pie = (
  el: HTMLDivElement,
  title: string,
  records: SpendingRecord[],
  keyFn: (r: SpendingRecord) => [string, number][],
  onClick?: (name: string) => void,
) => {
  const agg: Record<string, number> = {};
  records.forEach((r) => {
    for (const [k, v] of keyFn(r)) {
      agg[k] = Number(((agg[k] || 0) + v).toFixed(2));
    }
  });
  const data = Object.entries(agg)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const chart = echarts.init(el);
  chart.setOption(
    {
      title: { text: title, left: "center", top: 5 },
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
          name: title,
          type: "pie",
          radius: "70%",
          center: ["50%", "45%"],
          data,
        },
      ],
    },
    true,
  );
  if (onClick) {
    chart.on("click", (params: { name: string }) => onClick(params.name));
  }
  return chart;
};

const byOpposite = (r: SpendingRecord): [string, number][] => [
  [r.opposite || "未知", Number(r.amount)],
];

const byTag = (r: SpendingRecord): [string, number][] => {
  const tags = r.tags || [];
  if (tags.length === 0) return [["\u{1F3F7} 无标签", Number(r.amount)]];
  return tags.map((t) => [t.tag_name, Number(r.amount)]);
};

/* ── component ─────────────────────────────────────────────────── */

interface Props {
  records: SpendingRecord[];
  userId: number;
  title?: string;
}

const RecordDetailPanel = ({ records, userId, title }: Props) => {
  const pieOppositeRef = useRef<HTMLDivElement>(null!);
  const pieTagRef = useRef<HTMLDivElement>(null!);

  const [sortCol, setSortCol] = useState("time");
  const [sortOrder, setSortOrder] = useState(1);
  const [searchOpposite, setSearchOpposite] = useState("");
  const [searchProduct, setSearchProduct] = useState("");
  const [searchTag, setSearchTag] = useState("");
  const [noTagFilter, setNoTagFilter] = useState<0 | 1 | -1>(0); // 0=off, 1=only no-tag, -1=exclude no-tag
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  /* tag editing */
  const [allTags, setAllTags] = useState<TagResponse[]>([]);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [tagDialogTxId, setTagDialogTxId] = useState<number | null>(null);
  const [tagDialogSelected, setTagDialogSelected] = useState<number[]>([]);

  /* remark editing */
  const [editingRemark, setEditingRemark] = useState<{
    id: number;
    value: string;
  } | null>(null);

  useEffect(() => {
    billListTags({ userId })
      .then((res) => setAllTags(res as unknown as TagResponse[]))
      .catch(handleApiError);
  }, [userId]);

  /* filter */
  const filtered = useMemo(() => {
    let r = filterRecords(records, title);
    if (searchOpposite) {
      const kw = searchOpposite.toLowerCase();
      r = r.filter((x) => (x.opposite || "").toLowerCase().includes(kw));
    }
    if (searchProduct) {
      const kw = searchProduct.toLowerCase();
      r = r.filter((x) => (x.product || "").toLowerCase().includes(kw));
    }
    if (searchTag) {
      const kw = searchTag.toLowerCase();
      r = r.filter((x) =>
        (x.tags || []).some((t) => t.tag_name.toLowerCase().includes(kw)),
      );
    }
    if (noTagFilter === 1) {
      r = r.filter((x) => (x.tags || []).length === 0);
    } else if (noTagFilter === -1) {
      r = r.filter((x) => (x.tags || []).length > 0);
    }
    return r;
  }, [records, searchOpposite, searchProduct, searchTag, noTagFilter, title]);

  /* sort */
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const va = (a as any)[sortCol] ?? "";
      const vb = (b as any)[sortCol] ?? "";
      if (sortCol === "amount") return sortOrder * (Number(vb) - Number(va));
      return sortOrder * (va > vb ? 1 : -1);
    });
    return arr;
  }, [filtered, sortCol, sortOrder]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const displayPage = Math.max(0, Math.min(totalPages - 1, page));
  const pageData = sorted.slice(
    displayPage * PAGE_SIZE,
    (displayPage + 1) * PAGE_SIZE,
  );

  const totalAmount = sorted
    .reduce((s, r) => s + Number(r.amount), 0)
    .toFixed(2);

  /* charts */
  useEffect(() => {
    if (!pieOppositeRef.current || !pieTagRef.current) return;
    const c1 = draw_pie(pieOppositeRef.current, "按商家", filtered, byOpposite);
    const c2 = draw_pie(
      pieTagRef.current,
      "按标签",
      filtered,
      byTag,
      (name: string) => {
        if (name === "\u{1F3F7} 无标签") {
          setNoTagFilter((prev) => (prev === 1 ? 0 : 1));
          setSearchTag("");
        } else {
          setSearchTag(name);
          setNoTagFilter(0);
        }
        setPage(0);
      },
    );
    return () => {
      c1.dispose();
      c2.dispose();
    };
  }, [filtered]);

  const setSort = (col: string) => {
    if (col === sortCol) setSortOrder((o) => -o);
    else {
      setSortCol(col);
      setSortOrder(1);
    }
  };

  const sortIndicator = (col: string) =>
    sortCol === col ? (sortOrder === 1 ? " ↑" : " ↓") : "";

  /* tag dialog */
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
        // records is a prop, we can't update it directly
        // but we can trigger a re-render by mutating the tag data
        const idx = records.findIndex((r) => r.id === tagDialogTxId);
        if (idx >= 0) records[idx].tags = res;
        setTagDialogOpen(false);
        success("标签已保存");
      })
      .catch(handleApiError);
  };

  /* remark */
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
          element.remark = value.trim();
        })
        .catch(handleApiError);
    } else if (!value.trim() && element.remark) {
      billDeleteTransactionNote({
        source: element.csvType,
        orderNo: element.no,
        userId,
      })
        .then(() => {
          element.remark = "";
        })
        .catch(handleApiError);
    }
  };

  const searchInputStyle = {
    width: "100%" as const,
    marginTop: 4,
    padding: "2px 4px",
    fontSize: 12,
    border: "1px solid #ccc",
    borderRadius: 4,
    boxSizing: "border-box" as const,
  };

  const canvasStyle = { width: 1000, height: 600, margin: "0 auto" };

  return (
    <div>
      <h2>
        {title ? `${title} — ` : ""}总金额: ¥{totalAmount} ({sorted.length} 条)
      </h2>
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
        <div
          style={{ ...canvasStyle, flex: "1 1 480px" }}
          ref={pieOppositeRef}
        />
        <div style={{ ...canvasStyle, flex: "1 1 480px" }} ref={pieTagRef} />
      </Box>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 900, tableLayout: "fixed" }} size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 200 }}>
                <Button size="small" onClick={() => setSort("time")}>
                  交易时间{sortIndicator("time")}
                </Button>
              </TableCell>
              <TableCell sx={{ width: 80 }} align="right">
                <Button size="small" onClick={() => setSort("amount")}>
                  金额{sortIndicator("amount")}
                </Button>
              </TableCell>
              <TableCell sx={{ width: "30%" }}>
                <Button size="small" onClick={() => setSort("opposite")}>
                  商家{sortIndicator("opposite")}
                </Button>
                <input
                  type="text"
                  placeholder="搜索商家..."
                  value={searchOpposite}
                  onChange={(e) => {
                    setSearchOpposite(e.target.value);
                    setPage(0);
                  }}
                  style={searchInputStyle}
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
                  style={searchInputStyle}
                />
              </TableCell>
              <TableCell sx={{ width: 120 }}>
                <Button size="small" onClick={() => setSort("type_")}>
                  交易分类{sortIndicator("type_")}
                </Button>
              </TableCell>
              <TableCell sx={{ width: 80 }}>数据源</TableCell>
              <TableCell sx={{ width: 180 }}>
                标签
                <input
                  type="text"
                  placeholder="搜索标签..."
                  value={searchTag}
                  onChange={(e) => {
                    setSearchTag(e.target.value);
                    setNoTagFilter(0);
                    setPage(0);
                  }}
                  style={searchInputStyle}
                />
                <Button
                  size="small"
                  variant={
                    noTagFilter === 1
                      ? "contained"
                      : noTagFilter === -1
                        ? "contained"
                        : "outlined"
                  }
                  color={
                    noTagFilter === 1
                      ? "success"
                      : noTagFilter === -1
                        ? "error"
                        : "inherit"
                  }
                  sx={{
                    mt: 0.5,
                    fontSize: 11,
                    minWidth: 0,
                    padding: "1px 6px",
                  }}
                  onClick={() => {
                    setNoTagFilter(
                      (prev) => (((prev + 2) % 3) - 1) as 0 | 1 | -1,
                    );
                    setSearchTag("");
                    setPage(0);
                  }}
                >
                  无标签
                  {noTagFilter === 1 ? " ✓" : noTagFilter === -1 ? " ✗" : ""}
                </Button>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageData.map((el: SpendingRecord) => (
              <TableRow key={el.id} hover>
                <TableCell sx={{ width: 100, wordBreak: "break-word" }}>
                  {el.time?.substr(5)}
                </TableCell>
                <TableCell
                  sx={{ width: 80, wordBreak: "break-word" }}
                  align="right"
                >
                  {el.amount}
                </TableCell>
                <TableCell sx={{ width: "30%", wordBreak: "break-word" }}>
                  {el.opposite}
                </TableCell>
                <TableCell
                  sx={{
                    width: "70%",
                    wordBreak: "break-word",
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    setEditingRemark({ id: el.id, value: el.remark || "" })
                  }
                >
                  {editingRemark?.id === el.id ? (
                    <div>
                      <div style={{ color: "#888", fontSize: "0.85em" }}>
                        {el.product}
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
                        onBlur={() => saveRemark(el, editingRemark.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            saveRemark(el, editingRemark.value);
                          if (e.key === "Escape") setEditingRemark(null);
                        }}
                      />
                    </div>
                  ) : (
                    <div>
                      <span>{el.product}</span>
                      {el.remark && (
                        <span
                          style={{
                            color: "#666",
                            marginLeft: 8,
                            fontSize: "0.9em",
                          }}
                        >
                          | {el.remark}
                        </span>
                      )}
                      {!el.remark && !el.product && (
                        <span style={{ color: "#bbb" }}>点击添加备注</span>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell sx={{ wordBreak: "break-word" }}>
                  {el.type_}
                </TableCell>
                <TableCell sx={{ width: 80, wordBreak: "break-word" }}>
                  {el.csvType}
                </TableCell>
                <TableCell sx={{ width: 140, wordBreak: "break-word" }}>
                  {(el.tags || []).map((t) => (
                    <Chip
                      key={t.tag_id}
                      label={t.tag_name}
                      size="small"
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  ))}
                  <Button size="small" onClick={() => openTagDialog(el)}>
                    编辑
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* pagination */}
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

      {/* tag dialog */}
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
            {allTags.length === 0 && <span>暂无标签</span>}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTagDialogOpen(false)}>取消</Button>
          <Button onClick={saveTags} variant="contained" color="primary">
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default RecordDetailPanel;
