import { useEffect, useRef, useState } from "react";

import { makeStyles } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import MenuItem from "@material-ui/core/MenuItem";
import Button from "@material-ui/core/Button";
import Select from "@material-ui/core/Select";
import Paper from "@material-ui/core/Paper";

import csvTypes from "../utils/FileType";

const useStyles = makeStyles({
  table: {
    minWidth: 650,
  },
});

const DataMancsvTyper = ({
  url_prefix,
  refresh,
  updateFn,
}: {
  url_prefix: string;
  refresh: Object;
  updateFn: Function;
}) => {
  const inputRef = useRef() as React.MutableRefObject<HTMLInputElement>;
  const [data_list, set_data_list] = useState([]);
  const [csvType, setCsvType] = useState(Object.keys(csvTypes)[0]);
  const classes = useStyles();

  const handleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setCsvType(event.target.value as string);
  };

  useEffect(() => {
    fetch(`${url_prefix}/api/file_list`)
      .then((data) => data.json())
      .then((r) => set_data_list(r));

    return () => {
      // cleanup
    };
  }, [refresh, url_prefix]);

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
    formData.append("csvType", csvType);

    fetch(`${url_prefix}/api/upload`, {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then(() => {
        updateFn();
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  return (
    <>
      <input type="file" ref={inputRef} />
      <Select
        value={csvType}
        onChange={handleChange}
        inputProps={{ "aria-label": "Without label" }}
      >
        {Object.keys(csvTypes).map((key) => (
          <MenuItem key={key} value={key}>
            {csvTypes[key]}
          </MenuItem>
        ))}
      </Select>
      <Button onClick={uploadCsv}>Upload</Button>
      <div>
        <TableContainer component={Paper}>
          <Table
            className={classes.table}
            size="small"
            aria-label="simple table"
          >
            <TableHead>
              <TableRow>
                <TableCell>名称</TableCell>
                <TableCell align="right">类型</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data_list.map((element: { name: string; type: string }) => (
                <TableRow key={element.name}>
                  <TableCell component="th" scope="row">
                    {element.name}
                  </TableCell>
                  <TableCell align="right">{element.type}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </>
  );
};

export default DataMancsvTyper;
