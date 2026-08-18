import { useEffect, useRef, useState } from "react";
import Dialog from "./Dialog";

export default function InputDialog({ state, onClose }) {
  const {
    title,
    label,
    initialValue = "",
    confirmText = "OK",
    cancelText = "Cancel",
    loadingText = "Please wait...",
    validate,
    onConfirm,
  } = state;
  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  async function handleConfirm(dialogClose) {
    if (loading) return;
    const validationMessage = validate ? validate(value) : null;
    if (validationMessage) {
      setError(validationMessage);
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (onConfirm) await onConfirm(value);
      dialogClose(value);
    } catch (e) {
      setError(e?.message || "Operation failed");
      setLoading(false);
    }
  }

  return (
    <Dialog
      title={title || "Enter Value"}
      onClose={onClose}
      closeOnBackdrop={!loading}
      closeOnEscape={!loading}
      maxWidth="max-w-sm"
    >
      {({ close: dialogClose }) => (
        <div className="p-6 sm:p-8">
          <h2 className="text-lg font-black text-gray-900">
            {title || "Enter Value"}
          </h2>

          {label && (
            <label
              htmlFor="gc-dialog-input"
              className="block mt-4 text-sm font-semibold text-gray-700"
            >
              {label}
            </label>
          )}

          <input
            id="gc-dialog-input"
            ref={inputRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleConfirm(dialogClose);
              }
            }}
            disabled={loading}
            placeholder={label || "Enter value"}
            className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed"
          />

          {error && (
            <p className="mt-3 text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3">
            <button
              onClick={() => dialogClose(null)}
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold text-sm hover:bg-gray-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
            <button
              onClick={() => handleConfirm(dialogClose)}
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-bold text-sm transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-emerald-100 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {loadingText}
                </>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}