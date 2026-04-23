import { NextResponse } from "next/server";

const PAGE_SIZE = 100;
const MAX_PAGES = 50;

async function smooveGet(endpoint: string) {
  const apiUrl = process.env.SMOOVE_API_URL || "https://rest.smoove.io/v1";
  const apiKey = process.env.SMOOVE_API_KEY || "";
  const res = await fetch(`${apiUrl}${endpoint}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`Smoove ${endpoint} → ${res.status}`);
  return res.json();
}

// GET — count actual contacts in Smoove (source of truth vs. our DB flag)
export async function GET() {
  try {
    const planLimit = Number(process.env.SMOOVE_PLAN_LIMIT) || 100;

    let total = 0;
    let page = 1;
    while (page <= MAX_PAGES) {
      const batch = (await smooveGet(
        `/Contacts?page=${page}&pageSize=${PAGE_SIZE}`
      )) as unknown[];
      total += batch.length;
      if (batch.length < PAGE_SIZE) break;
      page++;
    }

    const remaining = Math.max(0, planLimit - total);
    const percent = Math.min(100, Math.round((total / planLimit) * 100));

    return NextResponse.json({
      success: true,
      data: {
        total,
        planLimit,
        remaining,
        percent,
        isNearLimit: percent >= 80,
        isAtLimit: total >= planLimit,
      },
    });
  } catch (error) {
    console.error("[smoove/usage]", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
