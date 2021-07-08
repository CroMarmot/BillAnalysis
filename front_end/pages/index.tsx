import Head from "next/head";
import MonthRecord from "../components/MonthRecord";
import WeekRecord from "../components/WeekRecord";
import IgnoreList from "../components/IgnoreList";

export default function Home() {
  const url_prefix = "http://127.0.0.1:5000";
  return (
    <div>
      <Head>
        <title>账目 React</title>
        <meta name="description" content="账目 React" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <MonthRecord url_prefix={url_prefix}></MonthRecord>
        <WeekRecord url_prefix={url_prefix}></WeekRecord>
        <IgnoreList url_prefix={url_prefix}></IgnoreList>
      </main>

      <footer></footer>
    </div>
  );
}
