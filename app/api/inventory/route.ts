import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createInventoryItem, listIngredients, listInventory } from "@/lib/repository";

const inventoryCreateSchema = z.object({
  ingredientId: z.number().int().positive(),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  location: z.string().min(1),
  expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET() {
  try {
    const [items, ingredients] = await Promise.all([listInventory(), listIngredients()]);
    return NextResponse.json({ items, ingredients });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "读取库存失败",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = inventoryCreateSchema.parse(body);
    const item = await createInventoryItem(parsed);

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "创建库存失败",
      },
      { status: 400 },
    );
  }
}
