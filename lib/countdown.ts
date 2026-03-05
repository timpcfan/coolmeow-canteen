import type { GanttTask } from "@/lib/types";

export type CountdownTask = GanttTask & {
  startAt: string;
  endAt: string;
  startClock: string;
  endClock: string;
  shouldStartNow: boolean;
  isParallelStep: boolean;
};

export type MealCountdownSchedule = {
  mealDate: string;
  serveAt: string;
  serveClock: string;
  mealStartAt: string;
  mealStartClock: string;
  totalDurationMin: number;
  startsInMin: number;
  tasks: CountdownTask[];
};

function parseClock(input: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(input.trim());
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

function withMinutes(date: string, minutesOfDay: number): Date {
  const [year, month, day] = date.split("-").map((item) => Number(item));
  const result = new Date(year, month - 1, day, 0, 0, 0, 0);
  result.setMinutes(minutesOfDay);
  return result;
}

function toClockLabel(value: Date): string {
  return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}

export function buildMealCountdownSchedule(params: {
  mealDate: string;
  targetServeTime: string;
  tasks: GanttTask[];
  now?: Date;
}): MealCountdownSchedule | null {
  const { mealDate, targetServeTime, tasks, now = new Date() } = params;
  if (tasks.length === 0) {
    return null;
  }

  const minutesOfDay = parseClock(targetServeTime);
  if (minutesOfDay === null) {
    return null;
  }

  const totalDurationMin = Math.max(...tasks.map((task) => task.endMin), 0);
  const serveAt = withMinutes(mealDate, minutesOfDay);
  const mealStartAt = new Date(serveAt.getTime() - totalDurationMin * 60 * 1000);
  const nowMs = now.getTime();

  const scheduled = tasks
    .map((task) => {
      const startTime = new Date(mealStartAt.getTime() + task.startMin * 60 * 1000);
      const endTime = new Date(mealStartAt.getTime() + task.endMin * 60 * 1000);
      return {
        ...task,
        startTime,
        endTime,
        startMs: startTime.getTime(),
        endMs: endTime.getTime(),
      };
    })
    .sort((a, b) => a.startMs - b.startMs);

  let focusStartMs: number | null = null;

  const exactStartBatch = scheduled.filter((task) => nowMs >= task.startMs && nowMs < task.startMs + 60 * 1000);
  if (exactStartBatch.length > 0) {
    focusStartMs = Math.min(...exactStartBatch.map((task) => task.startMs));
  }

  if (focusStartMs === null) {
    const activeBatch = scheduled.filter((task) => nowMs >= task.startMs && nowMs < task.endMs);
    if (activeBatch.length > 0) {
      focusStartMs = Math.max(...activeBatch.map((task) => task.startMs));
    }
  }

  if (focusStartMs === null) {
    const nextBatch = scheduled.filter((task) => task.startMs > nowMs).sort((a, b) => a.startMs - b.startMs);
    if (nextBatch.length > 0) {
      focusStartMs = nextBatch[0].startMs;
    }
  }

  if (focusStartMs === null) {
    focusStartMs = Math.max(...scheduled.map((task) => task.startMs));
  }

  const focusBatch = scheduled.filter((task) => task.startMs === focusStartMs);

  const outputTasks: CountdownTask[] = scheduled.map((task) => {
    const shouldStartNow = task.startMs === focusStartMs;
    const isParallelStep =
      !shouldStartNow && focusBatch.some((focus) => task.startMs < focus.endMs && task.endMs > focus.startMs);

    return {
      ...task,
      startAt: task.startTime.toISOString(),
      endAt: task.endTime.toISOString(),
      startClock: toClockLabel(task.startTime),
      endClock: toClockLabel(task.endTime),
      shouldStartNow,
      isParallelStep,
    };
  });

  const startsInMin = Math.max(0, Math.ceil((focusStartMs - nowMs) / (60 * 1000)));

  return {
    mealDate,
    serveAt: serveAt.toISOString(),
    serveClock: toClockLabel(serveAt),
    mealStartAt: mealStartAt.toISOString(),
    mealStartClock: toClockLabel(mealStartAt),
    totalDurationMin,
    startsInMin,
    tasks: outputTasks,
  };
}
