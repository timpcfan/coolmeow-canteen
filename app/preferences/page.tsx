"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/client-api";
import { getOnboardingStatus, resetOnboardingStatus, setOnboardingStatus } from "@/lib/onboarding-client";

type Preference = {
  householdSize: number;
  preferredCookingMethods: string[];
  lowCalOnly: boolean;
  flavorPreferences: string[];
  avoidIngredients: string[];
  allergens: string[];
  needSoup: boolean;
  stapleRequired: boolean;
};

function csvToList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function PreferencesPage() {
  const router = useRouter();
  const [form, setForm] = useState<Preference | null>(null);
  const [methodText, setMethodText] = useState("");
  const [flavorText, setFlavorText] = useState("");
  const [avoidText, setAvoidText] = useState("");
  const [allergenText, setAllergenText] = useState("");
  const [guideStatus, setGuideStatus] = useState<"pending" | "completed" | "skipped">("pending");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/preferences"));
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error ?? "读取偏好失败");
      }
      const item = payload.item as Preference;
      setForm(item);
      setMethodText(item.preferredCookingMethods.join(", "));
      setFlavorText(item.flavorPreferences.join(", "));
      setAvoidText(item.avoidIngredients.join(", "));
      setAllergenText(item.allergens.join(", "));
    } catch (err) {
      setError(err instanceof Error ? err.message : "读取偏好失败");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const status = getOnboardingStatus();
    setGuideStatus(status ?? "pending");
  }, []);

  const save = async () => {
    if (!form) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        preferredCookingMethods: csvToList(methodText),
        flavorPreferences: csvToList(flavorText),
        avoidIngredients: csvToList(avoidText),
        allergens: csvToList(allergenText),
      };

      const res = await fetch(apiUrl("/api/preferences"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "保存失败");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (!form) {
    return <div className="rounded-xl border border-primary/20 bg-white p-4 text-primary/70">偏好加载中...</div>;
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-primary/20 bg-white p-5">
        <h1 className="text-2xl font-bold text-primary">偏好设置</h1>
        <p className="mt-1 text-sm text-primary/70">控制口味、禁忌、过敏原、是否需要汤、主食是否必含等。</p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm text-primary/80">
            家庭人份
            <input
              className="mt-1 w-full rounded-md border border-primary/30 px-2 py-2"
              type="number"
              min={1}
              max={12}
              value={form.householdSize}
              onChange={(e) => setForm((prev) => (prev ? { ...prev, householdSize: Number(e.target.value) } : prev))}
            />
          </label>

          <label className="text-sm text-primary/80">
            烹饪方式偏好（逗号分隔）
            <input
              className="mt-1 w-full rounded-md border border-primary/30 px-2 py-2"
              value={methodText}
              onChange={(e) => setMethodText(e.target.value)}
              placeholder="steam, boil, stir_fry"
            />
          </label>

          <label className="text-sm text-primary/80">
            口味偏好（逗号分隔）
            <input
              className="mt-1 w-full rounded-md border border-primary/30 px-2 py-2"
              value={flavorText}
              onChange={(e) => setFlavorText(e.target.value)}
              placeholder="清淡, 鲜香"
            />
          </label>

          <label className="text-sm text-primary/80">
            忌口食材（逗号分隔）
            <input
              className="mt-1 w-full rounded-md border border-primary/30 px-2 py-2"
              value={avoidText}
              onChange={(e) => setAvoidText(e.target.value)}
            />
          </label>

          <label className="text-sm text-primary/80">
            过敏原（逗号分隔）
            <input
              className="mt-1 w-full rounded-md border border-primary/30 px-2 py-2"
              value={allergenText}
              onChange={(e) => setAllergenText(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-3">
          <label className="flex items-center gap-2 text-sm text-primary/90">
            <input
              type="checkbox"
              checked={form.lowCalOnly}
              onChange={(e) => setForm((prev) => (prev ? { ...prev, lowCalOnly: e.target.checked } : prev))}
            />
            仅低卡
          </label>
          <label className="flex items-center gap-2 text-sm text-primary/90">
            <input
              type="checkbox"
              checked={form.needSoup}
              onChange={(e) => setForm((prev) => (prev ? { ...prev, needSoup: e.target.checked } : prev))}
            />
            需要汤
          </label>
          <label className="flex items-center gap-2 text-sm text-primary/90">
            <input
              type="checkbox"
              checked={form.stapleRequired}
              onChange={(e) => setForm((prev) => (prev ? { ...prev, stapleRequired: e.target.checked } : prev))}
            />
            主食必含
          </label>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button onClick={() => void save()} className="rounded-md bg-primary px-4 py-2 text-sm text-white" disabled={saving}>
            保存偏好
          </button>
          <button onClick={() => void load()} className="rounded-md border border-primary/30 px-4 py-2 text-sm text-primary">
            重载
          </button>
          {saving && <span className="text-sm text-primary/70">保存中...</span>}
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </section>

      <section className="rounded-2xl border border-primary/20 bg-white p-5">
        <h2 className="text-lg font-semibold text-primary">新手引导入口</h2>
        <p className="mt-1 text-sm text-primary/70">
          当前状态:
          {guideStatus === "completed" && " 已完成"}
          {guideStatus === "skipped" && " 已跳过"}
          {guideStatus === "pending" && " 未设置"}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setOnboardingStatus("skipped");
              setGuideStatus("skipped");
            }}
            className="rounded-md border border-primary/30 px-4 py-2 text-sm text-primary"
          >
            标记为跳过引导
          </button>
          <button
            onClick={() => {
              resetOnboardingStatus();
              setGuideStatus("pending");
              router.push(apiUrl("/week-plan?onboarding=1"));
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm text-white"
          >
            重新进入引导
          </button>
        </div>
      </section>
    </div>
  );
}
