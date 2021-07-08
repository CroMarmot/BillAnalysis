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

const getIgnoreList = ({
  url_prefix,
  ignore_table,
}: {
  url_prefix: string;
  ignore_table: HTMLElement;
}) => {
  ignore_table.innerHTML = "";
  fetch(`${url_prefix}/api/ignore_list`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  })
    .then((res) => res.json())
    .then((r) => {
      r.forEach((element) => {
        ignore_table.appendChild(
          genTr([
            genTd(
              genButton("Cancel Ignore", () => {
                fetch(`${url_prefix}/api/ignore_no`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    op: "remove",
                    no: element[0],
                  }),
                })
                  .then((res) => res.json())
                  .then((r) => {
                    if (r.status == 200) {
                      // TODO refresh_page();
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
    });
};

export default function IgnoreList({ url_prefix }: { url_prefix: string }) {
  const styles = {
    canvas: {
      width: 600,
      height: 400,
    },
  };
  const ignore_table = useRef() as React.MutableRefObject<HTMLTableElement>;

  useEffect(() => {
    getIgnoreList({
      url_prefix,
      ignore_table: ignore_table.current,
    });
    return () => {
      // cleanup
    };
  }, []);

  return (
    <>
      <h2>Ignore List</h2>
      <table ref={ignore_table}></table>
    </>
  );
}
