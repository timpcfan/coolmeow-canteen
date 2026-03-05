import { NextResponse } from "next/server";
import { z } from "zod";

import { replaceMealPlanById } from "@/lib/planner";
import { listRecipesFull, setPlanConfigSource } from "@/lib/repository";
import { enrichMealPlans } from "@/lib/serializers";

const replaceSchema = z.object({
  objective: z.enum(["balanced", "faster", "budget", "low_cal"]).optional(),
  fallbackReason: z.enum(["step_failed_or_timeout"]).optional(),
});

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const planId = Number(id);
    if (Number.isNaN(planId)) {
      return NextResponse.json({ error: "无效计划 ID" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      objective?: "balanced" | "faster" | "budget" | "low_cal";
      fallbackReason?: "step_failed_or_timeout";
    };
    const parsed = replaceSchema.parse(body);
    const effectiveObjective = parsed.fallbackReason
      ? parsed.objective && parsed.objective !== "balanced"
        ? parsed.objective
        : "faster"
      : parsed.objective ?? "balanced";

    const replaced = await replaceMealPlanById(planId, effectiveObjective);
    if (!replaced) {
      return NextResponse.json({ error: "计划不存在" }, { status: 404 });
    }

    const configSource = await setPlanConfigSource(
      parsed.fallbackReason || effectiveObjective !== "balanced" ? "quick_tune" : "manual",
      parsed.fallbackReason ? "步骤失败/超时一键重排" : effectiveObjective === "balanced" ? "手动替换" : "快捷调优",
    );

    const recipes = await listRecipesFull();
    const [meal] = enrichMealPlans([replaced], recipes);
    return NextResponse.json({ meal, configSource });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "替换失败",
      },
      { status: 400 },
    );
  }
}
