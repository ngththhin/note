import React, { useState } from "react";
import * as OTPAuth from "otpauth";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { motion, AnimatePresence } from "motion/react";
import { ShieldCheck, AlertCircle, LogOut } from "lucide-react";
import OtpInput from "./OtpInput";
import { useLanguage } from "../lib/LanguageContext";

interface TwoFactorLoginScreenProps {
  user: any;
  secret: string;
  onVerifySuccess: () => void;
  onLogout: () => void;
}

export default function TwoFactorLoginScreen({
  user,
  secret,
  onVerifySuccess,
  onLogout,
}: TwoFactorLoginScreenProps) {
  const { lang, t } = useLanguage();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const processVerify = (inputCode: string) => {
    setError(null);

    const cleanCode = inputCode.trim().replace(/\s+/g, "");
    if (cleanCode.length !== 6 || !/^\d+$/.test(cleanCode)) {
      setError(lang === "vi" ? "Mã xác thực phải gồm 6 chữ số." : "Verification code must be 6 digits.");
      return;
    }

    setLoading(true);

    try {
      const totp = new OTPAuth.TOTP({
        issuer: "NoteFlow",
        label: user.email || user.uid,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
      });

      const delta = totp.validate({
        token: cleanCode,
        window: 1, // cho phép lệch clock 1 chu kỳ (30 giây)
      });

      if (delta !== null) {
        onVerifySuccess();
      } else {
        setError(t("invalidOtpCode"));
        setCode("");
      }
    } catch (err: any) {
      console.error(err);
      setError(t("invalidOtpCode"));
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    processVerify(code);
  };

  const handleAutoSubmit = (completedCode: string) => {
    if (loading) return;
    processVerify(completedCode);
  };

  const handleCancel = async () => {
    try {
      const uid = auth.currentUser?.uid || user?.uid;
      if (uid) {
        localStorage.removeItem(`2fa_verified_${uid}`);
        sessionStorage.removeItem(`is_2fa_verified_${uid}`);
      }
      await signOut(auth);
      onLogout();
    } catch (err) {
      console.error("Lỗi khi đăng xuất:", err);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950 transition-colors duration-300">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-sm border border-slate-200 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 shadow-sm mb-4">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t("twoFactorTitle")}
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {t("twoFactorDesc")}
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Email: {user?.email}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-2.5 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-100 dark:border-red-900/30"
            >
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <OtpInput
              value={code}
              onChange={setCode}
              onComplete={handleAutoSubmit}
              disabled={loading}
              autoFocus={true}
            />
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={loading || code.trim().length !== 6}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400 dark:bg-indigo-500 dark:hover:bg-indigo-400 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>{lang === "vi" ? "Đang xác nhận..." : "Verifying..."}</span>
                </>
              ) : (
                t("confirmBtn")
              )}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              {t("backToLogin")}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
