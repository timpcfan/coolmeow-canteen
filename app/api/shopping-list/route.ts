import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getWeekSnapshot } from "@/lib/planner";

const querySchema = z.object({
  startDate: z.string().optional(),
  days: z.coerce.number().min(1).max(14).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const parsed = querySchema.parse({
      startDate: req.nextUrl.searchParams.get("startDate") ?? undefined,
      days: req.nextUrl.searchParams.get("days") ?? undefined,
    });

    const snapshot = await getWeekSnapshot(parsed);
    return NextResponse.json({
      startDate: snapshot.startDate,
      endDate: snapshot.endDate,
      items: snapshot.shoppingGaps,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "读取采购清单失败",
      },
      { status: 400 },
    );
  }
}
