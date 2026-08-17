import AdminGuard from "@/components/auth/AdminGuard";
import AppShell from "@/components/layout/AppShell";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <AppShell>
        {children}
      </AppShell>
    </AdminGuard>
  );
}