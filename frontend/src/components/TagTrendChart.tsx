import { useCallback, useEffect, useRef, useState } from "react";
import * as echarts from "echarts";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import Box from "@mui/material/Box";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Switch from "@mui/material/Switch";

import {
  billListTags,
  billPostTagTrend,
  billPostTagQuery,
} from "../fastapiService/services.gen";
import type {
  TagResponse,
  TagTrendResponse,
  InOutType,
  SpendingRecord,
} from "../fastapiService/types.gen";
import { handleApiError } from "../utils/apiErrorHandler";
import RecordDetailPanel from "./RecordDetailPanel";

type PeriodType = "week" | "month" | "year";
type ChartType = "bar" | "line";

const PERIOD_LABELS: Record<PeriodType, string> = {
  week: "周",
  month: "月",
  year: "年",
};

const TagTrendChart = ({ userId }: { userId: number }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [allTags, setAllTags] = useState<TagResponse[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [period, setPeriod] = useState<PeriodType>("month");
  const [inOut, setInOut] = useState<InOutType>("支出");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [offsetMode, setOffsetMode] = useState(false);
  const [trendData, setTrendData] = useState<TagTrendResponse[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRecords, setDetailRecords] = useState<SpendingRecord[]>([]);
  const [detailTitle, setDetailTitle] = useState("");

  const styles = {
    canvas: { width: 1000, height: 600, margin: "0 auto" },
  };

  // Load tags
  useEffect(() => {
    billListTags({ userId })
      .then((res) => setAllTags(res as unknown as TagResponse[]))
      .catch(handleApiError);
  }, [userId]);

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId],
    );
  };

  const fetchData = useCallback(() => {
    if (selectedTagIds.length === 0) {
      setTrendData([]);
      return;
    }

    if (offsetMode) {
      // Fetch both income and expense, compute net
      Promise.all([
        billPostTagTrend({
          requestBody: { tag_ids: selectedTagIds, period, in_out: "收入" },
          userId,
        }),
        billPostTagTrend({
          requestBody: { tag_ids: selectedTagIds, period, in_out: "支出" },
          userId,
        }),
      ])
        .then(([incomeRes, expenseRes]) => {
          const incomeData = incomeRes as unknown as TagTrendResponse[];
          const expenseData = expenseRes as unknown as TagTrendResponse[];
          // Merge: net = income - expense per tag, including all periods
          const merged: TagTrendResponse[] = [];
          const allTagIds = new Set([
            ...incomeData.map((d) => d.tag_id),
            ...expenseData.map((d) => d.tag_id),
          ]);
          allTagIds.forEach((tagId) => {
            const inc = incomeData.find((d) => d.tag_id === tagId);
            const exp = expenseData.find((d) => d.tag_id === tagId);
            const incMap = new Map(
              (inc?.data || []).map((d) => [d.period, d.amount]),
            );
            const expMap = new Map(
              (exp?.data || []).map((d) => [d.period, d.amount]),
            );
            const allPeriods = new Set([
              ...Array.from(incMap.keys()),
              ...Array.from(expMap.keys()),
            ]);
            const data = Array.from(allPeriods)
              .sort()
              .map((p) => ({
                period: p,
                amount: (incMap.get(p) || 0) - (expMap.get(p) || 0),
              }));
            merged.push({
              tag_id: tagId,
              tag_name: (inc || exp)!.tag_name,
              data,
            });
          });
          setTrendData(merged);
        })
        .catch(handleApiError);
    } else {
      billPostTagTrend({
        requestBody: { tag_ids: selectedTagIds, period, in_out: inOut },
        userId,
      })
        .then((res) => setTrendData(res as unknown as TagTrendResponse[]))
        .catch(handleApiError);
    }
  }, [selectedTagIds, period, inOut, offsetMode, userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Render chart
  useEffect(() => {
    if (!chartRef.current) return;
    const myChart = echarts.init(chartRef.current);

    // Collect all periods
    const periodsSet = new Set<string>();
    trendData.forEach((t) => t.data.forEach((d) => periodsSet.add(d.period)));
    const periods = Array.from(periodsSet).sort();

    const series = trendData.map((tagData) => ({
      name: tagData.tag_name,
      type: chartType,
      data: periods.map((p) => {
        const item = tagData.data.find((d) => d.period === p);
        return item ? item.amount / 100 : 0;
      }),
    }));

    myChart.setOption(
      {
        title: {
          text: offsetMode ? "标签趋势 (收入-支出)" : `标签趋势 (${inOut})`,
        },
        tooltip: { trigger: "axis" },
        legend: { left: "10%" },
        xAxis: { data: periods },
        yAxis: {},
        series,
      },
      true,
    );

    // Click handler
    myChart.on("click", (params: { seriesName: string; dataIndex: number }) => {
      const tagName = params.seriesName;
      const periodKey = periods[params.dataIndex];
      const tag = allTags.find((t) => t.name === tagName);
      if (!tag) return;

      const queryInOut = offsetMode ? "支出" : inOut;
      billPostTagQuery({
        requestBody: {
          tag_id: tag.id,
          period,
          key: periodKey,
          in_out: queryInOut,
        },
        userId,
      })
        .then((res) => {
          setDetailRecords(res as unknown as SpendingRecord[]);
          setDetailTitle(`${tagName} | ${periodKey} | ${queryInOut}`);
          setDetailOpen(true);
        })
        .catch(handleApiError);
    });

    return () => myChart.dispose();
  }, [trendData, chartType, offsetMode, inOut, allTags, period, userId]);

  return (
    <div>
      {/* Tag selection */}
      <Box sx={{ mb: 2 }}>
        <h4>选择标签:</h4>
        <FormGroup row>
          {allTags.map((tag) => (
            <FormControlLabel
              key={tag.id}
              control={
                <Checkbox
                  checked={selectedTagIds.includes(tag.id)}
                  onChange={() => toggleTag(tag.id)}
                />
              }
              label={`${tag.name} (${tag.count})`}
            />
          ))}
        </FormGroup>
      </Box>

      {/* Controls */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 2,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {/* Period */}
        <ToggleButtonGroup
          value={period}
          exclusive
          onChange={(_, v) => v && setPeriod(v)}
          size="small"
        >
          {(Object.keys(PERIOD_LABELS) as PeriodType[]).map((p) => (
            <ToggleButton key={p} value={p}>
              {PERIOD_LABELS[p]}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        {/* Chart type */}
        <ToggleButtonGroup
          value={chartType}
          exclusive
          onChange={(_, v) => v && setChartType(v)}
          size="small"
        >
          <ToggleButton value="bar">柱状图</ToggleButton>
          <ToggleButton value="line">折线图</ToggleButton>
        </ToggleButtonGroup>

        {/* In/Out selection (disabled in offset mode) */}
        {!offsetMode && (
          <ToggleButtonGroup
            value={inOut}
            exclusive
            onChange={(_, v) => v && setInOut(v)}
            size="small"
          >
            <ToggleButton value="收入">收入</ToggleButton>
            <ToggleButton value="支出">支出</ToggleButton>
            <ToggleButton value="不计收支">不计收支</ToggleButton>
          </ToggleButtonGroup>
        )}

        {/* Offset toggle */}
        <FormControlLabel
          control={
            <Switch
              checked={offsetMode}
              onChange={(e) => setOffsetMode(e.target.checked)}
            />
          }
          label="收入-支出"
        />

        <Button size="small" variant="outlined" onClick={fetchData}>
          刷新
        </Button>
      </Box>

      {/* Chart */}
      <div style={styles.canvas} ref={chartRef}></div>

      {/* Detail dialog */}
      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>{detailTitle}</DialogTitle>
        <DialogContent>
          <RecordDetailPanel records={detailRecords} userId={userId} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TagTrendChart;
