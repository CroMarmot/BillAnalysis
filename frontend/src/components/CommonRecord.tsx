import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";
import Button from "@material-ui/core/Button";

import { makeStyles } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Paper from "@material-ui/core/Paper";
import { SpendingRecord } from "../interfaces/SpendingRecord";

const useStyles = makeStyles({
  table: {
    minWidth: 650,
  },
});

const getInfo = ({
  api_all,
  echarts_div,
  echarts_title,
  set_query_key,
  set_query_in_out,
}: {
  api_all: string;
  echarts_div: HTMLDivElement;
  echarts_title: string;
    set_query_key: Function;
    set_query_in_out: Function;
}) => {
  return fetch(api_all)
    .then((res) => res.json())
    .then(
      (data: {
        [key: string]: {
          [key: string]: {
            in_cnt: number;
            out_cnt: number;
          };
        };
      }) => {
        // 基于准备好的dom，初始化echarts实例
        const myChart = echarts.init(echarts_div);
        // TODO 月份对齐
        const keysSet = new Set<string>();
        Object.entries(data).forEach(([csvType, csvData]) => {
          Object.keys(csvData).forEach((key) => {
            keysSet.add(key);
          });
        });
        const keysArr: string[] = Array.from(keysSet);
        keysArr.sort();

        // 使用刚指定的配置项和数据显示图表。
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
            data: Object.keys(data),
            left: "10%",
          },
          toolbox: {
            feature: {
              magicType: {
                type: ["stack"],
              },
            },
          },
          series: [
            {
              name: "Alipay收入",
              type: "bar",
              stack: "two",
              data: keysArr.map((key) => data["Alipay"][key]?.in_cnt / 100),
            },
            {
              name: "Wechat收入",
              type: "bar",
              stack: "two",
              data: keysArr.map((key) => data["Wechat"][key]?.in_cnt / 100),
            },
            {
              name: "Alipay支出",
              type: "bar",
              stack: "one",
              data: keysArr.map((key) => data["Alipay"][key]?.out_cnt / 100),
            },
            {
              name: "Wechat支出",
              type: "bar",
              stack: "one",
              data: keysArr.map((key) => data["Wechat"][key]?.out_cnt / 100),
            },
          ],
        });

        myChart.on("click", (r: { dataIndex: number, seriesName: string }) => {
          if (r.seriesName.endsWith('支出')) {
            set_query_in_out('支出');
          } else if (r.seriesName.endsWith('收入')) {
            set_query_in_out('收入');
          }
          set_query_key(keysArr[r.dataIndex]);
        });
      }
    );
};

const draw_echarts_pie = ({
  echarts_div,
  detail_state,
}: {
  echarts_div: HTMLDivElement;
  detail_state: SpendingRecord[];
}) => {
  let opposite2count: { [key: string]: number } = {};
  detail_state.forEach((item) => {
    if (!opposite2count[item.opposite]) {
      opposite2count[item.opposite] = 0;
    }
    opposite2count[item.opposite] = Number(
      (opposite2count[item.opposite] + Number(item.amount)).toFixed(2)
    );
  });
  let data = Object.keys(opposite2count).map((key) => ({
    value: opposite2count[key],
    name: key,
  }));
  data.sort((a, b) => b.value - a.value);

  const myChart = echarts.init(echarts_div);
  // 使用刚指定的配置项和数据显示图表。
  myChart.setOption({
    title: {
      text: "详情",
      left: "center",
    },
    tooltip: {
      trigger: "item",
    },
    legend: {
      type: "scroll",
      orient: "vertical",
      right: 10,
      top: 20,
      bottom: 20,
      left: "left",
    },
    series: [
      {
        name: "详情",
        type: "pie",
        radius: "50%",
        data,
      },
    ],
  });
  return;
};

const CommonRecord = ({
  api_all,
  api_query,
  api_ignore_no,
  echarts_title,
  refresh,
  updateFn,
}: {
  api_all: string;
  api_query: string;
  api_ignore_no: string;
  echarts_title: string;
  refresh: Object;
  updateFn: Function;
}) => {
  const styles = {
    canvas: {
      width: 1000,
      height: 600,
    },
  };
  const classes = useStyles();

  const echarts_div = useRef() as React.MutableRefObject<HTMLDivElement>;
  const echarts_pie_div = useRef() as React.MutableRefObject<HTMLDivElement>;
  const [detail_state, set_detail_state] = useState([]);
  const [sort_col, set_sort_col] = useState(3);
  const [sort_order, set_sort_order] = useState(1);
  const [query_key, set_query_key] = useState("");
  const [query_in_out, set_query_in_out] = useState("支出");

  const ignoreItem = (element: SpendingRecord) => {
    return fetch(api_ignore_no, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        op: "append",
        // TODO alipay wechat
        csvType: element.csvType,
        no: element.no,
      }),
    })
      .then((res) => res.json())
      .then((r) => {
        if (r.status === 200) {
          updateFn();
        }
      });
  };

  const set_sort = (col: number) => {
    if (col === sort_col) {
      set_sort_order((order) => -1 * order);
    } else {
      set_sort_col(col);
      set_sort_order(1);
    }
  };

  const material_table = () => {
    const table_data: SpendingRecord[] = detail_state;
    // 商家
    if (sort_col === 1) {
      table_data.sort(
        (item_a, item_b) =>
          sort_order * (item_a.opposite > item_b.opposite ? 1 : -1)
      );
    } else if (sort_col === 2) {
      // 金额
      table_data.sort(
        (item_a, item_b) =>
          sort_order * (Number(item_b.amount) - Number(item_a.amount))
      );
    } else if (sort_col === 3) {
      // 交易时间
      table_data.sort(
        (item_a, item_b) => sort_order * (item_a.time > item_b.time ? 1 : -1)
      );
    }

    return (
      <div>
        <h2>{query_key}</h2>
        <div style={styles.canvas} ref={echarts_pie_div}></div>
        <TableContainer component={Paper}>
          <Table
            className={classes.table}
            size="small"
            aria-label="simple table"
          >
            <TableHead>
              <TableRow>
                <TableCell></TableCell>
                <TableCell>
                  <button onClick={() => set_sort(1)}>商家</button>
                </TableCell>
                <TableCell align="right">
                  <button onClick={() => set_sort(2)}>金额</button>
                </TableCell>
                <TableCell>
                  <button onClick={() => set_sort(3)}>交易时间</button>
                </TableCell>
                <TableCell align="right">状态</TableCell>
                <TableCell align="right">退款</TableCell>
                <TableCell>CSV TYPE</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {table_data.map((element: SpendingRecord) => (
                <TableRow key={element.no}>
                  <TableCell>
                    <Button
                      onClick={() => ignoreItem(element)}
                      variant="contained"
                      color="primary"
                    >
                      忽略
                    </Button>
                  </TableCell>
                  <TableCell>{element.opposite}</TableCell>
                  <TableCell align="right">{element.amount}</TableCell>
                  <TableCell>{element.time?.substr(5)}</TableCell>
                  <TableCell align="right">
                    {element.status !== "交易成功" ? `${element.status}` : ""}
                  </TableCell>
                  <TableCell align="right">
                    {Number(element.refund) !== 0 ? `${element.refund}` : ""}
                  </TableCell>
                  <TableCell>{element.csvType}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    );
  };

  useEffect(() => {
    getInfo({
      api_all,
      echarts_div: echarts_div.current,
      echarts_title,
      set_query_key,
      set_query_in_out,
    });
    return () => {
      // cleanup
    };
  }, [refresh, api_all, echarts_title]);

  useEffect(() => {
    draw_echarts_pie({
      echarts_div: echarts_pie_div.current,
      detail_state,
    });
    return () => { };
  }, [refresh, detail_state]);

  useEffect(() => {
    if (query_key === "") {
      return;
    }
    fetch(api_query, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key: query_key,
        in_out: query_in_out,
      }),
    })
      .then((res) => res.json())
      .then((query_response) => {
        set_detail_state(query_response);
      });
  }, [refresh, query_key, query_in_out, api_query]);

  return (
    <>
      <div style={styles.canvas} ref={echarts_div}></div>
      <h1>
        <Button
          onClick={() => set_query_in_out('收入')}
          variant="contained"
          color={query_in_out === '收入' ? "primary" : 'default'}
        >
          收入
        </Button>
        <Button
          onClick={() => set_query_in_out('支出')}
          variant="contained"
          color={query_in_out === '支出' ? "primary" : 'default'}
        >
          支出
        </Button>
      </h1>
      {material_table()}
    </>
  );
};

export default CommonRecord;
