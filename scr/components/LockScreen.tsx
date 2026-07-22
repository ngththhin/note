import React, { useState } from "react";
import { 
  EmailAuthProvider, 
  reauthenticateWithCredential, 
  reauthenticateWithPopup,
  GoogleAuthProvider,
  signOut
} from "firebase/auth";
import { auth } from "../firebase";
import { motion, AnimatePresence } from "motion/react";
import { Lock, LogOut, AlertCircle, KeyRound, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";

interface LockScreenProps {
  user: any;
  onUnlock: () => void;
  onLogout: () => void;
}

export default function LockScreen({ user, onUnlock, onLogout }: LockScreenProps) {
  const { lang, t } = useLanguage();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const currentUser = auth.currentUser || user;
  const hasPassword = currentUser?.providerData?.some((p: any) => p.providerId === "password") || user?.providerData?.some((p: any) => p.providerId === "password");
  const isGoogleUser = currentUser?.providerData?.some((p: any) => p.providerId === "google.com") || user?.providerData?.some((p: any) => p.providerId === "google.com");

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!auth.currentUser) {
      setError(lang === "vi" ? "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng xuất và đăng nhập lại." : "Invalid session. Please logout and login again.");
      return;
    }

    if (!hasPassword) {
      if (isGoogleUser) {
        handleGoogleUnlock();
      } else {
        setError(lang === "vi" ? "Tài khoản chưa có mật khẩu để mở khóa." : "Account has no password set.");
      }
      return;
    }

    if (!password) {
      setError(lang === "vi" ? "Vui lòng nhập mật khẩu." : "Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      const email = auth.currentUser.email || user?.email;
      if (!email) {
        throw new Error("No email found");
      }
      const credential = EmailAuthProvider.credential(email, password);
      await reauthenticateWithCredential(auth.currentUser, credential);
      sessionStorage.setItem("isUnlocked", "true");
      onUnlock();
    } catch (err: any) {
      console.error("Lỗi mở khoá:", err);
      setError(t("invalidPassword"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleUnlock = async () => {
    setError(null);
    if (!auth.currentUser) {
      setError(lang === "vi" ? "Phiên đăng nhập không hợp lệ. Vui lòng thử đăng xuất và đăng nhập lại." : "Invalid session.");
      return;
    }
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await reauthenticateWithPopup(auth.currentUser, provider);
      sessionStorage.setItem("isUnlocked", "true");
      onUnlock();
    } catch (err: any) {
      console.error("Lỗi mở khoá Google:", err);
      if (err.code === "auth/popup-closed-by-user") {
        setError(lang === "vi" ? "Cửa sổ xác thực đã bị đóng." : "Popup closed by user.");
      } else {
        setError(lang === "vi" ? "Xác thực Google thất bại. Vui lòng thử lại." : "Google authentication failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
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
            <Lock className="h-6 w-6 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t("sessionLockedTitle")}
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {lang === "vi" ? "Chào mừng trở lại," : "Welcome back,"} <span className="font-semibold text-slate-700 dark:text-slate-300">{user?.email || "user"}</span>
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            {t("sessionLockedDesc")}
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

        <form onSubmit={handleUnlock} className="space-y-6">
          {hasPassword ? (
            <div>
              <label htmlFor="unlock-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t("enterPasswordToUnlock" as any) || t("enterPasswordPlaceholder")}
              </label>
              <div className="relative mt-1.5 rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <KeyRound className="h-4 w-4 text-slate-400" aria-hidden="true" />
                </div>
                <input
                  id="unlock-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("enterPasswordPlaceholder")}
                  className="block w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder-slate-600 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === "vi" ? "Tài khoản của bạn được liên kết với Google. Vui lòng nhấp vào nút dưới để mở khóa." : "Your account is linked with Google. Click below to unlock."}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {hasPassword && (
              <button
                type="submit"
                disabled={loading || !password}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400 dark:bg-indigo-500 dark:hover:bg-indigo-400 transition-all cursor-pointer"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <span>{t("unlockButton")}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            )}

            {isGoogleUser && (
              <button
                type="button"
                onClick={handleGoogleUnlock}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                ) : (
                  <>
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        fill="#EA4335"
                      />
                    </svg>
                    <span>{lang === "vi" ? "Mở khóa bằng Google" : "Unlock with Google"}</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              {t("logout")}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
