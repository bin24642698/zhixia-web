import React from 'react';
import Head from 'next/head';
import '../styles/globals.css';

// 导入字体图标
const MaterialIconsLink = () => (
  <link
    href="https://fonts.googleapis.com/icon?family=Material+Icons"
    rel="stylesheet"
  />
);

// 导入中文字体
const ChineseFontsLink = () => (
  <>
    <link
      href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap"
      rel="stylesheet"
    />
    <link
      href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700&display=swap"
      rel="stylesheet"
    />
  </>
);

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>智界引擎</title>
        <meta name="description" content="智界引擎 - AI辅助创作平台" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <MaterialIconsLink />
        <ChineseFontsLink />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp; 