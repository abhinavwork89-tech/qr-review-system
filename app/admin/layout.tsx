import { AdminThemeInit } from "@/components/admin/admin-theme-init";

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdminThemeInit />
      {children}
    </>
  );
}
