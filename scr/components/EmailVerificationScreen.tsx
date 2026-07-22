import React, { useState } from "react";
import { sendEmailVerification, signOut } from "firebase/auth";
import { auth } from "../firebase";
import { motion, AnimatePresence } from "motion/react";
import { Mail, LogOut, AlertCircle, CheckCircle2, RefreshCw, Send } from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";

interface EmailVerificationScreenProps {
  user: any;
  onVerifiedSuccess: (updatedUser: any) => void;
  onLogout: () => void;
}

export default function EmailVerificationScreen({ user, onVerifiedSuccess, onLogout }: EmailVerificationScreenProps) {
  const { lang, t } = useLanguage();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleCheckVerification = async () => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      // Reload current user status from Firebase
      await auth.currentUser?.reload();
      const updatedUser = auth.currentUser;
      
      if (updatedUser?.emailVerified) {
        onVerifiedSuccess(updatedUser);
      } else {
        setError(
          lang === "vi"
            ? "Email của bạn chưa được xác nhận. Vui lòng kiểm tra lại hộp thư (kể cả thư rác/spam)."
            : "Your email is not verified yet. Please check your inbox (including spam folder)."
        );
      }
    } catch (err: any) {
      console.error("Lỗi khi kiểm tra xác thực:", err);
      setError((lang === "vi" ? "Lỗi khi kiểm tra xác thực: " : "Error checking verification: ") + (err.message || err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setError(null);
    setSuccessMessage(null);
    setResending(true);
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setSuccessMessage(
          lang === "vi"
            ? "Đã gửi lại link xác thực mới vào email của bạn. Vui lòng kiểm tra hộp thư."
            : "A new verification link has been sent to your email. Please check your inbox."
        );
      } else {
        setError(lang === "vi" ? "Không tìm thấy thông tin tài khoản hiện tại." : "Current user account not found.");
      }
    } catch (err: any) {
      console.error("Lỗi khi gửi lại email xác thực:", err);
      if (err.code === "auth/too-many-requests") {
        setError(lang === "vi" ? "Bạn đã yêu cầu quá nhiều lần. Vui lòng đợi một lát rồi thử lại." : "Too many requests. Please wait a moment and try again.");
      } else {
        setError((lang === "vi" ? "Đã xảy ra lỗi khi gửi lại email xác thực: " : "Error resending verification email: ") + (err.message || err.code));
      }
    } finally {
      setResending(false);
    }
  };

  const handleSignOut = async () => {
    try {
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
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 shadow-sm mb-4 animate-bounce">
            <Mail className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t("verifyEmailTitle")}
          </h2>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            {lang === "vi" ? (
              <>Chúng tôi đã gửi link xác nhận đến <span className="font-semibold text-indigo-600 dark:text-indigo-400">{user?.email}</span>. Vui lòng mở email và nhấn vào link xác nhận trước khi đăng nhập.</>
            ) : (
              <>We sent a verification link to <span className="font-semibold text-indigo-600 dark:text-indigo-400">{user?.email}</span>. Please open your email and click the confirmation link before logging in.</>
            )}
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

          {successMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-2.5 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleCheckVerification}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400 dark:bg-indigo-500 dark:hover:bg-indigo-400 transition-all cursor-pointer"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <span>{lang === "vi" ? "Đã xác nhận, đăng nhập ngay" : "I've verified, log in now"}</span>
          </button>

          <button
            type="button"
            onClick={handleResendEmail}
            disabled={resending}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            {resending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span>{t("resendVerification")}</span>
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50/50 px-4 py-2.5 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-50 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40 transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            {t("logout")}
          </button>
        </div>
      </motion.div>
    </div>
  );
        }
          
