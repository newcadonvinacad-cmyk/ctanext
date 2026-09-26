import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/lib/query-provider";
import { AuthProvider } from "@/hooks/use-authorization";

export const metadata: Metadata = {
  title: "Hệ Thống Quản Trị Doanh Nghiệp Biển Quảng Cáo | ERP & AI",
  description: "Giải pháp quản lý khép kín từ Kho, Dự án, Thi công hiện trường GPS đến Chấm công và Trợ lý AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
