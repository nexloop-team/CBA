import type { Metadata } from "next";
import AdminApp from "./AdminApp";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

/** Not linked from anywhere; signing in needs ADMIN_PASSWORD. */
export default function AdminPage() {
  return <AdminApp />;
}
