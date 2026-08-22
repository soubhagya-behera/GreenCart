import { useState } from "react";
import { api } from "../lib/api";
import { navigate } from "../lib/router";

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [verified, setVerified] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState("");

  async function reqOtp(e) {
    e.preventDefault();
    if (loading) return;
    setErr(""); setMsg("");
    setLoading("otp");
    try {
      await api(`/auth/request-reset-otp?email=${encodeURIComponent(email)}`, { method: "POST" });
      setMsg("OTP sent to your email");
      setVerified(false);
      setStep(2);
    } catch (e) { setErr(e.message); }
    finally { setLoading(""); }
  }
  async function verify(e) {
    e.preventDefault();
    if (loading) return;
    setErr(""); setMsg("");
    setLoading("verify");
    try {
      await api(`/auth/verify-reset-otp?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`, { method: "POST" });
      setVerified(true);
      setMsg("OTP verified");
    } catch (e) { setErr(e.message); }
    finally { setLoading(""); }
  }
  async function reset(e) {
    e.preventDefault();
    if (loading) return;
    setErr(""); setMsg("");
    try {
      if (!verified) { setErr("Please verify OTP first"); return; }
      setLoading("reset");
      await api("/auth/reset-password", { method: "POST", body: { email, otp, newPassword: password } });
      setMsg("Password reset successful. Please login.");
      navigate("/auth");
    } catch (e) { setErr(e.message); }
    finally { setLoading(""); }
  }

  return (
    <section className="bg-gray-50 min-h-screen py-10 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white border border-gray-100 rounded-2xl p-6 md:p-8 shadow-sm">
          <span className="label-pill">Account Recovery</span>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight mt-3 mb-5">
            {step === 1 ? "Forgot Password" : "Reset Password"}
          </h1>
          {step === 1 ? (
            <form onSubmit={reqOtp} className="space-y-3.5">
              <div>
                <label htmlFor="reset-email" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Email Address</label>
                <input id="reset-email" className="input-field" type="email" placeholder="you@example.com" value={email} onChange={(e)=>setEmail(e.target.value)} required />
              </div>
              <button className="btn-primary w-full !py-3" disabled={loading !== ""}>{loading === "otp" ? "Sending OTP…" : "Send OTP"}</button>
            </form>
          ) : (
            <>
              <form onSubmit={verify} className="space-y-3.5">
                <div>
                  <label htmlFor="reset-otp" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">OTP Code</label>
                  <input id="reset-otp" className="input-field" type="text" inputMode="numeric" placeholder="Code from your email" value={otp} onChange={(e)=>setOtp(e.target.value)} required />
                </div>
                <button className="btn-primary w-full !py-3" disabled={loading !== "" || verified}>{loading === "verify" ? "Verifying…" : verified ? "Verified ✓" : "Verify OTP"}</button>
              </form>
              <form onSubmit={reset} className="space-y-3.5 mt-5 pt-5 border-t border-gray-100">
                <div className="relative">
                  <label htmlFor="new-password" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">New Password</label>
                  <input id="new-password" className="input-field !pr-11" type={showPass?"text":"password"} placeholder="New password" value={password} onChange={(e)=>setPassword(e.target.value)} required autoComplete="new-password" />
                  <button type="button" onClick={()=>setShowPass((v)=>!v)} aria-label={showPass ? "Hide password" : "Show password"} className="absolute right-3 bottom-2.5 text-gray-400 hover:text-emerald-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.25 12c0 0 3.75-7.5 9.75-7.5s9.75 7.5 9.75 7.5-3.75 7.5-9.75 7.5S2.25 12 2.25 12z" />
                      <circle cx="12" cy="12" r="3" strokeWidth="1.5" />
                    </svg>
                  </button>
                </div>
                <button className="btn-primary w-full !py-3" disabled={!verified || loading !== ""}>{loading === "reset" ? "Saving…" : "Reset Password"}</button>
              </form>
            </>
          )}
          {msg && <div className="mt-4 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2.5 break-words">{msg}</div>}
          {err && <div className="mt-4 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5 break-words">{err}</div>}

          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <button
              onClick={() => navigate("/auth")}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
            >
              ← Back to login
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
