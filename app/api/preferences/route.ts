import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getPreferences, setPlanConfigSource, updatePreferences } from "@/lib/repository";

const preferenceSchema = z.object({
  householdSize: z.number().int().min(1).max(12),
  preferredCookingMethods: z.array(z.string()),
  lowCalOnly: z.boolean(),
  flavorPreferences: z.array(z.string()),
  avoidIngredients: z.array(z.string()),
  allergens: z.array(z.string()),
  needSoup: z.boolean(),
  stapleRequired: z.boolean(),
});

export async function GET() {
  try {
    const item = await getPreferences();
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "读取偏好失败",
      },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = preferenceSchema.parse(body);
    const item = await updatePreferences(parsed);
    const configSource = await setPlanConfigSource("manual", "偏好设置手动修改");
    return NextResponse.json({ item, configSource });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "更新偏好失败",
      },
      { status: 400 },
    );
  }
}
