import { useCallback, useEffect, useState } from "react";
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
  billListTags,
  billCreateTag,
  billRenameTag,
  billDeleteTag,
} from "../fastapiService/services.gen";
import type { TagResponse } from "../fastapiService/types.gen";
import { handleApiError, success } from "../utils/feedbackService";
import { confirm } from "../utils/confirm";

const TagManager = ({
  userId,
  onTagChange,
}: {
  userId: number;
  onTagChange: () => void;
}) => {
  const [tags, setTags] = useState<TagResponse[]>([]);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const loadTags = useCallback(() => {
    billListTags({ userId }).then((res) => {
      setTags(res as unknown as TagResponse[]);
    }).catch(handleApiError);
  }, [userId]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    billCreateTag({ requestBody: { name: newName.trim() }, userId }).then(() => {
      setNewName("");
      loadTags();
      onTagChange();
      success("标签创建成功");
    }).catch(handleApiError);
  };

  const handleRename = (id: number) => {
    if (!editName.trim()) return;
    billRenameTag({ requestBody: { name: editName.trim() }, tagId: id }).then(() => {
      setEditId(null);
      setEditName("");
      loadTags();
      onTagChange();
      success("标签已重命名");
    }).catch(handleApiError);
  };

  const handleDelete = (tag: TagResponse) => {
    confirm(
      "确认删除",
      `确定要删除标签 "${tag.name}" 吗？`
    ).then((ok) => {
      if (!ok) return;
      billDeleteTag({ tagId: tag.id }).then(() => {
        loadTags();
        onTagChange();
        success("标签已删除");
      }).catch(handleApiError);
    });
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: "flex", gap: 1, mb: 2, alignItems: "center" }}>
        <TextField
          size="small"
          label="新标签名"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button variant="contained" color="primary" onClick={handleCreate}>
          添加标签
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 400 }} size="small">
          <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>名称</TableCell>
                <TableCell align="right">使用次数</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
          </TableHead>
          <TableBody>
            {tags.map((tag) => (
              <TableRow key={tag.id}>
                <TableCell>{tag.id}</TableCell>
                <TableCell>
                  {editId === tag.id ? (
                    <TextField
                      size="small"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRename(tag.id)}
                    />
                  ) : (
                    tag.name
                  )}
                </TableCell>
                <TableCell align="right">{(tag as any).count ?? 0}</TableCell>
                <TableCell>
                  {editId === tag.id ? (
                    <>
                      <Button size="small" onClick={() => handleRename(tag.id)}>
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
                        onClick={() => { setEditId(tag.id); setEditName(tag.name); }}
                      >
                        改名
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleDelete(tag)}
                      >
                        删除
                      </Button>
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

export default TagManager;
