// Placeholder context for v0 integration
import React, { createContext, useContext, ReactNode } from "react";

type V0ContextType = { isV0: boolean };
const V0Context = createContext<V0ContextType>({ isV0: false });

export const V0Provider = ({ isV0, children }: { isV0: boolean; children: ReactNode }) => {
  return (
    <V0Context.Provider value={{ isV0 }}>
      {children}
    </V0Context.Provider>
  );
};

export const useIsV0 = () => {
  const ctx = useContext(V0Context);
  return ctx.isV0;
};
