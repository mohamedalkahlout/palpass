import { redirect } from "@/i18n/routing";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export default async function AdminLayout({ children }) {
  let user = null;
  try {
    user = await getCurrentUser();
  } catch (err) {
    console.error("[Handled SSR Exception - AdminLayout User]:", err?.message);
    user = null;
  }

  if (!user) {
    redirect("/auth/login");
  }

  let profile = null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (!error && data) {
      profile = data;
    }
  } catch (err) {
    console.error("[Handled SSR Exception - AdminLayout Profile]:", err?.message);
    profile = null;
  }

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return children;
}
