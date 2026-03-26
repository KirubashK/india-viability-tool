import { SavedAnalysis } from "@/types/calculation";

const STORAGE_KEY = "india_viability_analyses";
const MAX_SAVED = 100;

function readAll(): SavedAnalysis[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedAnalysis[]) : [];
  } catch {
    return [];
  }
}

function writeAll(analyses: SavedAnalysis[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(analyses));
  } catch {
    // Storage quota exceeded — silently fail
  }
}

/**
 * Saves a new analysis. Returns the generated ID.
 * Keeps at most MAX_SAVED entries (drops oldest).
 */
export function saveAnalysis(data: Omit<SavedAnalysis, "id" | "createdAt" | "updatedAt">): string {
  const id = `analysis_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const entry: SavedAnalysis = { ...data, id, createdAt: now, updatedAt: now };
  const all = readAll();
  const updated = [entry, ...all].slice(0, MAX_SAVED);
  writeAll(updated);
  return id;
}

/**
 * Returns all saved analyses, newest first.
 */
export function getAllAnalyses(): SavedAnalysis[] {
  return readAll().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Returns a single analysis by ID, or null if not found.
 */
export function getAnalysisById(id: string): SavedAnalysis | null {
  return readAll().find((a) => a.id === id) ?? null;
}

/**
 * Deletes an analysis by ID.
 */
export function deleteAnalysis(id: string): void {
  writeAll(readAll().filter((a) => a.id !== id));
}

/**
 * Updates the name of a saved analysis.
 */
export function renameAnalysis(id: string, name: string): void {
  writeAll(
    readAll().map((a) =>
      a.id === id ? { ...a, name, updatedAt: new Date().toISOString() } : a
    )
  );
}
