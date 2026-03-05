"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/client-api";

type Tool = {
  id: number;
  name: string;
  type: string;
  capacity: number;
  notes: string;
};

type ToolResponse = {
  items: Tool[];
};

const toolTypeOptions = ["steamer", "rice_cooker", "gas_stove", "induction"];

export default function ToolsPage() {
  const [items, setItems] = useState<Tool[]>([]);
  const [drafts, setDrafts] = useState<Record<number, Omit<Tool, "id">>>({});
  const [form, setForm] = useState<Omit<Tool, "id">>({
    name: "",
    type: "steamer",
    capacity: 1,
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/tools"));
      const payload = (await res.json()) as ToolResponse & { error?: string };
      if (!res.ok) {
        throw new Error(payload.error ?? "读取工具失败");
      }
      setItems(payload.items);
      setDrafts(
        Object.fromEntries(
          payload.items.map((item) => [
            item.id,
            {
              name: item.name,
              type: item.type,
              capacity: item.capacity,
              notes: item.notes,
            },
          ]),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "读取工具失败");
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const createTool = async () => {
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/tools"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error ?? "新增工具失败");
      }
      setForm({ name: "", type: "steamer", capacity: 1, notes: "" });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "新增工具失败");
    }
  };

  const saveTool = async (id: number) => {
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/tools/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(drafts[id]),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error ?? "更新失败");
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新失败");
    }
  };

  const removeTool = async (id: number) => {
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/tools/${id}`), { method: "DELETE" });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error ?? "删除失败");
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-primary/20 bg-white p-5">
        <h1 className="text-2xl font-bold text-primary">工具管理</h1>
        <p className="mt-1 text-sm text-primary/70">维护工具类型、数量/层数，并用于步骤并发调度。</p>

        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <input
            className="rounded-md border border-primary/30 px-2 py-2"
            placeholder="工具名称"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <select
            className="rounded-md border border-primary/30 px-2 py-2"
            value={form.type}
            onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
          >
            {toolTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <input
            className="rounded-md border border-primary/30 px-2 py-2"
            type="number"
            min={1}
            value={form.capacity}
            onChange={(e) => setForm((prev) => ({ ...prev, capacity: Number(e.target.value) }))}
          />
          <input
            className="rounded-md border border-primary/30 px-2 py-2"
            placeholder="备注"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          />
          <button onClick={() => void createTool()} className="rounded-md bg-primary px-3 py-2 text-white">
            新增工具
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>

      <section className="rounded-2xl border border-primary/20 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">工具列表</h2>
          <button onClick={() => void refresh()} className="text-sm text-primary underline">
            刷新
          </button>
        </div>

        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-primary/20 text-left text-primary/75">
                <th className="px-2 py-2">名称</th>
                <th className="px-2 py-2">类型</th>
                <th className="px-2 py-2">并发能力</th>
                <th className="px-2 py-2">备注</th>
                <th className="px-2 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const draft = drafts[item.id];
                return (
                  <tr key={item.id} className="border-b border-primary/10">
                    <td className="px-2 py-2">
                      <input
                        className="rounded border border-primary/20 px-2 py-1"
                        value={draft?.name ?? item.name}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...prev[item.id],
                              name: e.target.value,
                            },
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <select
                        className="rounded border border-primary/20 px-2 py-1"
                        value={draft?.type ?? item.type}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...prev[item.id],
                              type: e.target.value,
                            },
                          }))
                        }
                      >
                        {toolTypeOptions.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className="w-20 rounded border border-primary/20 px-2 py-1"
                        type="number"
                        min={1}
                        value={draft?.capacity ?? item.capacity}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...prev[item.id],
                              capacity: Number(e.target.value),
                            },
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className="w-full rounded border border-primary/20 px-2 py-1"
                        value={draft?.notes ?? item.notes}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...prev[item.id],
                              notes: e.target.value,
                            },
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        <button onClick={() => void saveTool(item.id)} className="rounded bg-primary px-2 py-1 text-xs text-white">
                          保存
                        </button>
                        <button onClick={() => void removeTool(item.id)} className="rounded border border-red-300 px-2 py-1 text-xs text-red-600">
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
