import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { generateWeeklyPlan, getWeekSnapshot } from "@/lib/planner";
import { listRecipesFull } from "@/lib/repository";
import { enrichMealPlans } from "@/lib/serializers";

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
    const recipes = await listRecipesFull();

    return NextResponse.json({
      ...snapshot,
      meals: enrichMealPlans(snapshot.plans, recipes),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "读取周计划失败",
      },
      { status: 400 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { startDate?: string; days?: number };
    const parsed = querySchema.parse(body);

    const snapshot = await generateWeeklyPlan({
      ...parsed,
      source: "manual",
      sourceNote: "手动生成/重算一周",
    });
    const recipes = await listRecipesFull();

    return NextResponse.json({
      ...snapshot,
      meals: enrichMealPlans(snapshot.plans, recipes),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "生成周计划失败",
      },
      { status: 400 },
    );
  }
}
