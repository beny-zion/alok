import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Candidate } from "@/models/candidate.model";
import { buildCandidateFilter } from "@/lib/candidate-filter";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const filter = buildCandidateFilter(searchParams);

    const docs = await Candidate.find(filter).select("_id").lean();
    const ids = docs.map((d) => String(d._id));

    return NextResponse.json({
      success: true,
      data: { ids, total: ids.length },
    });
  } catch (error) {
    console.error("Candidate ids error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
