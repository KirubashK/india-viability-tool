import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ProductMaster } from "@/types/product";
import { LandedCostResult, UnitEconomicsResult, VerdictResult } from "@/types/calculation";

export interface SavedScenario {
  id: string;
  name: string;
  createdAt: string;
  product: ProductMaster;
  landedCost: LandedCostResult;
  unitEconomics: UnitEconomicsResult;
  verdict: VerdictResult;
}

interface ScenarioState {
  scenarios: SavedScenario[];
  compareIds: string[]; // max 3
}

interface ScenarioActions {
  saveScenario: (
    name: string,
    product: ProductMaster,
    landedCost: LandedCostResult,
    unitEconomics: UnitEconomicsResult,
    verdict: VerdictResult
  ) => void;
  deleteScenario: (id: string) => void;
  toggleCompare: (id: string) => void;
  clearCompare: () => void;
  renameScenario: (id: string, name: string) => void;
}

export const useScenarioStore = create<ScenarioState & ScenarioActions>()(
  persist(
    (set, get) => ({
      scenarios: [],
      compareIds: [],

      saveScenario: (name, product, landedCost, unitEconomics, verdict) => {
        const scenario: SavedScenario = {
          id: `scenario_${Date.now()}`,
          name,
          createdAt: new Date().toISOString(),
          product,
          landedCost,
          unitEconomics,
          verdict,
        };
        set((state) => ({ scenarios: [scenario, ...state.scenarios] }));
      },

      deleteScenario: (id) =>
        set((state) => ({
          scenarios: state.scenarios.filter((s) => s.id !== id),
          compareIds: state.compareIds.filter((cid) => cid !== id),
        })),

      toggleCompare: (id) => {
        const { compareIds } = get();
        if (compareIds.includes(id)) {
          set({ compareIds: compareIds.filter((cid) => cid !== id) });
        } else if (compareIds.length < 3) {
          set({ compareIds: [...compareIds, id] });
        }
      },

      clearCompare: () => set({ compareIds: [] }),

      renameScenario: (id, name) =>
        set((state) => ({
          scenarios: state.scenarios.map((s) =>
            s.id === id ? { ...s, name } : s
          ),
        })),
    }),
    {
      name: "india-viability-scenarios",
      version: 1,
    }
  )
);
