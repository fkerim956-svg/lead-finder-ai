import {
  ANALYSIS_HISTORY_STORAGE_KEY,
  LATEST_ANALYSIS_STORAGE_KEY,
  SELECTED_INTENT_STORAGE_KEY,
} from "@/lib/storage-keys";
import type {
  AnalysisHistoryItem,
  LatestAnalysis,
  SelectedIntent,
} from "@/types/business";

const maxHistoryItems = 50;

function createAnalysisId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `analysis-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getSelectedIntent(): SelectedIntent | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.localStorage.getItem(SELECTED_INTENT_STORAGE_KEY) ===
    "web-design"
    ? "web-design"
    : "review-card";
}

function getAnalysisSignature(analysis: LatestAnalysis): string {
  const businessSignature = analysis.businesses
    .map(
      (business) =>
        `${business.businessName}|${business.location}|${business.category}`,
    )
    .join("::");

  return [
    analysis.country,
    analysis.city,
    analysis.district,
    analysis.category,
    analysis.createdAt,
    businessSignature,
  ].join("||");
}

function normalizeAnalysis(analysis: LatestAnalysis): AnalysisHistoryItem {
  const createdAt = analysis.createdAt || new Date().toISOString();
  const selectedIntent = analysis.selectedIntent ?? getSelectedIntent();

  return {
    ...analysis,
    id: analysis.id ?? createAnalysisId(),
    createdAt,
    selectedIntent,
    businessCount: analysis.businesses.length,
  };
}

export function getAnalysisHistory(): AnalysisHistoryItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  const savedHistory = window.localStorage.getItem(ANALYSIS_HISTORY_STORAGE_KEY);

  if (!savedHistory) {
    return [];
  }

  try {
    const parsedHistory = JSON.parse(savedHistory) as AnalysisHistoryItem[];

    return parsedHistory
      .filter((analysis) => analysis.id && Array.isArray(analysis.businesses))
      .map((analysis) => ({
        ...analysis,
        businessCount: analysis.businesses.length,
      }));
  } catch {
    window.localStorage.removeItem(ANALYSIS_HISTORY_STORAGE_KEY);
    return [];
  }
}

export function getLatestAnalysis(): LatestAnalysis | null {
  if (typeof window === "undefined") {
    return null;
  }

  const savedAnalysis = window.localStorage.getItem(LATEST_ANALYSIS_STORAGE_KEY);

  if (!savedAnalysis) {
    return null;
  }

  try {
    return JSON.parse(savedAnalysis) as LatestAnalysis;
  } catch {
    window.localStorage.removeItem(LATEST_ANALYSIS_STORAGE_KEY);
    return null;
  }
}

export function setLatestAnalysis(analysis: LatestAnalysis): AnalysisHistoryItem {
  const normalizedAnalysis = normalizeAnalysis(analysis);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      LATEST_ANALYSIS_STORAGE_KEY,
      JSON.stringify(normalizedAnalysis),
    );
  }

  return normalizedAnalysis;
}

export function saveAnalysisToHistory(
  analysis: LatestAnalysis,
): AnalysisHistoryItem {
  const normalizedAnalysis = setLatestAnalysis(analysis);

  if (typeof window === "undefined") {
    return normalizedAnalysis;
  }

  const history = getAnalysisHistory();
  const normalizedSignature = getAnalysisSignature(normalizedAnalysis);
  const withoutDuplicate = history.filter((historyItem) => {
    if (historyItem.id === normalizedAnalysis.id) {
      return false;
    }

    return getAnalysisSignature(historyItem) !== normalizedSignature;
  });

  const nextHistory = [normalizedAnalysis, ...withoutDuplicate]
    .toSorted(
      (first, second) =>
        new Date(second.createdAt).getTime() -
        new Date(first.createdAt).getTime(),
    )
    .slice(0, maxHistoryItems);

  window.localStorage.setItem(
    ANALYSIS_HISTORY_STORAGE_KEY,
    JSON.stringify(nextHistory),
  );

  return normalizedAnalysis;
}

export function removeAnalysisFromHistory(id: string): AnalysisHistoryItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  const nextHistory = getAnalysisHistory().filter(
    (analysis) => analysis.id !== id,
  );

  window.localStorage.setItem(
    ANALYSIS_HISTORY_STORAGE_KEY,
    JSON.stringify(nextHistory),
  );

  return nextHistory;
}

export function clearAnalysisHistory(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ANALYSIS_HISTORY_STORAGE_KEY);
}
