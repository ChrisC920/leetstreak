import { NextResponse } from "next/server";
import { runSync } from "@/lib/jobs/sync";

export const maxDuration = 300;

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const report = await runSync();
  return NextResponse.json(report);
}
