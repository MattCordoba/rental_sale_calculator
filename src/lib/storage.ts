import type { CurrentPropertyInputs, NewPropertyInputs } from "./calculations";

export type AppState = {
  current: CurrentPropertyInputs;
  next: NewPropertyInputs;
};

export interface AppStorage {
  load(): Promise<AppState | null>;
  save(state: AppState): Promise<void>;
}

export class NoopStorage implements AppStorage {
  async load(): Promise<AppState | null> {
    return null;
  }

  async save(state: AppState): Promise<void> {
    void state;
  }
}

export class LocalStorageStub implements AppStorage {
  private key = "rental_sale_calculator:v1";

  async load(): Promise<AppState | null> {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(this.key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AppState;
    } catch {
      return null;
    }
  }

  async save(state: AppState): Promise<void> {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(this.key, JSON.stringify(state));
  }
}
