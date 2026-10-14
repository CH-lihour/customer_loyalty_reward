import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

export const MODAL_EXIT_MS = 220;

export function modalExitDelay() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : MODAL_EXIT_MS;
}

export function useModalState<T>(closedValue: T): [T, Dispatch<SetStateAction<T>>, boolean] {
  const [value, setValue] = useState(closedValue);
  const [closing, setClosing] = useState(false);
  const valueRef = useRef(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  valueRef.current = value;

  useEffect(() => () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
  }, []);

  const update = useCallback<Dispatch<SetStateAction<T>>>((action) => {
    const next = typeof action === "function"
      ? (action as (previous: T) => T)(valueRef.current)
      : action;
    if (closing && Object.is(next, closedValue)) return;
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
    if (Object.is(next, closedValue)) {
      if (Object.is(valueRef.current, closedValue) || modalExitDelay() === 0) {
        valueRef.current = closedValue;
        setClosing(false);
        setValue(closedValue);
        return;
      }
      setClosing(true);
      timerRef.current = setTimeout(() => {
        valueRef.current = closedValue;
        setValue(closedValue);
        setClosing(false);
        timerRef.current = null;
      }, MODAL_EXIT_MS);
      return;
    }
    valueRef.current = next;
    setClosing(false);
    setValue(next);
  }, [closedValue, closing]);

  return [value, update, closing];
}
