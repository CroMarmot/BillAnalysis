import Head from "next/head";
import { useState } from "react";
import CommonRecord from "../components/CommonRecord";
import IgnoreList from "../components/IgnoreList";

export default function Home() {
  const url_prefix = "http://127.0.0.1:5000";
  const [updated, setUpdated] = useState({});

  const doUpdate = () => {
    setUpdated({});
  };

  return (
    <div>
      <Head>
        <title>账目 React</title>
        <meta name="description" content="账目 React" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <CommonRecord
          api_all={`${url_prefix}/api/month`}
          api_query={`${url_prefix}/api/month_query`}
          api_ignore_no={`${url_prefix}/api/ignore_no`}
          echarts_title="月出账"
          refresh={updated}
          updateFn={doUpdate}
        />
        <CommonRecord
          api_all={`${url_prefix}/api/week`}
          api_query={`${url_prefix}/api/week_query`}
          api_ignore_no={`${url_prefix}/api/ignore_no`}
          echarts_title="周出账"
          refresh={updated}
          updateFn={doUpdate}
        />
        <IgnoreList
          url_prefix={url_prefix}
          refresh={updated}
          updateFn={doUpdate}
        ></IgnoreList>
      </main>

      <footer></footer>
    </div>
  );
}
