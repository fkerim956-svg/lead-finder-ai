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

type AnalysisMetadataUpdate = {
  analysisName: string;
  city: string;
  district: string;
  category: string;
};

function createAnalysisId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `analysis-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createStableLegacyAnalysisId(
  analysis: LatestAnalysis,
  index: number,
): string {
  const source = [
    analysis.createdAt,
    analysis.analysisName,
    analysis.country,
    analysis.city,
    analysis.district,
    analysis.category,
    analysis.businesses?.length ?? 0,
    index,
  ].join("|");
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) | 0;
  }

  return `legacy-analysis-${Math.abs(hash).toString(36)}`;
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

function sortHistory(history: AnalysisHistoryItem[]): AnalysisHistoryItem[] {
  return history.toSorted(
    (first, second) =>
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  );
}

function normalizeAnalysis(
  analysis: LatestAnalysis,
  fallbackId?: string,
): AnalysisHistoryItem {
  const createdAt = analysis.createdAt || new Date().toISOString();
  const selectedIntent = analysis.selectedIntent ?? getSelectedIntent();
  const analysisName = analysis.analysisName?.trim() || undefined;

  return {
    ...analysis,
    id: analysis.id ?? fallbackId ?? createAnalysisId(),
    analysisName,
    country: analysis.country || "Türkiye",
    city: analysis.city ?? "",
    district: analysis.district ?? "",
    category: analysis.category || "Manuel Veri",
    createdAt,
    selectedIntent,
    businesses: Array.isArray(analysis.businesses) ? analysis.businesses : [],
    businessCount: Array.isArray(analysis.businesses)
      ? analysis.businesses.length
      : 0,
  };
}

function saveHistory(history: AnalysisHistoryItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    ANALYSIS_HISTORY_STORAGE_KEY,
    JSON.stringify(sortHistory(history).slice(0, maxHistoryItems)),
  );
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
    const parsedHistory = JSON.parse(savedHistory) as LatestAnalysis[];
    let migratedLegacyIds = false;

    const history = parsedHistory
      .filter((analysis) => Array.isArray(analysis.businesses))
      .map((analysis, index) => {
        if (!analysis.id) {
          migratedLegacyIds = true;
        }

        return normalizeAnalysis(
          analysis,
          analysis.id ?? createStableLegacyAnalysisId(analysis, index),
        );
      });

    const sortedHistory = sortHistory(history);

    if (migratedLegacyIds) {
      saveHistory(sortedHistory);
    }

    return sortedHistory;
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
    const parsedAnalysis = JSON.parse(savedAnalysis) as LatestAnalysis;

    if (!Array.isArray(parsedAnalysis.businesses)) {
      window.localStorage.removeItem(LATEST_ANALYSIS_STORAGE_KEY);
      return null;
    }

    return normalizeAnalysis(parsedAnalysis);
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

export function clearLatestAnalysis(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(LATEST_ANALYSIS_STORAGE_KEY);
}

export function saveAnalysisToHistory(
  analysis: LatestAnalysis,
): AnalysisHistoryItem {
  const normalizedAnalysis = setLatestAnalysis(analysis);

  if (typeof window === "undefined") {
    return normalizedAnalysis;
  }

  const history = getAnalysisHistory();
  const withoutDuplicate = history.filter(
    (historyItem) => historyItem.id !== normalizedAnalysis.id,
  );
  const nextHistory = [normalizedAnalysis, ...withoutDuplicate];

  saveHistory(nextHistory);

  return normalizedAnalysis;
}

export function updateAnalysisMetadata(
  id: string,
  metadata: AnalysisMetadataUpdate,
): AnalysisHistoryItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  const nextMetadata = {
    analysisName: metadata.analysisName.trim(),
    city: metadata.city.trim(),
    district: metadata.district.trim(),
    category: metadata.category.trim() || "Manuel Veri",
  };
  const nextHistory = getAnalysisHistory().map((analysis) =>
    analysis.id === id ? { ...analysis, ...nextMetadata } : analysis,
  );
  const latestAnalysis = getLatestAnalysis();

  if (latestAnalysis?.id === id) {
    setLatestAnalysis({ ...latestAnalysis, ...nextMetadata });
  }

  saveHistory(nextHistory);

  return getAnalysisHistory();
}

export function removeAnalysisFromHistory(id: string): AnalysisHistoryItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  const nextHistory = getAnalysisHistory().filter(
    (analysis) => analysis.id !== id,
  );
  const latestAnalysis = getLatestAnalysis();

  if (latestAnalysis?.id === id) {
    clearLatestAnalysis();
  }

  saveHistory(nextHistory);

  return nextHistory;
}

export function removeAnalysesFromHistory(
  ids: string[],
): AnalysisHistoryItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  const idSet = new Set(ids);
  const nextHistory = getAnalysisHistory().filter(
    (analysis) => !idSet.has(analysis.id),
  );
  const latestAnalysis = getLatestAnalysis();

  if (latestAnalysis?.id && idSet.has(latestAnalysis.id)) {
    clearLatestAnalysis();
  }

  saveHistory(nextHistory);

  return nextHistory;
}

export function renameAnalysisInHistory(
  id: string,
  analysisName: string,
): AnalysisHistoryItem[] {
  const analysis = getAnalysisHistory().find((historyItem) => historyItem.id === id);

  return updateAnalysisMetadata(id, {
    analysisName,
    city: analysis?.city ?? "",
    district: analysis?.district ?? "",
    category: analysis?.category ?? "Manuel Veri",
  });
}

export function clearAnalysisHistory(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ANALYSIS_HISTORY_STORAGE_KEY);
  clearLatestAnalysis();
}
