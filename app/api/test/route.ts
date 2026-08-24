import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Sauti Tamu API routes are working",
    time: new Date().toISOString(),
  });
}