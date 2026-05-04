"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const defaultClassName =
  "rounded-xl border border-menu-border bg-menu-card px-4 py-2 text-sm font-medium text-menu-ink transition-colors hover:bg-menu-surface disabled:opacity-50";

type AdminSignOutButtonProps = {
  redirectTo?: string;
  className?: string;
};

export function AdminSignOutButton({
  redirectTo = "/admin/login",
  className = defaultClassName,
}: AdminSignOutButtonProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push(redirectTo);
    router.refresh();
  };

  return (
    <button
      type="button"
      disabled={signingOut}
      onClick={() => void handleSignOut()}
      className={className}
    >
      {signingOut ? "登出中…" : "登出"}
    </button>
  );
}
