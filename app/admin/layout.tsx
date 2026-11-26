import type { Metadata } from "next";
import AdminGuard from "@/components/auth/AdminGuard";
import AppShell from "@/components/layout/AppShell";
import AdminPwaInstall from "@/components/pwa/AdminPwaInstall";

export const metadata: Metadata = {
  manifest: "/admin/manifest.webmanifest",
  themeColor: "#8f2635",
  appleWebApp: {
    capable: true,
    title: "Sauti Tamu Admin",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/admin/icons/admin-icon.svg",
    apple: "/admin/icons/admin-icon.svg",
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <AppShell>
        {children}
        <AdminPwaInstall />
      </AppShell>
    </AdminGuard>
  );
}
