import type { GanttTask } from "@/lib/types";

type CountdownView = {
  focusTaskIds: string[];
  parallelTaskIds: string[];
  clockByTaskId: Record<string, { start: string; end: string }>;
  mealStartClock: string;
  serveClock: string;
};

type Props = {
  tasks: GanttTask[];
  countdown?: CountdownView;
};

const palette = ["#2f6c5e", "#4d8e6f", "#d78f35", "#c45f36", "#496aa8", "#5f4b8b"];

function minutesToLabel(value: number): string {
  return `${value}m`;
}

export function GanttChart({ tasks, countdown }: Props) {
  if (tasks.length === 0) {
    return <div className="rounded-lg border border-primary/20 bg-white p-3 text-sm text-primary/70">暂无步骤数据</div>;
  }

  const maxEnd = Math.max(...tasks.map((task) => task.endMin), 1);
  const focusIds = new Set(countdown?.focusTaskIds ?? []);
  const parallelIds = new Set(countdown?.parallelTaskIds ?? []);

  return (
    <div className="space-y-2 rounded-xl border border-primary/20 bg-white p-3">
      {countdown && (
        <div className="rounded-md border border-accent/25 bg-[#fff6ec] px-2 py-1 text-xs text-primary/80">
          倒排窗口: {countdown.mealStartClock} 开始，{countdown.serveClock} 开饭。高亮块表示当前应开始步骤，浅高亮表示可并行步骤。
        </div>
      )}

      {tasks.map((task, index) => {
        const left = (task.startMin / maxEnd) * 100;
        const width = ((task.endMin - task.startMin) / maxEnd) * 100;
        const isFocus = focusIds.has(task.taskId);
        const isParallel = !isFocus && parallelIds.has(task.taskId);
        const color = isFocus ? "#c45f36" : isParallel ? "#d78f35" : palette[index % palette.length];
        const clockLabel = countdown?.clockByTaskId[task.taskId];

        return (
          <div key={task.taskId} className="space-y-1">
            <div className="flex items-center justify-between text-xs text-primary/80">
              <span>
                {task.recipeName} / {task.label}
                {isFocus && " / 当前应开始"}
                {isParallel && " / 可并行"}
              </span>
              <span>
                {minutesToLabel(task.startMin)} - {minutesToLabel(task.endMin)}
                {task.toolType ? ` / ${task.toolType}#${task.lane}` : " / 备料"}
                {clockLabel ? ` / ${clockLabel.start}-${clockLabel.end}` : ""}
              </span>
            </div>
            <div className="relative h-5 overflow-hidden rounded-md bg-[#eef3ef]">
              <div
                className={`absolute inset-y-0 rounded-md ${isFocus ? "ring-2 ring-accent/60" : ""} ${isParallel ? "opacity-95" : ""}`}
                style={{
                  left: `${left}%`,
                  width: `${Math.max(width, 6)}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
