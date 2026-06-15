import { NextResponse } from "next/server"
import { database } from "@/lib/database"

export async function GET() {
  try {
    const certificates = await database.getAllCertificates()
    return NextResponse.json(certificates)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch certificates" }, { status: 500 })
  }
}
