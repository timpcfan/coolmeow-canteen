"use client";

import { useEffect, useMemo, useState } from "react";
import { apiUrl } from "@/lib/client-api";

type Ingredient = {
  id: number;
  name: string;
  unit: string;
};

type InventoryItem = {
  id: number;
  ingredientId: number;
  ingredientName: string;
  quantity: number;
  unit: string;
  location: string;
  expiresAt: string;
  updatedAt: string;
};

type InventoryResponse = {
  items: InventoryItem[];
  ingredients: Ingredient[];
};

type Draft = {
  ingredientId: number;
  quantity: number;
  unit: string;
  location: string;
  expiresAt: string;
};

function dayDiff(date: string): number {
  const now = new Date();
  const target = new Date(date);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function InventoryPage() {
  const [data, setData] = useState<InventoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);

  const [form, setForm] = useState<Draft>({
    ingredientId: 0,
    quantity: 0,
    unit: "g",
    location: "冷藏",
    expiresAt: new Date().toISOString().slice(0, 10),
  });

  const [drafts, setDrafts] = useState<Record<number, Draft>>({});

  const ingredientsMap = useMemo(() => {
    const map = new Map<number, Ingredient>();
    for (const ingredient of data?.ingredients ?? []) {
      map.set(ingredient.id, ingredient);
    }
    return map;
  }, [data]);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/inventory"));
      const payload = (await res.json()) as InventoryResponse & { error?: string };
      if (!res.ok) {
        throw new Error(payload.error ?? "读取库存失败");
      }

      setData(payload);
      setDrafts(
        Object.fromEntries(
          payload.items.map((item) => [
            item.id,
            {
              ingredientId: item.ingredientId,
              quantity: item.quantity,
              unit: item.unit,
              location: item.location,
              expiresAt: item.expiresAt,
            },
          ]),
        ),
      );
      if (payload.ingredients.length > 0) {
        setForm((prev) => ({
          ...prev,
          ingredientId: prev.ingredientId || payload.ingredients[0].id,
          unit: prev.unit === "g" ? payload.ingredients[0].unit : prev.unit,
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "读取库存失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const createItem = async () => {
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/inventory"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error ?? "新增库存失败");
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "新增库存失败");
    }
  };

  const saveItem = async (id: number) => {
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/inventory/${id}`), {
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
    } finally {
      setSavingId(null);
    }
  };

  const deleteItem = async (id: number) => {
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/inventory/${id}`), { method: "DELETE" });
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
        <h1 className="text-2xl font-bold text-primary">库存管理</h1>
        <p className="mt-1 text-sm text-primary/70">记录数量、位置、保质期并支持直接编辑。</p>

        <div className="mt-4 grid gap-3 md:grid-cols-6">
          <select
            className="rounded-md border border-primary/30 px-2 py-2"
            value={form.ingredientId}
            onChange={(e) => {
              const ingredientId = Number(e.target.value);
              const ingredient = ingredientsMap.get(ingredientId);
              setForm((prev) => ({
                ...prev,
                ingredientId,
                unit: ingredient?.unit ?? prev.unit,
              }));
            }}
          >
            {(data?.ingredients ?? []).map((ingredient) => (
              <option key={ingredient.id} value={ingredient.id}>
                {ingredient.name}
              </option>
            ))}
          </select>
          <input
            className="rounded-md border border-primary/30 px-2 py-2"
            type="number"
            step="0.1"
            placeholder="数量"
            value={form.quantity}
            onChange={(e) => setForm((prev) => ({ ...prev, quantity: Number(e.target.value) }))}
          />
          <input
            className="rounded-md border border-primary/30 px-2 py-2"
            value={form.unit}
            onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))}
          />
          <input
            className="rounded-md border border-primary/30 px-2 py-2"
            value={form.location}
            onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
          />
          <input
            className="rounded-md border border-primary/30 px-2 py-2"
            type="date"
            value={form.expiresAt}
            onChange={(e) => setForm((prev) => ({ ...prev, expiresAt: e.target.value }))}
          />
          <button onClick={() => void createItem()} className="rounded-md bg-primary px-3 py-2 text-white hover:bg-primary/90">
            新增
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-primary/20 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">库存列表</h2>
          <button onClick={() => void refresh()} className="text-sm text-primary underline">
            刷新
          </button>
        </div>

        {loading && <p className="text-sm text-primary/70">加载中...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-primary/20 text-left text-primary/75">
                <th className="px-2 py-2">食材</th>
                <th className="px-2 py-2">数量</th>
                <th className="px-2 py-2">单位</th>
                <th className="px-2 py-2">位置</th>
                <th className="px-2 py-2">保质期</th>
                <th className="px-2 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((item) => {
                const draft = drafts[item.id];
                const remain = dayDiff(draft?.expiresAt ?? item.expiresAt);

                return (
                  <tr key={item.id} className="border-b border-primary/10">
                    <td className="px-2 py-2">
                      <select
                        className="rounded border border-primary/20 px-2 py-1"
                        value={draft?.ingredientId ?? item.ingredientId}
                        onChange={(e) => {
                          const ingredientId = Number(e.target.value);
                          const ingredient = ingredientsMap.get(ingredientId);
                          setDrafts((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...prev[item.id],
                              ingredientId,
                              unit: ingredient?.unit ?? prev[item.id].unit,
                            },
                          }));
                        }}
                      >
                        {(data?.ingredients ?? []).map((ingredient) => (
                          <option key={ingredient.id} value={ingredient.id}>
                            {ingredient.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className="w-24 rounded border border-primary/20 px-2 py-1"
                        type="number"
                        step="0.1"
                        value={draft?.quantity ?? item.quantity}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...prev[item.id],
                              quantity: Number(e.target.value),
                            },
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className="w-20 rounded border border-primary/20 px-2 py-1"
                        value={draft?.unit ?? item.unit}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...prev[item.id],
                              unit: e.target.value,
                            },
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className="w-24 rounded border border-primary/20 px-2 py-1"
                        value={draft?.location ?? item.location}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...prev[item.id],
                              location: e.target.value,
                            },
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className="rounded border border-primary/20 px-2 py-1"
                        type="date"
                        value={draft?.expiresAt ?? item.expiresAt}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...prev[item.id],
                              expiresAt: e.target.value,
                            },
                          }))
                        }
                      />
                      <div className={`text-xs ${remain < 0 ? "text-red-600" : remain <= 2 ? "text-orange-600" : "text-primary/60"}`}>
                        {remain < 0 ? `已过期 ${Math.abs(remain)} 天` : `剩余 ${remain} 天`}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => void saveItem(item.id)}
                          disabled={savingId === item.id}
                          className="rounded bg-primary px-2 py-1 text-xs text-white"
                        >
                          保存
                        </button>
                        <button onClick={() => void deleteItem(item.id)} className="rounded border border-red-300 px-2 py-1 text-xs text-red-600">
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
