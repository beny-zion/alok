import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";

export async function GET() {
  try {
    await connectDB();
    return NextResponse.json({ success: true, status: "healthy", timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json(
      { success: false, status: "unhealthy", error: "Database connection failed" },
      { status: 500 }
    );
  }
}
