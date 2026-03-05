"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { GanttChart } from "@/components/gantt-chart";
import { buildMealCountdownSchedule } from "@/lib/countdown";
import { apiUrl } from "@/lib/client-api";
import { getOnboardingStatus, setOnboardingStatus } from "@/lib/onboarding-client";

type Meal = {
  id: number;
  date: string;
  mealType: "breakfast" | "lunch" | "dinner";
  mealLabel: string;
  householdSize: number;
  staple: { id: number; name: string } | null;
  dishes: Array<{ id: number; name: string }>;
  soup: { id: number; name: string } | null;
  gantt: Array<{
    taskId: string;
    label: string;
    recipeId: number;
    recipeName: string;
    toolType: string | null;
    lane: number;
    startMin: number;
    endMin: number;
  }>;
};

type ShoppingItem = {
  ingredientId: number;
  ingredientName: string;
  unit: string;
  shortage: number;
  neededBy: string;
  suggestedPurchaseDate: string;
};

type WeekResponse = {
  startDate: string;
  endDate: string;
  meals: Meal[];
  shoppingGaps: ShoppingItem[];
};

type QuickTuneObjective = "balanced" | "faster" | "budget" | "low_cal";

type OnboardingDraft = {
  householdSize: number;
  needSoup: boolean;
  toolTypes: string[];
};

const MEAL_ORDER: Record<Meal["mealType"], number> = {
  breakfast: 1,
  lunch: 2,
  dinner: 3,
};

const TOOL_CHOICES = [
  { label: "蒸锅", value: "steamer" },
  { label: "电饭煲", value: "rice_cooker" },
  { label: "燃气灶", value: "gas_stove" },
  { label: "电磁炉", value: "induction" },
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function mealOptionLabel(meal: Meal): string {
  return `${meal.date} ${meal.mealLabel}`;
}

function OnboardingDialog(props: {
  open: boolean;
  saving: boolean;
  error: string | null;
  draft: OnboardingDraft;
  onChange: (patch: Partial<OnboardingDraft>) => void;
  onSkip: () => void;
  onComplete: () => void;
}) {
  const { open, saving, error, draft, onChange, onSkip, onComplete } = props;
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) {
      setStep(0);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-xl rounded-2xl border border-primary/25 bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-primary">欢迎使用冷喵食堂</h2>
          <button onClick={onSkip} className="text-sm text-primary/70 underline hover:text-primary" disabled={saving}>
            跳过引导
          </button>
        </div>
        <p className="mt-1 text-sm text-primary/70">第 {step + 1} 步 / 3 步，完成后会自动写入配置并生成一周计划。</p>

        <div className="mt-4 rounded-xl border border-primary/20 bg-[#fbf9ef] p-4">
          {step === 0 && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-primary">家里通常做几人份？</div>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6].map((count) => (
                  <button
                    key={count}
                    onClick={() => onChange({ householdSize: count })}
                    className={`rounded-full border px-3 py-1 text-sm ${
                      draft.householdSize === count ? "border-primary bg-primary text-white" : "border-primary/30 text-primary"
                    }`}
                    disabled={saving}
                  >
                    {count} 人
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-primary">每餐是否需要汤？</div>
              <div className="flex gap-2">
                <button
                  onClick={() => onChange({ needSoup: true })}
                  className={`rounded-md border px-4 py-2 text-sm ${
                    draft.needSoup ? "border-primary bg-primary text-white" : "border-primary/30 text-primary"
                  }`}
                  disabled={saving}
                >
                  需要汤
                </button>
                <button
                  onClick={() => onChange({ needSoup: false })}
                  className={`rounded-md border px-4 py-2 text-sm ${
                    !draft.needSoup ? "border-primary bg-primary text-white" : "border-primary/30 text-primary"
                  }`}
                  disabled={saving}
                >
                  不需要汤
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-primary">常用工具（可多选）</div>
              <div className="grid gap-2 md:grid-cols-2">
                {TOOL_CHOICES.map((tool) => {
                  const checked = draft.toolTypes.includes(tool.value);
                  return (
                    <label
                      key={tool.value}
                      className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                        checked ? "border-primary bg-primary/10 text-primary" : "border-primary/20 text-primary/80"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onChange({ toolTypes: [...draft.toolTypes, tool.value] });
                            return;
                          }
                          onChange({ toolTypes: draft.toolTypes.filter((item) => item !== tool.value) });
                        }}
                        disabled={saving}
                      />
                      {tool.label}
                    </label>
                  );
                })}
              </div>
              {draft.toolTypes.length === 0 && <div className="text-xs text-primary/70">不选时将应用默认工具组合。</div>}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => setStep((prev) => Math.max(0, prev - 1))}
            className="rounded-md border border-primary/30 px-3 py-2 text-sm text-primary"
            disabled={saving || step === 0}
          >
            上一步
          </button>

          {step < 2 ? (
            <button
              onClick={() => setStep((prev) => Math.min(2, prev + 1))}
              className="rounded-md bg-primary px-4 py-2 text-sm text-white"
              disabled={saving}
            >
              下一步
            </button>
          ) : (
            <button onClick={onComplete} className="rounded-md bg-primary px-4 py-2 text-sm text-white" disabled={saving}>
              完成并生成计划
            </button>
          )}
        </div>
        {saving && <div className="mt-2 text-sm text-primary/70">正在保存配置并生成计划...</div>}
        {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
      </div>
    </div>
  );
}

export default function WeekPlanPage() {
  const searchParams = useSearchParams();
  const [startDate, setStartDate] = useState(today());
  const [data, setData] = useState<WeekResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [activeAction, setActiveAction] = useState<{ mealId: number; objective: QuickTuneObjective } | null>(null);

  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [onboardingDraft, setOnboardingDraft] = useState<OnboardingDraft>({
    householdSize: 3,
    needSoup: true,
    toolTypes: ["gas_stove", "rice_cooker"],
  });

  const [countdownEnabled, setCountdownEnabled] = useState(false);
  const [countdownTime, setCountdownTime] = useState("19:00");
  const [countdownMealId, setCountdownMealId] = useState<number | null>(null);
  const [clockTick, setClockTick] = useState(Date.now());

  const grouped = useMemo(() => {
    const map = new Map<string, Meal[]>();
    for (const meal of data?.meals ?? []) {
      const list = map.get(meal.date) ?? [];
      list.push(meal);
      map.set(meal.date, list.sort((a, b) => MEAL_ORDER[a.mealType] - MEAL_ORDER[b.mealType]));
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  const fetchWeek = async (forceGenerate = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/weekly-plan?startDate=${startDate}&days=7`), {
        method: forceGenerate ? "POST" : "GET",
        headers: { "Content-Type": "application/json" },
        body: forceGenerate ? JSON.stringify({ startDate, days: 7 }) : undefined,
      });
      const payload = (await res.json()) as WeekResponse & { error?: string };
      if (!res.ok) {
        throw new Error(payload.error ?? "请求失败");
      }
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取周计划失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchWeek(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const forceOpen = searchParams.get("onboarding") === "1";
    const status = getOnboardingStatus();
    if (forceOpen || status === null) {
      setOnboardingOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!data?.meals.length) {
      return;
    }

    setCountdownMealId((prev) => {
      if (prev && data.meals.some((meal) => meal.id === prev)) {
        return prev;
      }
      return data.meals[0].id;
    });
  }, [data]);

  useEffect(() => {
    if (!countdownEnabled) {
      return;
    }
    const timer = window.setInterval(() => setClockTick(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, [countdownEnabled]);

  const runQuickTune = async (mealId: number, objective: QuickTuneObjective) => {
    setActiveAction({ mealId, objective });
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/weekly-plan/${mealId}/replace`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objective }),
      });
      const payload = (await res.json()) as { meal?: Meal; error?: string };
      if (!res.ok || !payload.meal) {
        throw new Error(payload.error ?? "替换失败");
      }

      setData((prev) => {
        if (!prev) {
          return prev;
        }
        return {
          ...prev,
          meals: prev.meals.map((meal) => (meal.id === mealId ? payload.meal! : meal)),
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "替换失败");
    } finally {
      setActiveAction(null);
    }
  };

  const completeOnboarding = async () => {
    setOnboardingSaving(true);
    setOnboardingError(null);
    setError(null);

    try {
      const res = await fetch(apiUrl("/api/onboarding/complete"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...onboardingDraft,
          startDate,
          days: 7,
        }),
      });

      const payload = (await res.json()) as WeekResponse & { error?: string };
      if (!res.ok) {
        throw new Error(payload.error ?? "引导保存失败");
      }

      setData(payload);
      setStartDate(payload.startDate);
      setOnboardingStatus("completed");
      setOnboardingOpen(false);
    } catch (err) {
      setOnboardingError(err instanceof Error ? err.message : "引导保存失败");
    } finally {
      setOnboardingSaving(false);
    }
  };

  const skipOnboarding = () => {
    setOnboardingStatus("skipped");
    setOnboardingOpen(false);
  };

  const countdownMeal = useMemo(() => {
    if (!data || countdownMealId === null) {
      return null;
    }
    return data.meals.find((meal) => meal.id === countdownMealId) ?? null;
  }, [countdownMealId, data]);

  const countdownSchedule = useMemo(() => {
    if (!countdownEnabled || !countdownMeal) {
      return null;
    }
    return buildMealCountdownSchedule({
      mealDate: countdownMeal.date,
      targetServeTime: countdownTime,
      tasks: countdownMeal.gantt,
      now: new Date(clockTick),
    });
  }, [clockTick, countdownEnabled, countdownMeal, countdownTime]);

  return (
    <div className="space-y-5">
      <OnboardingDialog
        open={onboardingOpen}
        saving={onboardingSaving}
        error={onboardingError}
        draft={onboardingDraft}
        onChange={(patch) => setOnboardingDraft((prev) => ({ ...prev, ...patch }))}
        onSkip={skipOnboarding}
        onComplete={() => void completeOnboarding()}
      />

      <section className="rounded-2xl border border-primary/20 bg-white/95 p-5">
        <h1 className="text-2xl font-bold text-primary">周计划</h1>
        <p className="mt-1 text-sm text-primary/70">生成早餐/午餐/晚餐组合，支持快捷调优、手动替换和倒排甘特。</p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="text-sm text-primary/80">
            起始日期
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="ml-2 rounded-md border border-primary/30 px-2 py-1"
            />
          </label>
          <button
            onClick={() => void fetchWeek(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-primary/90"
            disabled={loading}
          >
            生成/重算一周
          </button>
          <button
            onClick={() => void fetchWeek(false)}
            className="rounded-md border border-primary/30 px-4 py-2 text-sm text-primary hover:bg-primary/10"
            disabled={loading}
          >
            刷新
          </button>
          {loading && <span className="text-sm text-primary/70">加载中...</span>}
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </section>

      {data && (
        <section className="rounded-2xl border border-primary/20 bg-white/95 p-5">
          <h2 className="text-lg font-semibold text-primary">开饭倒计时模式</h2>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="text-sm text-primary/85">我想在</span>
            <input
              type="time"
              value={countdownTime}
              onChange={(e) => setCountdownTime(e.target.value)}
              className="rounded-md border border-primary/30 px-3 py-1"
            />
            <span className="text-sm text-primary/85">开饭，当前餐</span>
            <select
              value={countdownMealId ?? ""}
              onChange={(e) => setCountdownMealId(Number(e.target.value))}
              className="rounded-md border border-primary/30 px-2 py-1 text-sm text-primary"
            >
              {data.meals.map((meal) => (
                <option key={meal.id} value={meal.id}>
                  {mealOptionLabel(meal)}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setClockTick(Date.now());
                setCountdownEnabled(true);
              }}
              className="rounded-md bg-primary px-3 py-2 text-sm text-white"
            >
              开始倒排
            </button>
            <button
              onClick={() => setCountdownEnabled(false)}
              className="rounded-md border border-primary/30 px-3 py-2 text-sm text-primary"
            >
              关闭倒计时
            </button>
          </div>

          {countdownEnabled && countdownSchedule && (
            <p className="mt-2 text-sm text-primary/80">
              本餐总耗时约 {countdownSchedule.totalDurationMin} 分钟。建议 {countdownSchedule.mealStartClock} 开始，{countdownSchedule.serveClock} 开饭。
              {countdownSchedule.startsInMin > 0
                ? ` 下一批步骤将在 ${countdownSchedule.startsInMin} 分钟后开始。`
                : " 当前有步骤应立即开始（甘特图已高亮）。"}
            </p>
          )}

          {countdownEnabled && !countdownSchedule && (
            <p className="mt-2 text-sm text-red-600">当前餐无步骤或时间格式无效，请检查后重试。</p>
          )}
        </section>
      )}

      {data && (
        <section className="rounded-2xl border border-primary/20 bg-white/95 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-primary">
              计划周期 {data.startDate} 至 {data.endDate}
            </h2>
            <span className="text-sm text-primary/70">共 {data.meals.length} 餐</span>
          </div>

          <div className="mt-4 space-y-4">
            {grouped.map(([date, meals]) => (
              <div key={date} className="rounded-xl border border-primary/15 p-4">
                <div className="mb-3 text-sm font-semibold text-primary">{date}</div>
                <div className="grid gap-3 md:grid-cols-3">
                  {meals.map((meal) => {
                    const isLoading = activeAction?.mealId === meal.id;
                    const hasCountdown = countdownEnabled && countdownSchedule && countdownMealId === meal.id;
                    const focusTaskIds = hasCountdown
                      ? countdownSchedule.tasks.filter((task) => task.shouldStartNow).map((task) => task.taskId)
                      : [];
                    const parallelTaskIds = hasCountdown
                      ? countdownSchedule.tasks.filter((task) => task.isParallelStep).map((task) => task.taskId)
                      : [];
                    const clockByTaskId = hasCountdown
                      ? Object.fromEntries(
                          countdownSchedule.tasks.map((task) => [
                            task.taskId,
                            {
                              start: task.startClock,
                              end: task.endClock,
                            },
                          ]),
                        )
                      : {};

                    return (
                      <article key={meal.id} className="rounded-lg border border-primary/15 bg-[#fbf9ef] p-3">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-medium text-primary">{meal.mealLabel}</h3>
                          <div className="text-xs text-primary/70">{meal.householdSize} 人份</div>
                        </div>
                        <div className="mt-2 space-y-1 text-sm text-primary/85">
                          <div>主食: {meal.staple?.name ?? "不含"}</div>
                          <div>菜品: {meal.dishes.map((dish) => dish.name).join("、") || "无"}</div>
                          <div>汤: {meal.soup?.name ?? "不含"}</div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <button
                            onClick={() => void runQuickTune(meal.id, "faster")}
                            className="rounded-md border border-primary/30 px-2 py-1 text-primary hover:bg-primary/10"
                            disabled={isLoading}
                          >
                            换成更快
                          </button>
                          <button
                            onClick={() => void runQuickTune(meal.id, "budget")}
                            className="rounded-md border border-primary/30 px-2 py-1 text-primary hover:bg-primary/10"
                            disabled={isLoading}
                          >
                            换成更省钱
                          </button>
                          <button
                            onClick={() => void runQuickTune(meal.id, "low_cal")}
                            className="rounded-md border border-primary/30 px-2 py-1 text-primary hover:bg-primary/10"
                            disabled={isLoading}
                          >
                            换成更低卡
                          </button>
                          <button
                            onClick={() => void runQuickTune(meal.id, "balanced")}
                            className="rounded-md border border-accent/40 px-2 py-1 text-accent hover:bg-accent/10"
                            disabled={isLoading}
                          >
                            手动替换
                          </button>
                        </div>
                        {isLoading && <p className="mt-2 text-xs text-primary/70">正在替换...</p>}

                        <div className="mt-3 flex items-center gap-3 text-xs">
                          <button
                            onClick={() =>
                              setExpanded((prev) => ({
                                ...prev,
                                [meal.id]: !prev[meal.id],
                              }))
                            }
                            className="text-primary underline hover:text-primary/80"
                          >
                            {expanded[meal.id] ? "收起甘特图" : "查看甘特图"}
                          </button>
                          <button
                            onClick={() => {
                              setCountdownMealId(meal.id);
                              setCountdownEnabled(true);
                              setExpanded((prev) => ({ ...prev, [meal.id]: true }));
                              setClockTick(Date.now());
                            }}
                            className="text-accent underline hover:text-accent/80"
                          >
                            设为当前倒计时餐
                          </button>
                        </div>

                        {expanded[meal.id] && (
                          <div className="mt-2">
                            <GanttChart
                              tasks={meal.gantt}
                              countdown={
                                hasCountdown
                                  ? {
                                      focusTaskIds,
                                      parallelTaskIds,
                                      clockByTaskId,
                                      mealStartClock: countdownSchedule.mealStartClock,
                                      serveClock: countdownSchedule.serveClock,
                                    }
                                  : undefined
                              }
                            />
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {data && data.shoppingGaps.length > 0 && (
        <section className="rounded-2xl border border-accent/30 bg-[#fff8ed] p-5">
          <h2 className="text-lg font-semibold text-primary">缺货预警（节选）</h2>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {data.shoppingGaps.slice(0, 6).map((item) => (
              <div key={item.ingredientId} className="rounded-lg border border-accent/25 bg-white p-3 text-sm text-primary/85">
                <div className="font-medium text-primary">
                  {item.ingredientName} 缺 {item.shortage}
                  {item.unit}
                </div>
                <div className="mt-1">最迟采购: {item.suggestedPurchaseDate}</div>
                <div>最晚需要: {item.neededBy}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
