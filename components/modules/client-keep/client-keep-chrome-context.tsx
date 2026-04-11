"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ClientKeepChromeContextValue = {
  /** `/contacts/[id]` only: client-level Actions menu injected into the module header. */
  contactDetailActions: ReactNode | null;
  setContactDetailActions: (node: ReactNode | null) => void;
};

const ClientKeepChromeContext = createContext<ClientKeepChromeContextValue | null>(null);

export function ClientKeepChromeProvider({ children }: { children: ReactNode }) {
  const [contactDetailActions, setContactDetailActionsState] = useState<ReactNode | null>(null);
  const setContactDetailActions = useCallback((node: ReactNode | null) => {
    setContactDetailActionsState(node);
  }, []);
  const value = useMemo(
    () => ({ contactDetailActions, setContactDetailActions }),
    [contactDetailActions, setContactDetailActions]
  );
  return (
    <ClientKeepChromeContext.Provider value={value}>{children}</ClientKeepChromeContext.Provider>
  );
}

export function useClientKeepChrome(): ClientKeepChromeContextValue {
  const ctx = useContext(ClientKeepChromeContext);
  if (!ctx) {
    throw new Error("useClientKeepChrome must be used within ClientKeepChromeProvider");
  }
  return ctx;
}
