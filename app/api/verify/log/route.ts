import { NextResponse } from "next/server"
import { database } from "@/lib/database"

export async function POST(request: Request) {
  try {
    const { certificateId } = await request.json()

    const verification = {
      id: `VER-${Date.now()}`,
      certificateId,
      timestamp: Date.now(),
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
    }

    await database.logVerification(verification)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to log verification" }, { status: 500 })
  }
}
