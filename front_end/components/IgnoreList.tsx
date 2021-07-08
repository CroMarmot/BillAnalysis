import { useEffect, useState } from "react";

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
    .then((r: string[]) => {
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

  const ignore_item = (element: string[]) => {
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
  }, [refresh]);

  return (
    <>
      <h2>Ignore List</h2>
      <table>
        <tbody>
          {ignore_list.map((element: string[]) => (
            <tr key={element[0]}>
              <td>
                <button onClick={() => ignore_item(element)}>
                  Cancel Ignore
                </button>
              </td>
              <td>{element[7]}</td>
              <td>{element[9]}</td>
              <td>{element[2].substr(5)}</td>
              <td>{element[11] !== "交易成功" ? `${element[11]}` : ""}</td>
              <td>{Number(element[13]) !== 0 ? `${element[13]}` : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};

export default IgnoreList;
