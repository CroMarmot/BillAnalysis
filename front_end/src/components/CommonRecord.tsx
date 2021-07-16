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

const useStyles = makeStyles({
  table: {
    minWidth: 650,
  },
});

const getInfo = ({
  api_all,
  echarts_div,
  echarts_title,
  set_query_month,
}: {
  api_all: string;
  echarts_div: HTMLDivElement;
  echarts_title: string;
  set_query_month: Function;
}) => {
  return fetch(api_all)
    .then((res) => res.json())
    .then(
      (data: {
        [key: string]: {
          in_cnt: number;
          out_cnt: number;
        };
      }) => {
        // 基于准备好的dom，初始化echarts实例
        const myChart = echarts.init(echarts_div);
        // 使用刚指定的配置项和数据显示图表。
        myChart.setOption({
          title: {
            text: echarts_title,
          },
          tooltip: {},
          legend: {
            data: ["出账"],
          },
          xAxis: {
            data: Object.keys(data),
          },
          yAxis: {},
          series: [
            {
              name: "出账",
              type: "bar",
              data: Object.values(data).map((item) => item.out_cnt / 100),
            },
          ],
        });

        myChart.on("click", ({ dataIndex }: { dataIndex: number }) => {
          set_query_month(Object.keys(data)[dataIndex]);
        });
      }
    );
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
  interface SpendingRecord {
    no: string; // 交易编号
    opposite: string; // 对方
    amount: string; // 金额
    time: string; // 交易时间
    status: string; // 交易状态
    refund: string; // 退款
  }
  const styles = {
    canvas: {
      width: 800,
      height: 600,
    },
  };
  const classes = useStyles();

  const echarts_div = useRef() as React.MutableRefObject<HTMLDivElement>;
  const [detail_state, set_detail_state] = useState([]);
  const [sort_col, set_sort_col] = useState(3);
  // TODO
  const [sort_order, set_sort_order] = useState(1);
  const [query_month, set_query_month] = useState("");

  const ignoreItem = (element: SpendingRecord) => {
    return fetch(api_ignore_no, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        op: "append",
        // TODO alipay wechat
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
        <h2>{query_month}</h2>
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
                      Ignore
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
      set_query_month,
    });
    return () => {
      // cleanup
    };
  }, [refresh, api_all, echarts_title]);

  useEffect(() => {
    if (query_month === "") {
      return;
    }
    fetch(api_query, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key: query_month,
      }),
    })
      .then((res) => res.json())
      .then((query_response) => {
        set_detail_state(query_response);
      });
  }, [refresh, query_month, api_query]);

  return (
    <>
      <div style={styles.canvas} ref={echarts_div}></div>
      {material_table()}
    </>
  );
};

export default CommonRecord;
