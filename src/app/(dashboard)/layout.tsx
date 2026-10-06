import * as React from "react";
import { AppShell } from "@/components/layouts";
import { RealtimeNotificationProvider } from "@/contexts/realtime-notification-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RealtimeNotificationProvider>
      <AppShell>{children}</AppShell>
    </RealtimeNotificationProvider>
  );
}

