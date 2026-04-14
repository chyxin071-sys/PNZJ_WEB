import "./globals.css";
import type { Metadata } from "next";
import { ThemeProvider } from "../components/ThemeContext";

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
      <body suppressHydrationWarning={true}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
