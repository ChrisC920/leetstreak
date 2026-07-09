import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          leet<span className="text-orange-500">streak</span> 🔥
        </h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          Daily LeetCode with your friends. Grind the NeetCode 150 together —
          miss a day, lose your streak.
        </p>
      </div>
      {error === "auth" && (
        <p className="max-w-sm text-center text-sm text-destructive">
          That sign-in link didn&apos;t work — it may have expired or been opened in a
          different browser than the one you requested it from. Request a fresh one below.
        </p>
      )}
      <LoginForm />
    </main>
  );
}
