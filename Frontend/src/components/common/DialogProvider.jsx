import { useCallback, useRef, useState } from "react";
import { DialogContext } from "./DialogContext";
import Dialog from "./Dialog";
import ConfirmDialog from "./ConfirmDialog";
import InputDialog from "./InputDialog";

function AlertDialog({ state, onClose }) {
  const { title, message, type = "info" } = state;
  const isError = type === "error";
  const isSuccess = type === "success";
  const isWarning = type === "warning";

  return (
    <Dialog title={title || "Notice"} onClose={onClose} maxWidth="max-w-sm">
      {({ close: dialogClose }) => (
        <div className="p-6 sm:p-8 flex flex-col items-center text-center gap-4">
        <span
          className={`w-14 h-14 rounded-full flex items-center justify-center ${
            isError
              ? "bg-red-100"
              : isSuccess
                ? "bg-emerald-100"
                : isWarning
                  ? "bg-amber-100"
                  : "bg-blue-100"
          }`}
        >
          <svg
            className={`w-7 h-7 ${
              isError
                ? "text-red-600"
                : isSuccess
                  ? "text-emerald-600"
                  : isWarning
                    ? "text-amber-600"
                    : "text-blue-600"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            {isError ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : isSuccess ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            ) : isWarning ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            )}
          </svg>
        </span>
        <div>
          <h2 className="text-lg font-black text-gray-900">{title || "Notice"}</h2>
          <p className="mt-2 text-sm text-gray-500 whitespace-pre-line leading-relaxed">
            {message}
          </p>
        </div>
        <button
          onClick={() => dialogClose()}
          className={`w-full px-4 py-3 rounded-xl text-white font-bold text-sm transition-all hover:scale-[1.02] active:scale-95 shadow-md ${
            isError
              ? "bg-red-600 hover:bg-red-700 shadow-red-100"
              : isSuccess
                ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100"
                : isWarning
                  ? "bg-amber-500 hover:bg-amber-600 shadow-amber-100"
                  : "bg-blue-600 hover:bg-blue-700 shadow-blue-100"
          }`}
        >
          OK
        </button>
        </div>
      )}
    </Dialog>
  );
}

export default function DialogProvider({ children }) {
  const [alertState, setAlertState] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [inputState, setInputState] = useState(null);
  const confirmResolve = useRef(null);
  const inputResolve = useRef(null);

  const alert = useCallback(
    (opts = {}) =>
      new Promise((resolve) => {
        setAlertState({
          ...opts,
          onOk: () => {
            setAlertState(null);
            resolve();
          },
        });
      }),
    []
  );

  const confirm = useCallback(
    (opts = {}) =>
      new Promise((resolve) => {
        confirmResolve.current = resolve;
        setConfirmState(opts);
      }),
    []
  );

  const prompt = useCallback(
    (opts = {}) =>
      new Promise((resolve) => {
        inputResolve.current = resolve;
        setInputState(opts);
      }),
    []
  );

  function closeConfirm(result) {
    setConfirmState(null);
    if (confirmResolve.current) {
      confirmResolve.current(result === true);
      confirmResolve.current = null;
    }
  }

  function closeInput(result) {
    setInputState(null);
    if (inputResolve.current) {
      inputResolve.current(result ?? null);
      inputResolve.current = null;
    }
  }

  return (
    <DialogContext.Provider value={{ alert, confirm, prompt }}>
      {children}
      {alertState && <AlertDialog state={alertState} onClose={alertState.onOk} />}
      {confirmState && <ConfirmDialog state={confirmState} onClose={closeConfirm} />}
      {inputState && <InputDialog state={inputState} onClose={closeInput} />}
    </DialogContext.Provider>
  );
}