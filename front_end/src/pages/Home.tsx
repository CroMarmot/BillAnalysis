import React, { useState } from "react";
import CommonRecord from "../components/CommonRecord";
import IgnoreList from "../components/IgnoreList";
import DataManager from "../components/DataManager";

import { makeStyles, Theme } from "@material-ui/core/styles";
import AppBar from "@material-ui/core/AppBar";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Box from "@material-ui/core/Box";
import { Container } from "@material-ui/core";

interface TabPanelProps {
  children?: React.ReactNode;
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
        <Container>
          <Box>{children}</Box>
        </Container>
      )}
    </div>
  );
}

function a11yProps(index: any) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    flexGrow: 1,
    backgroundColor: theme.palette.background.paper,
  },
}));

export default function Home() {
  const url_prefix = "http://127.0.0.1:5000";
  const [updated, setUpdated] = useState({});
  const classes = useStyles();
  const [value, setValue] = React.useState(0);

  const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setValue(newValue);
  };

  const doUpdate = () => {
    setUpdated({});
  };

  return (
    <div>
      <main>
        <div className={classes.root}>
          <AppBar position="static">
            <Tabs
              value={value}
              onChange={handleChange}
              aria-label="simple tabs example"
            >
              <Tab label="月出账" {...a11yProps(0)} />
              <Tab label="周出账" {...a11yProps(1)} />
              <Tab label="忽略列表" {...a11yProps(2)} />
              <Tab label="数据管理" {...a11yProps(3)} />
            </Tabs>
          </AppBar>
          <TabPanel value={value} index={0}>
            <CommonRecord
              api_all={`${url_prefix}/api/month`}
              api_query={`${url_prefix}/api/month_query`}
              api_ignore_no={`${url_prefix}/api/ignore_no`}
              echarts_title="月出账"
              refresh={updated}
              updateFn={doUpdate}
            />
          </TabPanel>
          <TabPanel value={value} index={1}>
            <CommonRecord
              api_all={`${url_prefix}/api/week`}
              api_query={`${url_prefix}/api/week_query`}
              api_ignore_no={`${url_prefix}/api/ignore_no`}
              echarts_title="周出账"
              refresh={updated}
              updateFn={doUpdate}
            />
          </TabPanel>
          <TabPanel value={value} index={2}>
            <IgnoreList
              url_prefix={url_prefix}
              refresh={updated}
              updateFn={doUpdate}
            />
          </TabPanel>
          <TabPanel value={value} index={3}>
            <DataManager
              url_prefix={url_prefix}
              refresh={updated}
              updateFn={doUpdate}
            />
          </TabPanel>
        </div>
      </main>
    </div>
  );
}
