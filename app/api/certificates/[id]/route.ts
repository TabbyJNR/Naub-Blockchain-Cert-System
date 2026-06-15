import { NextResponse } from "next/server";
import { database } from "@/lib/database";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const certificate = await database.getCertificate(id);

    if (!certificate) {
      return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
    }

    return NextResponse.json(certificate);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch certificate" }, { status: 500 });
  }
}
