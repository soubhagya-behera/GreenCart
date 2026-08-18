import { useEffect, useRef, useState } from "react";

export default function Dialog({
  title,
  children,
  onClose,
  closeOnBackdrop = true,
  closeOnEscape = true,
  maxWidth = "max-w-md",
}) {
  const [closing, setClosing] = useState(false);
  const panelRef = useRef(null);
  const previousFocus = useRef(null);

  function close(result) {
    if (closing) return;
    setClosing(true);
    setTimeout(() => onClose && onClose(result), 180);
  }

  useEffect(() => {
    previousFocus.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = panelRef.current;
    if (panel) panel.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = prevOverflow;
      if (
        previousFocus.current &&
        typeof previousFocus.current.focus === "function"
      ) {
        previousFocus.current.focus();
      }
    };
  }, []);

  useEffect(() => {
    if (!closeOnEscape) return;
    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  function trapFocus(e) {
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = panel.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-center sm:items-center sm:p-6">
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm ${
          closing ? "dialog-backdrop-out" : "dialog-backdrop-in"
        }`}
        aria-hidden="true"
        onClick={() => {
          if (closeOnBackdrop) close();
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onKeyDown={trapFocus}
        className={`relative w-full ${maxWidth} max-h-[calc(100dvh)] overflow-y-auto bg-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl outline-none sm:max-h-[calc(100dvh-2.5rem)] ${
          closing ? "dialog-card-out" : "dialog-card-in"
        }`}
      >
        {typeof children === "function" ? children({ close }) : children}
      </div>
    </div>
  );
}
