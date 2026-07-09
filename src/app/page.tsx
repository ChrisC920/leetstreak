import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export default async function Home() {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

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
      <LoginForm />
    </main>
  );
}
