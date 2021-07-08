import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";

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
    .then((data) => {
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

      myChart.on("click", ({ dataIndex }) => {
        set_query_month(Object.keys(data)[dataIndex]);
      });
    });
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
      width: 600,
      height: 400,
    },
  };
  const echarts_div = useRef() as React.MutableRefObject<HTMLDivElement>;
  const [detail_state, set_detail_state] = useState([]);
  const [sort_col, set_sort_col] = useState(3);
  // TODO
  const [sort_order, set_sort_order] = useState(1);
  const [query_month, set_query_month] = useState("");

  const ignoreItem = (element: string[]) => {
    return fetch(api_ignore_no, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        op: "append",
        no: element[0],
      }),
    })
      .then((res) => res.json())
      .then((r) => {
        if (r.status == 200) {
          updateFn();
        }
      });
  };

  const set_sort = (col: number) => {
    if (col == sort_col) {
      set_sort_order((order) => -1 * order);
    } else {
      set_sort_col(col);
      set_sort_order(1);
    }
  };

  const tbody_rows = () => {
    const table_data = detail_state;
    // 商家
    if (sort_col === 1) {
      table_data.sort(
        (item_a, item_b) => sort_order * (item_a[7] > item_b[7] ? 1 : -1)
      );
    } else if (sort_col === 2) {
      // 金额
      table_data.sort(
        (item_a, item_b) => sort_order * (Number(item_b[9]) - Number(item_a[9]))
      );
    } else if (sort_col === 3) {
      // 交易时间
      table_data.sort(
        (item_a, item_b) => sort_order * (item_a[2] > item_b[2] ? 1 : -1)
      );
    }
    return table_data.map((element: string[]) => (
      <tr key={element[0]}>
        <td>
          <button onClick={() => ignoreItem(element)}>Ignore</button>
        </td>
        <td>{element[7]}</td>
        <td>{element[9]}</td>
        <td>{element[2].substr(5)}</td>
        <td>{element[11] !== "交易成功" ? `${element[11]}` : ""}</td>
        <td>{Number(element[13]) !== 0 ? `${element[13]}` : ""}</td>
      </tr>
    ));
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
  }, [refresh]);

  useEffect(() => {
    if (query_month == "") {
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
  }, [refresh, query_month]);

  return (
    <>
      <div style={styles.canvas} ref={echarts_div}></div>
      <table>
        <thead>
          <tr>
            <th></th>
            <th>
              <button onClick={() => set_sort(1)}>商家</button>
            </th>
            <th>
              <button onClick={() => set_sort(2)}>金额</button>
            </th>
            <th>
              <button onClick={() => set_sort(3)}>交易时间</button>
            </th>
          </tr>
        </thead>
        <tbody>{tbody_rows()}</tbody>
      </table>
    </>
  );
};

export default CommonRecord;
