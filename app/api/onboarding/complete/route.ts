import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { completeOnboardingSetup } from "@/lib/planner";
import { listRecipesFull } from "@/lib/repository";
import { enrichMealPlans } from "@/lib/serializers";

const onboardingSchema = z.object({
  householdSize: z.number().int().min(1).max(12),
  needSoup: z.boolean(),
  toolTypes: z.array(z.string()).optional(),
  startDate: z.string().optional(),
  days: z.number().int().min(1).max(14).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = onboardingSchema.parse(body);

    const snapshot = await completeOnboardingSetup({
      householdSize: parsed.householdSize,
      needSoup: parsed.needSoup,
      toolTypes: parsed.toolTypes ?? [],
      startDate: parsed.startDate,
      days: parsed.days,
    });
    const recipes = await listRecipesFull();

    return NextResponse.json({
      ...snapshot,
      meals: enrichMealPlans(snapshot.plans, recipes),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "新手引导保存失败",
      },
      { status: 400 },
    );
  }
}
