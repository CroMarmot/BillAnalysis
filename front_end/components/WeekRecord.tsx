import { useEffect, useRef } from "react";
import * as echarts from "echarts";

const genTr = (elements) => {
  const tr = document.createElement("tr");
  elements.forEach((element) => {
    tr.append(element);
  });
  return tr;
};

const genSpan = (textContent) => {
  const el = document.createElement("span");
  el.textContent = textContent;
  return el;
};

const genH1 = (textContent) => {
  const el = document.createElement("h1");
  el.textContent = textContent;
  return el;
};

const genButton = (textContent, click_cb) => {
  const button = document.createElement("button");
  button.textContent = textContent;
  button.addEventListener("click", click_cb);
  return button;
};

const genTd = (text_content_or_element) => {
  const el = document.createElement("td");
  if (typeof text_content_or_element === "string") {
    el.textContent = text_content_or_element;
  } else {
    el.appendChild(text_content_or_element);
  }
  return el;
};

const genTh = (text_content_or_element) => {
  const el = document.createElement("th");
  if (typeof text_content_or_element === "string") {
    el.textContent = text_content_or_element;
  } else {
    el.appendChild(text_content_or_element);
  }
  return el;
};

const query_and_draw_table = (
  url_prefix,
  api,
  query_json,
  title_el,
  table_el
) => {
  return fetch(api, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(query_json),
  })
    .then((res) => res.json())
    .then((query_response) => {
      const draw_table = (table_data) => {
        table_el.innerHTML = "";
        table_el.appendChild(
          genTr([
            genTd(""),
            genTd(
              genButton("商家", () => {
                // TODO 增加 remark功能
                // TODO 专门一个位置做数组下标抽象
                table_data.sort((item_a, item_b) =>
                  item_a[7] > item_b[7] ? 1 : -1
                );
                draw_table(table_data);
              })
            ),
            genTd(
              genButton("金额", () => {
                table_data.sort(
                  (item_a, item_b) => Number(item_b[9]) - Number(item_a[9])
                );
                draw_table(table_data);
              })
            ),
            genTd(
              genButton("交易时间", () => {
                table_data.sort((item_a, item_b) =>
                  item_a[2] > item_b[2] ? 1 : -1
                );
                draw_table(table_data);
              })
            ),
          ])
        );
        table_data.forEach((element) => {
          // TODO string safe
          table_el.appendChild(
            genTr([
              genTd(
                genButton("Ignore", () => {
                  fetch(`${url_prefix}/api/ignore_no`, {
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
                        // TODO refresh_page();
                        query_and_draw_table(
                          url_prefix,
                          api,
                          query_json,
                          title_el,
                          table_el
                        );
                      }
                    });
                })
              ),
              genTd(`${element[7]}`),
              genTd(`${element[9]}`),
              genTd(`${element[2].substr(5)}`),
              genTd(element[11] !== "交易成功" ? `${element[11]}` : ""),
              genTd(Number(element[13]) !== 0 ? `${element[13]}` : ""),
            ])
          );
        });
      };

      draw_table(query_response);
    });
};

const getInfo = function ({
  api_all,
  api_query,
  echarts_div,
  echarts_title,
  detail_div,
}: {
  api_all: string;
  api_query: string;
  echarts_div: HTMLElement;
  echarts_title: string;
  detail_div: HTMLElement;
}) {
  return fetch(api_all)
    .then((res) => res.json())
    .then((data) => {
      detail_div.innerHTML = "";
      const table = document.createElement("table");
      const title = genH1("");
      detail_div.appendChild(title);
      detail_div.appendChild(table);
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
        query_and_draw_table(
          url_prefix,
          api_query,
          {
            key: Object.keys(data)[dataIndex],
          },
          title,
          table
        );
      });
    });
};

export default function WeekRecord({ url_prefix }: { url_prefix: string }) {
  const styles = {
    canvas: {
      width: 600,
      height: 400,
    },
  };
  const echarts_div = useRef() as React.MutableRefObject<HTMLDivElement>;
  const detail_div = useRef() as React.MutableRefObject<HTMLTableElement>;

  useEffect(() => {
    getInfo({
      api_all: `${url_prefix}/api/week`,
      api_query: `${url_prefix}/api/week_query`,
      echarts_div: echarts_div.current,
      echarts_title: "月出账",
      detail_div: detail_div.current,
    });
    return () => {
      // cleanup
    };
  }, []);

  return (
    <>
      <div style={styles.canvas} ref={echarts_div}></div>
      <h1>First Post</h1>
      <table ref={detail_div}></table>
    </>
  );
}
