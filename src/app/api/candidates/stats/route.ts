import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Candidate } from "@/models/candidate.model";

interface Bucket {
  _id: string | null;
  count: number;
}

function toCounts(buckets: Bucket[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const b of buckets) {
    if (b._id) out[b._id] = b.count;
  }
  return out;
}

export async function GET() {
  try {
    await connectDB();

    const [
      total,
      bySource,
      smooveSynced,
      smooveError,
      smoovePending,
      noEmail,
      topSectors,
      topCities,
      topTags,
      topStatuses,
      recent,
    ] = await Promise.all([
      Candidate.countDocuments({}),
      Candidate.aggregate<Bucket>([{ $group: { _id: "$source", count: { $sum: 1 } } }]),
      Candidate.countDocuments({ smooveSynced: true }),
      Candidate.countDocuments({ smooveError: { $exists: true, $nin: [null, ""] } }),
      Candidate.countDocuments({
        email: { $exists: true, $ne: "" },
        smooveSynced: { $ne: true },
        $or: [{ smooveError: { $exists: false } }, { smooveError: null }, { smooveError: "" }],
      }),
      Candidate.countDocuments({ $or: [{ email: { $exists: false } }, { email: "" }] }),
      Candidate.aggregate<Bucket>([
        { $unwind: "$sectors" },
        { $match: { sectors: { $ne: "" } } },
        { $group: { _id: "$sectors", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      Candidate.aggregate<Bucket>([
        { $match: { city: { $exists: true, $ne: "" } } },
        { $group: { _id: "$city", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      Candidate.aggregate<Bucket>([
        { $unwind: "$tags" },
        { $match: { tags: { $ne: "" } } },
        { $group: { _id: "$tags", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      Candidate.aggregate<Bucket>([
        { $match: { status: { $exists: true, $ne: "" } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      Candidate.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .select("_id firstName lastName fullName email phone source createdAt")
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        total,
        bySource: toCounts(bySource),
        smoove: {
          synced: smooveSynced,
          error: smooveError,
          pending: smoovePending,
          noEmail,
        },
        topSectors: topSectors.map((b) => ({ name: b._id, count: b.count })),
        topCities: topCities.map((b) => ({ name: b._id, count: b.count })),
        topTags: topTags.map((b) => ({ name: b._id, count: b.count })),
        topStatuses: topStatuses.map((b) => ({ name: b._id, count: b.count })),
        recent,
      },
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
