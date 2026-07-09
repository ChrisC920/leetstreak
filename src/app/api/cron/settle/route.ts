import { NextResponse } from "next/server";
import { runSync } from "@/lib/jobs/sync";
import { runSettle } from "@/lib/jobs/settle";

export const maxDuration = 300;

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // fresh solves first so settlement never judges on stale data
  const sync = await runSync();
  const settle = await runSettle();
  return NextResponse.json({ sync, settle });
}
