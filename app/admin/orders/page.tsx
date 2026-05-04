import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminOrdersClient } from "@/components/admin/AdminOrdersClient";
import { loadOwnerSession } from "@/lib/admin/load-owner-session";

export const metadata = {
  title: "後廚接單",
};

export default async function AdminOrdersPage() {
  const { user, restaurants, error } = await loadOwnerSession();

  if (!user) {
    redirect("/admin/login");
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-red-800">無法載入餐廳：{error.message}</p>
        <Link href="/admin" className="mt-4 inline-block text-menu-primary underline">
          返回主選單
        </Link>
      </div>
    );
  }

  if (!restaurants?.length) {
    redirect("/admin");
  }

  return (
    <AdminOrdersClient
      restaurants={restaurants}
      userEmail={user.email}
    />
  );
}
