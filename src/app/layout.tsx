import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "品诺筑家 - 全链路管理系统",
  description: "品诺有心，筑家有道 - 极简整装全链路管理系统",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
