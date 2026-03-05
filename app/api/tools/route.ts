import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createTool, listTools, setPlanConfigSource } from "@/lib/repository";

const toolSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  capacity: z.number().int().positive(),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    const items = await listTools();
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "读取工具失败",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = toolSchema.parse(body);

    const item = await createTool({
      ...parsed,
      notes: parsed.notes ?? "",
    });
    const configSource = await setPlanConfigSource("manual", "工具配置手动修改");

    return NextResponse.json({ item, configSource }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "创建工具失败",
      },
      { status: 400 },
    );
  }
}
