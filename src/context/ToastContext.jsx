import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

const ToastContext = createContext(null);

const DEFAULT_DURATION_MS = (() => {
  const raw = Number(import.meta?.env?.VITE_TOAST_DURATION_MS);
  if (!Number.isFinite(raw)) return 3000;
  return Math.max(500, Math.min(20000, Math.floor(raw)));
})();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const pushToast = useCallback((toast) => {
    const id = toast?.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const message = String(toast?.message || "").trim();
    if (!message) return "";

    const variant = toast?.variant === "success" || toast?.variant === "error" || toast?.variant === "info"
      ? toast.variant
      : "info";
    const durationMsRaw = toast?.durationMs ?? DEFAULT_DURATION_MS;
    const durationMs = Number.isFinite(Number(durationMsRaw))
      ? Math.max(0, Math.min(60000, Math.floor(Number(durationMsRaw))))
      : DEFAULT_DURATION_MS;

    setToasts((prev) => [{ id, message, variant }, ...prev].slice(0, 5));

    if (durationMs > 0) {
      const timer = setTimeout(() => removeToast(id), durationMs);
      timersRef.current.set(id, timer);
    }

    return id;
  }, [removeToast]);

  const value = useMemo(() => ({ pushToast, removeToast }), [pushToast, removeToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-[90vw] sm:max-w-sm">
        {toasts.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => removeToast(t.id)}
            className={[
              "w-full text-left rounded-md border px-3 py-2 shadow-sm",
              "bg-white dark:bg-github-dark-bg-secondary",
              "text-sm",
              t.variant === "success" ? "border-green-200 text-green-800 dark:border-green-900/40 dark:text-green-300" : "",
              t.variant === "error" ? "border-red-200 text-red-800 dark:border-red-900/40 dark:text-red-300" : "",
              t.variant === "info" ? "border-github-light-border text-github-light-text dark:border-github-dark-border dark:text-github-dark-text" : ""
            ].filter(Boolean).join(" ")}
          >
            {t.message}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
};

