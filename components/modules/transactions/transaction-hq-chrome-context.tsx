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

/** Setter only — stable reference (does not change when `detailActions` node updates). */
const TransactionHqChromeSetDetailActionsContext = createContext<
  TransactionHqChromeContextValue["setDetailActions"] | null
>(null);

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
    <TransactionHqChromeSetDetailActionsContext.Provider value={setDetailActions}>
      <TransactionHqChromeContext.Provider value={value}>{children}</TransactionHqChromeContext.Provider>
    </TransactionHqChromeSetDetailActionsContext.Provider>
  );
}

export function useTransactionHqChromeOptional(): TransactionHqChromeContextValue | null {
  return useContext(TransactionHqChromeContext);
}

/**
 * Prefer this for effects that register header actions: the context value is the setter
 * function itself (stable), unlike optional-chaining off the composite chrome object.
 */
export function useTransactionHqChromeSetDetailActionsOptional(): TransactionHqChromeContextValue["setDetailActions"] | null {
  return useContext(TransactionHqChromeSetDetailActionsContext);
}
