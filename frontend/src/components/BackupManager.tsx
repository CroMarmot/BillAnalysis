import { useEffect, useState } from "react";

import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";

import {
  billBackupDatabase,
  billListBackups,
  billDeleteBackup,
} from "../fastapiService";
import { handleApiError, success } from "../utils/feedbackService";
import { confirm } from "../utils/confirm";

type BackupItem = {
  name: string;
  size: string;
  mtime: string;
};

const formatSize = (bytes: string): string => {
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

const formatTime = (ts: string): string => {
  const d = new Date(Number(ts) * 1000);
  return d.toLocaleString();
};

const BackupManager = () => {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadBackups = () => {
    billListBackups()
      .then((res) => {
        setBackups(res as unknown as BackupItem[]);
      })
      .catch(handleApiError);
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const doBackup = () => {
    setLoading(true);
    billBackupDatabase()
      .then(() => {
        success("数据库备份成功");
        loadBackups();
      })
      .catch(handleApiError)
      .finally(() => setLoading(false));
  };

  const deleteBackup = (name: string) => {
    confirm("确认删除", `确定要删除备份 "${name}" 吗？`).then((ok) => {
      if (!ok) return;
      billDeleteBackup({ filename: name })
        .then(() => {
          success("备份已删除");
          loadBackups();
        })
        .catch(handleApiError);
    });
  };

  return (
    <>
      <Button
        onClick={doBackup}
        variant="contained"
        color="primary"
        disabled={loading}
        sx={{ mb: 2 }}
      >
        {loading ? "备份中..." : "创建备份"}
      </Button>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} size="small" aria-label="backups table">
          <TableHead>
            <TableRow>
              <TableCell>文件名</TableCell>
              <TableCell align="right">大小</TableCell>
              <TableCell align="right">创建时间</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {backups.map((b: BackupItem) => (
              <TableRow key={b.name}>
                <TableCell component="th" scope="row">
                  {b.name}
                </TableCell>
                <TableCell align="right">{formatSize(b.size)}</TableCell>
                <TableCell align="right">{formatTime(b.mtime)}</TableCell>
                <TableCell align="right">
                  <Button
                    onClick={() => deleteBackup(b.name)}
                    variant="contained"
                    color="primary"
                  >
                    删除
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {backups.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  暂无备份
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

export default BackupManager;