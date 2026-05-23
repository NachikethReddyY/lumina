/** Per-user onboarding draft stored in localStorage (survives refresh / browser close). */

export type OnboardingDraft = {
  firstName?: string;
  lastName?: string;
  category?: string | null;
  subtitle?: string | null;
};

const STORAGE_KEY = 'lumina.onboarding.draft';

function readStore(): Record<string, OnboardingDraft> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, OnboardingDraft>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, OnboardingDraft>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function loadOnboardingDraft(userId: string): OnboardingDraft {
  return readStore()[userId] ?? {};
}

export function saveOnboardingDraft(userId: string, patch: Partial<OnboardingDraft>) {
  const store = readStore();
  store[userId] = { ...store[userId], ...patch };
  writeStore(store);
}

export function clearOnboardingDraft(userId: string) {
  const store = readStore();
  delete store[userId];
  writeStore(store);
}
