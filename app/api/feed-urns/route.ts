import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

const URN_FILE = path.join(process.cwd(), ".feed-urns.json");

export async function GET() {
  try {
    if (!fs.existsSync(URN_FILE)) {
      return NextResponse.json({ urns: [], message: "No .feed-urns.json. Run: npx tsx scripts/capture-feed-urns.ts" });
    }
    const raw = fs.readFileSync(URN_FILE, "utf-8");
    const data = JSON.parse(raw);
    const urns = Array.isArray(data) ? data : (data.urns ?? []);
    return NextResponse.json({ urns });
  } catch (e) {
    return NextResponse.json({ urns: [] });
  }
}
