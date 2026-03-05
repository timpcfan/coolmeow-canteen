import { NextResponse } from "next/server";
import { z } from "zod";

import { replaceMealPlanById } from "@/lib/planner";
import { listRecipesFull } from "@/lib/repository";
import { enrichMealPlans } from "@/lib/serializers";

const replaceSchema = z.object({
  objective: z.enum(["balanced", "faster", "budget", "low_cal"]).optional(),
});

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const planId = Number(id);
    if (Number.isNaN(planId)) {
      return NextResponse.json({ error: "无效计划 ID" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as { objective?: "balanced" | "faster" | "budget" | "low_cal" };
    const parsed = replaceSchema.parse(body);

    const replaced = await replaceMealPlanById(planId, parsed.objective ?? "balanced");
    if (!replaced) {
      return NextResponse.json({ error: "计划不存在" }, { status: 404 });
    }

    const recipes = await listRecipesFull();
    const [meal] = enrichMealPlans([replaced], recipes);
    return NextResponse.json({ meal });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "替换失败",
      },
      { status: 400 },
    );
  }
}
