export type ConfigSource = "onboarding" | "quick_tune" | "manual";

export const CONFIG_SOURCE_KEY = "coolmeow-config-source-v1";
export const CONFIG_SOURCE_LABELS: Record<ConfigSource, string> = {
  onboarding: "引导",
  quick_tune: "快捷调优",
  manual: "手动",
};

export function getConfigSource(): ConfigSource {
  if (typeof window === "undefined") {
    return "manual";
  }

  const value = window.localStorage.getItem(CONFIG_SOURCE_KEY);
  if (value === "onboarding" || value === "quick_tune" || value === "manual") {
    return value;
  }
  return "manual";
}

export function setConfigSource(source: ConfigSource): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(CONFIG_SOURCE_KEY, source);
}
