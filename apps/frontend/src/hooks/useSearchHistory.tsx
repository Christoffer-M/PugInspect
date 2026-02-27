import { createContext, useContext, useState } from "react";

const STORAGE_KEY = "searchHistory";
const MAX_ENTRIES = 20;

export type HistoryEntry = {
  name: string;
  realm: string;
  region: string;
  class?: string;
  timestamp: number;
};

type SearchHistoryContextValue = {
  history: HistoryEntry[];
  add: (entry: Omit<HistoryEntry, "timestamp">) => void;
  remove: (entry: Pick<HistoryEntry, "name" | "realm" | "region">) => void;
  clear: () => void;
};

export const SearchHistoryContext = createContext<SearchHistoryContextValue | null>(null);

function readFromStorage(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeToStorage(entries: HistoryEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function isSameCharacter(
  a: Pick<HistoryEntry, "name" | "realm" | "region">,
  b: Pick<HistoryEntry, "name" | "realm" | "region">,
) {
  return (
    a.name.toLowerCase() === b.name.toLowerCase() &&
    a.realm.toLowerCase() === b.realm.toLowerCase() &&
    a.region.toLowerCase() === b.region.toLowerCase()
  );
}

export function SearchHistoryProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [history, setHistory] = useState<HistoryEntry[]>(readFromStorage);

  const add = (entry: Omit<HistoryEntry, "timestamp">) => {
    setHistory((prev) => {
      const filtered = prev.filter((e) => !isSameCharacter(e, entry));
      const next = [{ ...entry, timestamp: Date.now() }, ...filtered].slice(0, MAX_ENTRIES);
      writeToStorage(next);
      return next;
    });
  };

  const remove = (entry: Pick<HistoryEntry, "name" | "realm" | "region">) => {
    setHistory((prev) => {
      const next = prev.filter((e) => !isSameCharacter(e, entry));
      writeToStorage(next);
      return next;
    });
  };

  const clear = () => {
    writeToStorage([]);
    setHistory([]);
  };

  return (
    <SearchHistoryContext.Provider value={{ history, add, remove, clear }}>
      {children}
    </SearchHistoryContext.Provider>
  );
}

export function useSearchHistory(): SearchHistoryContextValue {
  const ctx = useContext(SearchHistoryContext);
  if (!ctx) throw new Error("useSearchHistory must be used within SearchHistoryProvider");
  return ctx;
}
