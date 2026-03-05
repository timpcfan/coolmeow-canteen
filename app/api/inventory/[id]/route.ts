import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { deleteInventoryItem, updateInventoryItem } from "@/lib/repository";

const inventoryUpdateSchema = z.object({
  ingredientId: z.number().int().positive().optional(),
  quantity: z.number().positive().optional(),
  unit: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const inventoryId = Number(id);
    if (Number.isNaN(inventoryId)) {
      return NextResponse.json({ error: "无效库存 ID" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = inventoryUpdateSchema.parse(body);
    const item = await updateInventoryItem(inventoryId, parsed);

    if (!item) {
      return NextResponse.json({ error: "库存记录不存在" }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "更新库存失败",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const inventoryId = Number(id);
    if (Number.isNaN(inventoryId)) {
      return NextResponse.json({ error: "无效库存 ID" }, { status: 400 });
    }

    const deleted = await deleteInventoryItem(inventoryId);
    if (!deleted) {
      return NextResponse.json({ error: "库存记录不存在" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "删除库存失败",
      },
      { status: 400 },
    );
  }
}
