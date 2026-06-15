import { NextResponse } from "next/server";
import { database } from "@/lib/database";

export async function GET() {
  try {
    const analytics = await database.getAnalytics();
    return NextResponse.json(analytics);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
