"use client";

import { createContext, useContext, ReactNode } from "react";

interface V0ContextType {
  isV0: boolean;
}

const V0Context = createContext<V0ContextType>({ isV0: false });

interface V0ProviderProps {
  isV0: boolean;
  children: ReactNode;
}

export function V0Provider({ isV0, children }: V0ProviderProps) {
  return (
    <V0Context.Provider value={{ isV0 }}>
      {children}
    </V0Context.Provider>
  );
}

export function useIsV0() {
  const context = useContext(V0Context);
  return context.isV0;
}
