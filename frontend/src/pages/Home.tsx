import { ReactNode, useState, useEffect } from "react";
import AutoTagManager from "../components/AutoTagManager";
import BackupManager from "../components/BackupManager";
import CommonRecord from "../components/CommonRecord";
import DataManager from "../components/DataManager";
import TagManager from "../components/TagManager";
import TagTrendChart from "../components/TagTrendChart";
import UserManager from "../components/UserManager";

import AppBar from "@mui/material/AppBar";
import Button from "@mui/material/Button";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";

import {
  billListUsers,
  billBackupDatabase,
} from "../fastapiService/services.gen";
import type { UserResponse } from "../fastapiService/types.gen";
import { handleApiError } from "../utils/apiErrorHandler";
import { success } from "../utils/feedbackService";

interface TabPanelProps {
  children?: ReactNode;
  index: any;
  value: any;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Container maxWidth={false} sx={{ maxWidth: "95vw", pt: 3, pb: 6 }}>
          <Box>{children}</Box>
        </Container>
      )}
    </div>
  );
}

const TAB_KEYS = [
  "year",
  "month",
  "week",
  "tag-trend",
  "data",
  "tags",
  "auto-tags",
  "users",
  "backup",
];
const TAB_LABELS = [
  "年",
  "月",
  "周",
  "标签趋势",
  "数据管理",
  "标签管理",
  "自动标签",
  "用户管理",
  "备份管理",
];

function tabIndexFromHash(): number {
  const hash = window.location.hash.replace("#", "");
  const idx = TAB_KEYS.indexOf(hash);
  return idx >= 0 ? idx : 1;
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

export default function Home() {
  const [updated, setUpdated] = useState({});
  const [value, setValue] = useState(tabIndexFromHash);
  const [currentUserId, setCurrentUserId] = useState(1);
  const [users, setUsers] = useState<UserResponse[]>([]);

  const reloadUsers = () => {
    billListUsers()
      .then((res) => {
        const list = res as unknown as UserResponse[];
        setUsers(list);
      })
      .catch(handleApiError);
  };

  useEffect(() => {
    reloadUsers();
  }, []);

  useEffect(() => {
    const onHashChange = () => setValue(tabIndexFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const doUpdate = () => {
    setUpdated({});
  };

  return (
    <div>
      <main>
        <Box sx={{ flexGrow: 1, bgcolor: "background.paper" }}>
          <AppBar position="static">
            <Toolbar sx={{ gap: 2 }}>
              <Typography variant="h6" sx={{ flexGrow: 0 }}>
                BillAnalysis
              </Typography>
              <Select
                value={currentUserId}
                onChange={(e) => setCurrentUserId(Number(e.target.value))}
                sx={{
                  color: "inherit",
                  borderBottom: "1px solid rgba(255,255,255,0.3)",
                  minWidth: 120,
                }}
                slotProps={{ input: { "aria-label": "Select user" } }}
              >
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.name}
                  </MenuItem>
                ))}
              </Select>
              <Tabs
                value={value}
                aria-label="tabs"
                textColor="inherit"
                indicatorColor="secondary"
              >
                {TAB_KEYS.map((key, i) => (
                  <Tab
                    key={key}
                    label={TAB_LABELS[i]}
                    component="a"
                    href={`#${key}`}
                    {...a11yProps(i)}
                  />
                ))}
              </Tabs>
            </Toolbar>
          </AppBar>
          <TabPanel value={value} index={0}>
            <CommonRecord
              echarts_title="年"
              refresh={updated}
              updateFn={doUpdate}
              userId={currentUserId}
            />
          </TabPanel>
          <TabPanel value={value} index={1}>
            <CommonRecord
              echarts_title="月"
              refresh={updated}
              updateFn={doUpdate}
              userId={currentUserId}
            />
          </TabPanel>
          <TabPanel value={value} index={2}>
            <CommonRecord
              echarts_title="周"
              refresh={updated}
              updateFn={doUpdate}
              userId={currentUserId}
            />
          </TabPanel>
          <TabPanel value={value} index={3}>
            <TagTrendChart userId={currentUserId} />
          </TabPanel>
          <TabPanel value={value} index={4}>
            <DataManager
              refresh={updated}
              updateFn={doUpdate}
              userId={currentUserId}
            />
          </TabPanel>
          <TabPanel value={value} index={5}>
            <TagManager userId={currentUserId} onTagChange={doUpdate} />
          </TabPanel>
          <TabPanel value={value} index={6}>
            <AutoTagManager userId={currentUserId} />
          </TabPanel>
          <TabPanel value={value} index={7}>
            <UserManager onUserChange={reloadUsers} />
          </TabPanel>
          <TabPanel value={value} index={8}>
            <BackupManager />
          </TabPanel>
        </Box>
      </main>
    </div>
  );
}
