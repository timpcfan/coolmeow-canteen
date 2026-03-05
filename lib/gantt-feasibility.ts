import type { GanttTask } from "@/lib/types";

export const DEFAULT_MAX_MEAL_DURATION_MIN = 240;

export type GanttFeasibilityIssueCode = "duration_overflow" | "tool_conflict" | "step_mutex_conflict";

export type GanttFeasibilityIssue = {
  code: GanttFeasibilityIssueCode;
  message: string;
  taskIds: string[];
};

export type GanttFeasibilityResult = {
  isExecutable: boolean;
  totalDurationMin: number;
  issues: GanttFeasibilityIssue[];
};

function overlap(a: GanttTask, b: GanttTask): boolean {
  return a.startMin < b.endMin && b.startMin < a.endMin;
}

export function validateGanttExecutability(
  tasks: GanttTask[],
  options?: { maxDurationMin?: number },
): GanttFeasibilityResult {
  const maxDurationMin = options?.maxDurationMin ?? DEFAULT_MAX_MEAL_DURATION_MIN;
  const issues: GanttFeasibilityIssue[] = [];
  const totalDurationMin = Math.max(...tasks.map((task) => task.endMin), 0);

  if (totalDurationMin > maxDurationMin) {
    issues.push({
      code: "duration_overflow",
      message: `总时长 ${totalDurationMin} 分钟，超过上限 ${maxDurationMin} 分钟`,
      taskIds: [],
    });
  }

  for (const task of tasks) {
    if (task.startMin < 0 || task.endMin <= task.startMin) {
      issues.push({
        code: "duration_overflow",
        message: `步骤 ${task.taskId} 时长区间无效`,
        taskIds: [task.taskId],
      });
    }
  }

  const toolBuckets = new Map<string, GanttTask[]>();
  for (const task of tasks) {
    if (!task.toolType) {
      continue;
    }
    const key = `${task.toolType}#${task.lane}`;
    const list = toolBuckets.get(key) ?? [];
    list.push(task);
    toolBuckets.set(key, list);
  }

  for (const list of toolBuckets.values()) {
    const sorted = [...list].sort((a, b) => a.startMin - b.startMin);
    for (let i = 1; i < sorted.length; i += 1) {
      if (overlap(sorted[i - 1], sorted[i])) {
        issues.push({
          code: "tool_conflict",
          message: `${sorted[i].toolType ?? "工具"} 泳道冲突`,
          taskIds: [sorted[i - 1].taskId, sorted[i].taskId],
        });
      }
    }
  }

  const recipeBuckets = new Map<number, GanttTask[]>();
  for (const task of tasks) {
    const list = recipeBuckets.get(task.recipeId) ?? [];
    list.push(task);
    recipeBuckets.set(task.recipeId, list);
  }

  for (const list of recipeBuckets.values()) {
    const sorted = [...list].sort((a, b) => a.startMin - b.startMin);
    for (let i = 1; i < sorted.length; i += 1) {
      if (overlap(sorted[i - 1], sorted[i])) {
        issues.push({
          code: "step_mutex_conflict",
          message: `${sorted[i].recipeName} 存在互斥步骤重叠`,
          taskIds: [sorted[i - 1].taskId, sorted[i].taskId],
        });
      }
    }
  }

  return {
    isExecutable: issues.length === 0,
    totalDurationMin,
    issues,
  };
}
