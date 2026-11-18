import { useEffect, useRef, useState } from "react";

import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";

import Typography from "@mui/material/Typography";

import { OpenAPI } from "../fastapiService/core/OpenAPI";
import {
  billGetFileList,
  billPostRemoveFile,
} from "../fastapiService/services.gen";
import type { FileListItem } from "../fastapiService/types.gen";
import { handleApiError, success } from "../utils/feedbackService";
import { confirm } from "../utils/confirm";

const DataManager = ({
  refresh,
  updateFn,
  userId,
}: {
  refresh: Object;
  updateFn: Function;
  userId: number;
}) => {
  const inputRef = useRef<HTMLInputElement>(null!);
  const [data_list, set_data_list] = useState<FileListItem[]>([]);

  useEffect(() => {
    billGetFileList({ userId }).then((res) => {
      set_data_list(res as unknown as FileListItem[]);
    }).catch(handleApiError);
  }, [refresh, userId]);

  const uploadFiles = () => {
    inputRef.current.click();
  };

  const handleFilesSelected = () => {
    const files = inputRef.current.files;
    if (!files || files.length === 0) return;
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }
    formData.append("user_id", String(userId));

    fetch(`${OpenAPI.BASE}/api/upload`, {
      method: "POST",
      body: formData,
    }).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      updateFn();
    }).catch(handleApiError);
    inputRef.current.value = "";
  };

  const removeFile = (filename: string, ftype: string) => {
    billPostRemoveFile({
      formData: {
        filename,
        csvType: ftype,
        user_id: userId,
      },
    }).then(() => {
      updateFn();
      success("文件已删除");
    }).catch(handleApiError);
  };

  return (
    <>
      <Typography sx={{ mb: 1 }}>
        <strong>支付宝下载步骤：</strong>
        打开支付宝 → "我的" → "账单" → 右上角三个点 → "开具交易流水证明" →
        "用于个人对账" → "申请" → 等待支付宝处理完成后下载 csv 文件
      </Typography>
      <Typography sx={{ mb: 1 }}>
        <strong>微信下载步骤：</strong>
        打开微信 → "我" → "服务" → "钱包" → "账单" → 右上角三个点 →
        "下载账单" → "用于个人对账" → "下一步" → "刷脸认证" →
        等待微信官方处理完成后，"微信支付" → "账单流水文件" → 下载 xlsx 文件
      </Typography>
      <Typography sx={{ mb: 1, color: "text.secondary", fontSize: "0.875rem" }}>
        提示：选择自定义日期范围，可以跨度拉大到1年
      </Typography>
      <input type="file" ref={inputRef} multiple accept=".csv,.xlsx" onChange={handleFilesSelected} style={{ display: "none" }} />
      <Button onClick={uploadFiles}
        variant="contained"
        color="primary">选择文件并上传</Button>
      <div>
        <TableContainer component={Paper}>
          <Table
            sx={{ minWidth: 650 }}
            size="small"
            aria-label="simple table"
          >
            <TableHead>
              <TableRow>
                <TableCell>名称</TableCell>
                <TableCell align="right">类型</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data_list.map((element: FileListItem) => (
                <TableRow key={element.name}>
                  <TableCell component="th" scope="row">
                    {element.name}
                  </TableCell>
                  <TableCell align="right">{element.type}</TableCell>
                  <TableCell align="right">
                    <Button
                      onClick={() => {
                        confirm(
                          "确认删除",
                          `确定要删除文件 "${element.name}" 及其所有记录吗？`
                        ).then((ok) => {
                          if (ok) removeFile(element.name, element.type);
                        });
                      }}
                      variant="contained"
                      color="primary"
                    >
                      删除
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </>
  );
};

export default DataManager;
