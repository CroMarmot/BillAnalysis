import { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";

import {
  billListUsers,
  billCreateUser,
  billRenameUser,
  billDeleteUser,
} from "../fastapiService/services.gen";
import type { UserResponse } from "../fastapiService/types.gen";
import { handleApiError, success } from "../utils/feedbackService";
import { confirm } from "../utils/confirm";

const UserManager = ({
  onUserChange,
}: {
  onUserChange: () => void;
}) => {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const loadUsers = () => {
    billListUsers().then((res) => {
      setUsers(res as unknown as UserResponse[]);
    }).catch(handleApiError);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = () => {
    if (!newName.trim()) return;
    billCreateUser({ requestBody: { name: newName.trim() } }).then(() => {
      setNewName("");
      loadUsers();
      onUserChange();
      success("用户创建成功");
    }).catch(handleApiError);
  };

  const handleRename = (id: number) => {
    if (!editName.trim()) return;
    billRenameUser({ requestBody: { name: editName.trim() }, userId: id }).then(() => {
      setEditId(null);
      setEditName("");
      loadUsers();
      onUserChange();
      success("用户已重命名");
    }).catch(handleApiError);
  };

  const handleDelete = (user: UserResponse) => {
    if (user.id === 1) return;
    confirm(
      "确认删除",
      `确定要删除用户 "${user.name}" 吗？此操作不可恢复。`
    ).then((ok) => {
      if (!ok) return;
      billDeleteUser({ userId: user.id }).then(() => {
        loadUsers();
        onUserChange();
        success("用户已删除");
      }).catch(handleApiError);
    });
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: "flex", gap: 1, mb: 2, alignItems: "center" }}>
        <TextField
          size="small"
          label="新用户名"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button variant="contained" color="primary" onClick={handleCreate}>
          添加用户
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 400 }} size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>名称</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.id}</TableCell>
                <TableCell>
                  {editId === user.id ? (
                    <TextField
                      size="small"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRename(user.id)}
                    />
                  ) : (
                    user.name
                  )}
                </TableCell>
                <TableCell>
                  {editId === user.id ? (
                    <>
                      <Button size="small" onClick={() => handleRename(user.id)}>
                        保存
                      </Button>
                      <Button size="small" onClick={() => setEditId(null)}>
                        取消
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="small"
                        onClick={() => { setEditId(user.id); setEditName(user.name); }}
                      >
                        改名
                      </Button>
                      {user.id !== 1 && (
                        <Button
                          size="small"
                          color="error"
                          onClick={() => handleDelete(user)}
                        >
                          删除
                        </Button>
                      )}
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default UserManager;