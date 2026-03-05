import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { deleteTool, setPlanConfigSource, updateTool } from "@/lib/repository";

const toolUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  capacity: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const toolId = Number(id);
    if (Number.isNaN(toolId)) {
      return NextResponse.json({ error: "无效工具 ID" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = toolUpdateSchema.parse(body);
    const item = await updateTool(toolId, parsed);

    if (!item) {
      return NextResponse.json({ error: "工具不存在" }, { status: 404 });
    }

    const configSource = await setPlanConfigSource("manual", "工具配置手动修改");
    return NextResponse.json({ item, configSource });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "更新工具失败",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const toolId = Number(id);
    if (Number.isNaN(toolId)) {
      return NextResponse.json({ error: "无效工具 ID" }, { status: 400 });
    }

    const deleted = await deleteTool(toolId);
    if (!deleted) {
      return NextResponse.json({ error: "工具不存在" }, { status: 404 });
    }

    const configSource = await setPlanConfigSource("manual", "工具配置手动修改");
    return NextResponse.json({ ok: true, configSource });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "删除工具失败",
      },
      { status: 400 },
    );
  }
}
