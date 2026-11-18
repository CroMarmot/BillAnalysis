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
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Box from "@mui/material/Box";

import {
  billListAutoTagRules,
  billCreateAutoTagRule,
  billDeleteAutoTagRule,
  billPostApplyAutoTagRule,
  billListTags,
} from "../fastapiService/services.gen";
import type { ApplyResult, AutoTagRuleResponse, TagResponse } from "../fastapiService/types.gen";
import { handleApiError, success } from "../utils/feedbackService";
import { confirm } from "../utils/confirm";

const FIELDS = [
  { value: "type_", label: "交易分类" },
  { value: "opposite", label: "商家" },
  { value: "product", label: "商品说明" },
];

const MATCH_TYPES = [
  { value: "exact", label: "全等" },
  { value: "contains", label: "包含" },
];

const AutoTagManager = ({
  userId,
}: {
  userId: number;
}) => {
  const [rules, setRules] = useState<AutoTagRuleResponse[]>([]);
  const [tags, setTags] = useState<TagResponse[]>([]);
  const [newField, setNewField] = useState("type_");
  const [newMatchType, setNewMatchType] = useState("exact");
  const [newPattern, setNewPattern] = useState("");
  const [newTagId, setNewTagId] = useState<number>(0);

  const loadRules = useCallback(() => {
    billListAutoTagRules({ userId }).then((res) => {
      setRules((res as unknown as AutoTagRuleResponse[]).sort((a, b) => b.id - a.id));
    }).catch(handleApiError);
  }, [userId]);

  const loadTags = useCallback(() => {
    billListTags({ userId }).then((res) => {
      setTags(res as unknown as TagResponse[]);
    }).catch(handleApiError);
  }, [userId]);

  useEffect(() => {
    loadRules();
    loadTags();
  }, [loadRules, loadTags]);

  const handleCreate = () => {
    if (!newPattern.trim() || !newTagId) return;
    billCreateAutoTagRule({
      requestBody: {
        field: newField,
        match_type: newMatchType,
        pattern: newPattern.trim(),
        tag_id: newTagId,
      },
      userId,
    }).then(() => {
      setNewPattern("");
      loadRules();
      success("规则创建成功");
    }).catch(handleApiError);
  };

  const handleDelete = (rule: AutoTagRuleResponse) => {
    confirm(
      "确认删除",
      `确定要删除规则 "${rule.field} ${rule.match_type} ${rule.pattern}" 吗？`
    ).then((ok) => {
      if (!ok) return;
      billDeleteAutoTagRule({ ruleId: rule.id }).then(() => {
        loadRules();
        success("规则已删除");
      }).catch(handleApiError);
    });
  };

  const handleApplyRule = (rule: AutoTagRuleResponse) => {
    billPostApplyAutoTagRule({ ruleId: rule.id, userId }).then((res) => {
      const result = res as unknown as ApplyResult;
      success(`满足 ${result.matched} 条，更新 ${result.updated} 条`);
      loadRules();
    }).catch(handleApiError);
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: "flex", gap: 1, mb: 2, alignItems: "center", flexWrap: "wrap" }}>
        <Select size="small" value={newField} onChange={(e) => setNewField(e.target.value)} sx={{ minWidth: 120 }}>
          {FIELDS.map((f) => (
            <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
          ))}
        </Select>
        <Select size="small" value={newMatchType} onChange={(e) => setNewMatchType(e.target.value)} sx={{ minWidth: 80 }}>
          {MATCH_TYPES.map((m) => (
            <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
          ))}
        </Select>
        <TextField size="small" label="匹配内容" value={newPattern} onChange={(e) => setNewPattern(e.target.value)} />
        <Select size="small" value={newTagId} onChange={(e) => setNewTagId(Number(e.target.value))} sx={{ minWidth: 120 }} displayEmpty>
          <MenuItem value={0} disabled>选择标签</MenuItem>
          {tags.map((t) => (
            <MenuItem key={t.id} value={t.id}>{t.name} ({(t as any).count ?? 0})</MenuItem>
          ))}
        </Select>
        <Button variant="contained" color="primary" onClick={handleCreate}>
          添加规则
        </Button>
        <Button variant="outlined" onClick={() => { loadTags(); success("标签已刷新"); }}>
          重新拉取tag
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 600 }} size="small">
          <TableHead>
            <TableRow>
              <TableCell>匹配字段</TableCell>
              <TableCell>匹配方式</TableCell>
              <TableCell>匹配内容</TableCell>
              <TableCell>标签</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell>{FIELDS.find((f) => f.value === rule.field)?.label || rule.field}</TableCell>
                <TableCell>{MATCH_TYPES.find((m) => m.value === rule.match_type)?.label || rule.match_type}</TableCell>
                <TableCell>{rule.pattern}</TableCell>
                <TableCell>{rule.tag_name}</TableCell>
                <TableCell>
                  <Button size="small" onClick={() => handleApplyRule(rule)}>
                    应用到历史记录
                  </Button>
                  <Button size="small" color="error" onClick={() => handleDelete(rule)}>
                    删除
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default AutoTagManager;
