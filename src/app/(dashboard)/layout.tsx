import * as React from "react";
import { AppShell } from "@/components/layouts";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
