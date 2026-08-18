import { useState } from "react";
import Dialog from "./Dialog";

export default function ConfirmDialog({ state, onClose }) {
  const {
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    danger = false,
    loadingText = "Processing...",
    onConfirm,
  } = state;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm(dialogClose) {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      if (onConfirm) await onConfirm();
      dialogClose(true);
    } catch (e) {
      setError(e?.message || "Operation failed");
      setLoading(false);
    }
  }

  return (
    <Dialog
      title={title || "Are you sure?"}
      onClose={onClose}
      closeOnBackdrop={!loading}
      closeOnEscape={!loading}
      maxWidth="max-w-sm"
    >
      {({ close: dialogClose }) => (
        <div className="p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span
              className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                danger ? "bg-red-100" : "bg-amber-100"
              }`}
            >
              <svg
                className={`w-6 h-6 ${
                  danger ? "text-red-600" : "text-amber-600"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-gray-900">
                {title || "Are you sure?"}
              </h2>
              {message && (
                <p className="mt-1.5 text-sm text-gray-500 whitespace-pre-line leading-relaxed">
                  {message}
                </p>
              )}
            </div>
          </div>

          {error && (
            <p className="mt-4 text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3">
            <button
              onClick={() => dialogClose(false)}
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold text-sm hover:bg-gray-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
            <button
              onClick={() => handleConfirm(dialogClose)}
              disabled={loading}
              className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-bold text-sm transition-all hover:scale-[1.02] active:scale-95 shadow-md disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                danger
                  ? "bg-red-600 hover:bg-red-700 shadow-red-100"
                  : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100"
              }`}
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
