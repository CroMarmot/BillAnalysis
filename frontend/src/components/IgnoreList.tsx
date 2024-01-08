import { useEffect, useState } from "react";
import Button from "@material-ui/core/Button";
import { SpendingRecord } from "../interfaces/SpendingRecord";

const getIgnoreList = ({
  url_prefix,
  set_ignore_list,
}: {
  url_prefix: string;
  set_ignore_list: Function;
}) => {
  fetch(`${url_prefix}/api/ignore_list`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  })
    .then((res) => res.json())
    .then((r: SpendingRecord[]) => {
      set_ignore_list(r);
    });
};

const IgnoreList = ({
  url_prefix,
  refresh,
  updateFn,
}: {
  url_prefix: string;
  refresh: Object;
  updateFn: Function;
}) => {
  const [ignore_list, set_ignore_list] = useState([]);

  const ignore_item = (element: SpendingRecord) => {
    fetch(`${url_prefix}/api/ignore_no`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        op: "remove",
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

  useEffect(() => {
    getIgnoreList({
      url_prefix,
      set_ignore_list,
    });
    return () => {
      // cleanup
    };
  }, [refresh, url_prefix]);

  return (
    <>
      <table>
        <tbody>
          {ignore_list.map((element: SpendingRecord) => (
            <tr key={element.no}>
              <td>
                <Button
                  onClick={() => ignore_item(element)}
                  variant="contained"
                  color="primary"
                >
                  取消忽略
                </Button>
              </td>
              <td>{element.opposite}</td>
              <td>{element.amount}</td>
              <td>{element.time?.substr(5)}</td>
              <td>
                {element.status !== "交易成功" ? `${element.status}` : ""}
              </td>
              <td>{Number(element.refund) !== 0 ? `${element.refund}` : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};

export default IgnoreList;
