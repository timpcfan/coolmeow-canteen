export const ONBOARDING_STATUS_KEY = "coolmeow-onboarding-v1_1";

export type OnboardingStatus = "completed" | "skipped" | null;

export function getOnboardingStatus(): OnboardingStatus {
  if (typeof window === "undefined") {
    return null;
  }
  const value = window.localStorage.getItem(ONBOARDING_STATUS_KEY);
  if (value === "completed" || value === "skipped") {
    return value;
  }
  return null;
}

export function setOnboardingStatus(status: Exclude<OnboardingStatus, null>): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(ONBOARDING_STATUS_KEY, status);
}

export function resetOnboardingStatus(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(ONBOARDING_STATUS_KEY);
}
