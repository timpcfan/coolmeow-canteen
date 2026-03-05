"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/client-api";

type ShoppingItem = {
  ingredientId: number;
  ingredientName: string;
  unit: string;
  required: number;
  inStock: number;
  shortage: number;
  neededBy: string;
  suggestedPurchaseDate: string;
};

type ShoppingResponse = {
  startDate: string;
  endDate: string;
  items: ShoppingItem[];
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ShoppingListPage() {
  const [startDate, setStartDate] = useState(today());
  const [data, setData] = useState<ShoppingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/shopping-list?startDate=${startDate}&days=7`));
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error ?? "读取采购清单失败");
      }
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "读取采购清单失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-primary/20 bg-white p-5">
        <h1 className="text-2xl font-bold text-primary">采购清单</h1>
        <p className="mt-1 text-sm text-primary/70">按一周缺口汇总并给出建议采购时点。</p>
        <div className="mt-4 flex items-center gap-3">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-md border border-primary/30 px-2 py-1"
          />
          <button onClick={() => void refresh()} className="rounded-md bg-primary px-4 py-2 text-sm text-white">
            刷新清单
          </button>
          {loading && <span className="text-sm text-primary/70">加载中...</span>}
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </section>

      {data && (
        <section className="rounded-2xl border border-primary/20 bg-white p-5">
          <h2 className="text-lg font-semibold text-primary">
            {data.startDate} 至 {data.endDate}
          </h2>
          {data.items.length === 0 ? (
            <p className="mt-3 text-sm text-primary/70">库存足够，无需采购。</p>
          ) : (
            <div className="mt-3 overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-primary/20 text-left text-primary/70">
                    <th className="px-2 py-2">食材</th>
                    <th className="px-2 py-2">总需</th>
                    <th className="px-2 py-2">库存</th>
                    <th className="px-2 py-2">缺口</th>
                    <th className="px-2 py-2">最晚需要</th>
                    <th className="px-2 py-2">建议采购</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.ingredientId} className="border-b border-primary/10">
                      <td className="px-2 py-2 font-medium text-primary">{item.ingredientName}</td>
                      <td className="px-2 py-2">
                        {item.required}
                        {item.unit}
                      </td>
                      <td className="px-2 py-2">
                        {item.inStock}
                        {item.unit}
                      </td>
                      <td className="px-2 py-2 text-red-600">
                        {item.shortage}
                        {item.unit}
                      </td>
                      <td className="px-2 py-2">{item.neededBy}</td>
                      <td className="px-2 py-2 text-accent">{item.suggestedPurchaseDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
