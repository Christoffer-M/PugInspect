import { useLocalStorage } from "@mantine/hooks";

const STORAGE_KEY = "searchHistory";
const MAX_ENTRIES = 20;

export type HistoryEntry = {
  name: string;
  realm: string;
  region: string;
  class?: string;
  timestamp: number;
};

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

/** Persisted search history; hooks sharing the key stay in sync across components and tabs. */
export function useSearchHistory() {
  const [history, setHistory] = useLocalStorage<HistoryEntry[]>({
    key: STORAGE_KEY,
    defaultValue: [],
    getInitialValueInEffect: false,
  });

  const add = (entry: Omit<HistoryEntry, "timestamp">) =>
    setHistory((prev) =>
      [{ ...entry, timestamp: Date.now() }, ...prev.filter((e) => !isSameCharacter(e, entry))].slice(
        0,
        MAX_ENTRIES,
      ),
    );

  const remove = (entry: Pick<HistoryEntry, "name" | "realm" | "region">) =>
    setHistory((prev) => prev.filter((e) => !isSameCharacter(e, entry)));

  const clear = () => setHistory([]);

  return { history, add, remove, clear };
}
