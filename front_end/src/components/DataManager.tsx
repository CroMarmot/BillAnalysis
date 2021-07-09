import { useEffect, useRef, useState } from "react";

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

const DataManager = ({
  url_prefix,
  refresh,
  updateFn,
}: {
  url_prefix: string;
  refresh: Object;
  updateFn: Function;
}) => {
  const [ignore_list, set_ignore_list] = useState([]);
  const inputRef = useRef() as React.MutableRefObject<HTMLInputElement>;

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
  }, [refresh]);

  const uploadCsv = () => {
    if (
      inputRef.current.files === null ||
      inputRef.current.files.length === 0
    ) {
      alert("files NULL");
      return;
    }
    const formData = new FormData();
    formData.append("file", inputRef.current.files[0]);

    fetch(`${url_prefix}/upload`, {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((result) => {
        console.log("Success:", result);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  return (
    <>
      <input type="file" ref={inputRef} />
      <button onClick={uploadCsv}>Upload</button>
    </>
  );
};

export default DataManager;
