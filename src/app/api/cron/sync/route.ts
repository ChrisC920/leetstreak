import { NextResponse } from "next/server";
import { runSettle } from "@/lib/jobs/settle";
import { runSync } from "@/lib/jobs/sync";

export const maxDuration = 300;

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const report = await runSync();
  // settle right after syncing so freshly finished days count immediately
  // instead of waiting for the hourly settle cron
  const settle = await runSettle();
  return NextResponse.json({ ...report, settle });
}
