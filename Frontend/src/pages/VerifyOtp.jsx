import { useState } from "react";
import { api } from "../lib/api";
import { navigate } from "../lib/router";
import { useDialog } from "../components/common/DialogContext";

export default function VerifyOtp() {

  const { alert } = useDialog();
  const [otp, setOtp] = useState("");

  const email =
    localStorage.getItem(
      "verifyEmail"
    );

  const [err, setErr] =
    useState("");

  async function verify(e) {

    e.preventDefault();

    try {

      await api(
        `/auth/verify-otp?email=${email}&otp=${otp}`,
        {
          method: "POST"
        }
      );

      await alert(
        {
          title: "Email Verified",
          message: "Email verified successfully",
          type: "success"
        }
      );

      navigate("/auth");

    } catch(err) {

      setErr(
        err.message ||
        "Invalid OTP"
      );
    }
  }

  return (

    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">

      <form
        onSubmit={verify}
        className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8"
      >

        <span className="label-pill">Almost there</span>

        <h1 className="text-xl font-extrabold text-gray-900 tracking-tight mt-3 mb-1.5">
          Verify your email
        </h1>

        <p className="text-sm text-gray-400 mb-6 break-words">
          We sent a code to <span className="font-semibold text-gray-600">{email || "your email"}</span>.
        </p>

        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
          OTP Code
        </label>
        <input
          className="input-field mb-4"
          placeholder="Enter the 6-digit code"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={otp}
          onChange={(e)=>
            setOtp(e.target.value)
          }
          required
        />

        <button
          className="btn-primary w-full"
        >
          Verify Email
        </button>

        {err && (
          <p className="mt-4 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5 break-words">
            {err}
          </p>
        )}

      </form>

    </div>
  );
}