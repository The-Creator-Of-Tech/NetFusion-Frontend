"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { NetfusionContext } from "./CopilotSidebar";

interface NetfusionContextValue {
  netfusionContext: NetfusionContext | null;
  setNetfusionContext: (ctx: NetfusionContext | null) => void;
}

const NetfusionCtx = createContext<NetfusionContextValue>({
  netfusionContext:    null,
  setNetfusionContext: () => {},
});

export function NetfusionContextProvider({ children }: { children: React.ReactNode }) {
  const [netfusionContext, setNetfusionContextState] = useState<NetfusionContext | null>(null);

  const setNetfusionContext = useCallback((ctx: NetfusionContext | null) => {
    setNetfusionContextState(ctx);
  }, []);

  return (
    <NetfusionCtx.Provider value={{ netfusionContext, setNetfusionContext }}>
      {children}
    </NetfusionCtx.Provider>
  );
}

export function useNetfusionContext() {
  return useContext(NetfusionCtx);
}
