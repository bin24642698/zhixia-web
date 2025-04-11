import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // 抑制水合警告，解决由浏览器扩展导致的 hydration mismatch 问题
  reactStrictMode: false,
  // Next.js 中没有直接支持 suppressHydrationWarning 作为顶级配置
  // 我们只能在组件级别使用 suppressHydrationWarning 属性
};

export default nextConfig;
