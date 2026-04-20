import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { job } = body;
  const ALLOWED_JOBS: Record<string, string> = {
    "cnae": "node etl/import-cnae.js",
    "municipalities": "node etl/import-municipalities.js",
    "geocode": "node etl/geocode-companies.js",
  };
  if (!job || !ALLOWED_JOBS[job]) {
    return NextResponse.json({ error: "Invalid job" }, { status: 400 });
  }
  const cmd = ALLOWED_JOBS[job];
  const cwd = path.join(process.cwd());
  exec(cmd, { cwd, env: { ...process.env } }, (err, stdout) => {
    if (err) console.error(`Job ${job} error:`, err.message);
    else console.log(`Job ${job} done:`, stdout.slice(-200));
  });
  return NextResponse.json({ started: true, job, cmd });
}
