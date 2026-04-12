"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type TransactionHqChromeContextValue = {
  /** `/transactions/[id]` only: deal-level Actions injected into the module header. */
  detailActions: ReactNode | null;
  setDetailActions: (node: ReactNode | null) => void;
};

const TransactionHqChromeContext = createContext<TransactionHqChromeContextValue | null>(null);

export function TransactionHqChromeProvider({ children }: { children: ReactNode }) {
  const [detailActions, setDetailActionsState] = useState<ReactNode | null>(null);
  const setDetailActions = useCallback((node: ReactNode | null) => {
    setDetailActionsState(node);
  }, []);
  const value = useMemo(
    () => ({ detailActions, setDetailActions }),
    [detailActions, setDetailActions]
  );
  return (
    <TransactionHqChromeContext.Provider value={value}>{children}</TransactionHqChromeContext.Provider>
  );
}

export function useTransactionHqChromeOptional(): TransactionHqChromeContextValue | null {
  return useContext(TransactionHqChromeContext);
}
