import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type EntityType = "aircraft" | "vessel" | "conflict" | "satellite" | "earthquake" | "gpsjam";

export interface SelectedEntity {
  type: EntityType;
  id: string;
  lat: number;
  lon: number;
  data: Record<string, unknown>;
  selectedAt: Date;
}

interface SelectionContextState {
  selectedEntity: SelectedEntity | null;
  setSelectedEntity: (entity: SelectedEntity | null) => void;
  clearSelection: () => void;
}

const SelectionContext = createContext<SelectionContextState | null>(null);

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null);

  const clearSelection = () => setSelectedEntity(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") clearSelection();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <SelectionContext.Provider value={{ selectedEntity, setSelectedEntity, clearSelection }}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection(): SelectionContextState {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("useSelection must be used within a SelectionProvider");
  return ctx;
}
