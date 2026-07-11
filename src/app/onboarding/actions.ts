"use server";

import { redirect } from "next/navigation";
import { leetcodeUserExists } from "@/lib/leetcode";
import { authedUserId, serverClient } from "@/lib/supabase/server";

export interface OnboardingState {
  error?: string;
}

export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const supabase = await serverClient();
  const me = await authedUserId(supabase);
  if (!me) redirect("/");

  const username = String(formData.get("username") ?? "").trim();
  const leetcodeUsername = String(formData.get("leetcode_username") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "UTC");

  if (!/^[a-zA-Z0-9_-]{2,30}$/.test(username)) {
    return { error: "Username: 2–30 letters, numbers, - or _" };
  }
  if (leetcodeUsername && !(await leetcodeUserExists(leetcodeUsername))) {
    return { error: `LeetCode user "${leetcodeUsername}" not found` };
  }

  const { error } = await supabase.from("profiles").upsert({
    id: me,
    username,
    leetcode_username: leetcodeUsername || null,
    timezone,
  });
  if (error) {
    return {
      error: error.code === "23505" ? "Username already taken" : error.message,
    };
  }
  redirect("/dashboard");
}
