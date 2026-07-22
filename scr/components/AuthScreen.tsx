import React, { useState, useEffect } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  sendEmailVerification
} from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { LogIn, UserPlus, AlertCircle, FileText, CheckCircle2, ArrowLeft, Eye, EyeOff, Globe } from "lucide-react";
import { validatePasswordStrength, PASSWORD_POLICY_MESSAGE } from "../lib/passwordUtils";
import { useLanguage } from "../lib/LanguageContext";

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

const validateEmail = (emailStr: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(emailStr);
};

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const { lang, setLang, t } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Handle Google Redirect Result
  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          setLoading(true);
          const user = result.user;
          if (user.email) {
            try {
              await setDoc(doc(db, "users", user.uid), {
                email: user.email,
                updatedAt: new Date()
              }, { merge: true });
            } catch (dbErr) {
              console.error("Lỗi khi lưu thông tin Google user vào Firestore:", dbErr);
            }
          }
          sessionStorage.setItem("isUnlocked", "true");
          sessionStorage.setItem("justLoggedIn", "true");
          onAuthSuccess();
        }
      } catch (err: any) {
        console.error("Lỗi getRedirectResult:", err);
        const errMsg = err.message || "";
        if (
          err.code === "auth/popup-blocked" ||
          err.code === "auth/popup-closed-by-user" ||
          err.code === "auth/cancelled-popup-request"
        ) {
          return; // Ignore these during redirect checks
        }
        
        if (
          errMsg.includes("Brave") || 
          errMsg.includes("shield") || 
          errMsg.includes("cookie") || 
          errMsg.includes("storage") || 
          err.code === "auth/web-storage-unsupported" ||
          err.code === "auth/operation-not-supported-in-this-environment"
        ) {
          setError(lang === "vi" ? "Nếu bạn đang dùng trình duyệt Brave, vui lòng bấm vào biểu tượng Đầu Sư Tử trên thanh địa chỉ và Tắt Shields cho trang web này để đăng nhập." : "If using Brave browser, please turn off Shields to sign in.");
        } else {
          setError((lang === "vi" ? "Đăng nhập Google thất bại: " : "Google login failed: ") + (err.message || err.code));
        }
      } finally {
        setLoading(false);
      }
    };
    checkRedirect();
  }, [onAuthSuccess, lang]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(lang === "vi" ? "Vui lòng nhập địa chỉ email." : "Please enter an email address.");
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setError(lang === "vi" ? "Định dạng email không hợp lệ." : "Invalid email format.");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      setSuccessMessage(t("resetLinkSent"));
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/user-not-found") {
        setError(lang === "vi" ? "Email này chưa được đăng ký trong hệ thống!" : "Email not found in system!");
      } else if (err.code === "auth/invalid-email") {
        setError(lang === "vi" ? "Địa chỉ email không hợp lệ." : "Invalid email address.");
      } else if (err.code === "auth/unauthorized-domain") {
        setError("Domain not authorized in Firebase Auth Settings.");
      } else {
        setError((lang === "vi" ? "Lỗi: " : "Error: ") + (err.message || err.code));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const userCredential = await signInWithPopup(auth, provider);
      if (userCredential.user && userCredential.user.email) {
        try {
          await setDoc(doc(db, "users", userCredential.user.uid), {
            email: userCredential.user.email,
            updatedAt: new Date()
          }, { merge: true });
        } catch (dbErr) {
          console.error("Lỗi khi lưu thông tin Google user vào Firestore:", dbErr);
        }
      }
      sessionStorage.setItem("isUnlocked", "true");
      sessionStorage.setItem("justLoggedIn", "true");
      onAuthSuccess();
    } catch (err: any) {
      console.error("Lỗi signInWithPopup:", err);
      
      const popupErrorCodes = [
        "auth/popup-blocked",
        "auth/popup-closed-by-user",
        "auth/cancelled-popup-request",
        "auth/network-request-failed"
      ];
      
      const isPopupBlockedOrClosed = 
        popupErrorCodes.includes(err.code) || 
        err.message?.toLowerCase().includes("popup") || 
        err.message?.toLowerCase().includes("closed") || 
        err.message?.toLowerCase().includes("blocked") || 
        err.message?.toLowerCase().includes("cookie");

      if (isPopupBlockedOrClosed) {
        try {
          await signInWithRedirect(auth, provider);
        } catch (redirectErr: any) {
          console.error("Lỗi khi chuyển hướng đăng nhập:", redirectErr);
          const errMsg = redirectErr.message || "";
          if (
            errMsg.toLowerCase().includes("brave") || 
            errMsg.toLowerCase().includes("cookie") || 
            errMsg.toLowerCase().includes("storage") || 
            redirectErr.code === "auth/web-storage-unsupported" ||
            redirectErr.code === "auth/operation-not-supported-in-this-environment"
          ) {
            setError(lang === "vi" ? "Nếu bạn đang dùng trình duyệt Brave, vui lòng bấm vào biểu tượng Đầu Sư Tử trên thanh địa chỉ và Tắt Shields cho trang web này để đăng nhập." : "If using Brave browser, turn off Shields for this site.");
          } else {
            setError((lang === "vi" ? "Chuyển hướng đăng nhập thất bại: " : "Redirect login failed: ") + (redirectErr.message || redirectErr.code));
          }
          setLoading(false);
        }
      } else {
        const errMsg = err.message || "";
        if (
          errMsg.toLowerCase().includes("brave") || 
          errMsg.toLowerCase().includes("cookie") || 
          errMsg.toLowerCase().includes("storage") || 
          err.code === "auth/web-storage-unsupported" ||
          err.code === "auth/operation-not-supported-in-this-environment"
        ) {
          setError(lang === "vi" ? "Nếu bạn đang dùng trình duyệt Brave, vui lòng bấm vào biểu tượng Đầu Sư Tử trên thanh địa chỉ và Tắt Shields cho trang web này để đăng nhập." : "If using Brave browser, turn off Shields for this site.");
        } else {
          setError(lang === "vi" ? "Đăng nhập bằng Google thất bại. Vui lòng thử lại." : "Google sign in failed. Please try again.");
        }
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();

    if (!isLogin) {
      if (!trimmedEmail) {
        setError(lang === "vi" ? "Vui lòng nhập địa chỉ email." : "Please enter an email address.");
        return;
      }
      if (!validateEmail(trimmedEmail)) {
        setError(lang === "vi" ? "Định dạng email không hợp lệ, vui lòng kiểm tra lại." : "Invalid email format.");
        return;
      }
      if (!password) {
        setError(lang === "vi" ? "Vui lòng điền đầy đủ mật khẩu." : "Please enter a password.");
        return;
      }
      const pwCheck = validatePasswordStrength(password);
      if (!pwCheck.valid) {
        setError(pwCheck.message || PASSWORD_POLICY_MESSAGE);
        return;
      }
      if (password !== confirmPassword) {
        setError(t("passwordsDoNotMatch"));
        return;
      }
    } else {
      if (!trimmedEmail || !password) {
        setError(lang === "vi" ? "Vui lòng điền đầy đủ email và mật khẩu." : "Please enter email and password.");
        return;
      }
    }

    setLoading(true);
    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
        
        try {
          await setDoc(doc(db, "users", userCredential.user.uid), {
            email: trimmedEmail,
          }, { merge: true });
        } catch (dbErr) {
          console.error("Lỗi khi đồng bộ email vào Firestore:", dbErr);
        }
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        try {
          await setDoc(doc(db, "users", userCredential.user.uid), {
            email: trimmedEmail,
            createdAt: new Date()
          }, { merge: true });
        } catch (dbErr) {
          console.error("Lỗi khi lưu thông tin đăng ký vào Firestore:", dbErr);
        }
        try {
          await sendEmailVerification(userCredential.user);
        } catch (verifErr) {
          console.error("Lỗi khi gửi email xác thực:", verifErr);
        }
      }
      sessionStorage.setItem("isUnlocked", "true");
      sessionStorage.setItem("justLoggedIn", "true");
      onAuthSuccess();
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || "";
      const isInvalidCred = 
        err.code === "auth/invalid-credential" || 
        err.code === "auth/wrong-password" || 
        err.code === "auth/user-not-found" ||
        errMsg.includes("invalid-credential") ||
        errMsg.includes("wrong-password") ||
        errMsg.includes("user-not-found");

      if (isInvalidCred) {
        setError(lang === "vi" ? "Thông tin đăng nhập không chính xác." : "Incorrect login credentials.");
        setLoading(false);
        return;
      }

      switch (err.code) {
        case "auth/invalid-email":
          setError(lang === "vi" ? "Địa chỉ email không hợp lệ." : "Invalid email address.");
          break;
        case "auth/user-disabled":
          setError(lang === "vi" ? "Tài khoản này đã bị vô hiệu hóa." : "This account has been disabled.");
          break;
        case "auth/email-already-in-use":
          setError(lang === "vi" ? "Email này đã được sử dụng bởi tài khoản khác." : "Email is already in use.");
          break;
        case "auth/weak-password":
          setError(PASSWORD_POLICY_MESSAGE);
          break;
        default:
          setError(err.message || (lang === "vi" ? "Đã xảy ra lỗi. Vui lòng thử lại." : "An error occurred. Please try again."));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950 transition-colors duration-300">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-sm border border-slate-200 dark:border-slate-800 dark:bg-slate-900"
      >
        {/* Language Switcher Badge at Top-Right Corner */}
        <div className="absolute top-4 right-4 z-10">
          <button
            type="button"
            onClick={() => setLang(lang === "vi" ? "en" : "vi")}
            aria-label="Change language"
            title={lang === "vi" ? "Chuyển sang Tiếng Anh (EN)" : "Switch to Vietnamese (VI)"}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50/90 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-700/90 dark:hover:border-indigo-500 transition-all cursor-pointer shadow-2xs"
          >
            <Globe className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="font-mono text-[11px] tracking-wider">
              <span className={lang === "vi" ? "text-indigo-600 dark:text-indigo-400 font-black" : "text-slate-400 dark:text-slate-500"}>VI</span>
              <span className="mx-1 text-slate-300 dark:text-slate-600">|</span>
              <span className={lang === "en" ? "text-indigo-600 dark:text-indigo-400 font-black" : "text-slate-400 dark:text-slate-500"}>EN</span>
            </span>
          </button>
        </div>
        <AnimatePresence mode="wait">
          {showForgotPassword ? (
            <motion.div
              key="forgot-password"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 mb-4 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" /> {t("backToLogin")}
                </button>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {t("forgotPasswordTitle")}
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {t("forgotPasswordDesc")}
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

              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div>
                  <label htmlFor="reset-email" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t("emailLabel")}
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder-slate-500 transition-all text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400 dark:bg-indigo-500 dark:hover:bg-indigo-400 transition-all cursor-pointer"
                >
                  {loading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    t("sendResetLink")
                  )}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="auth-fields"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm mb-4">
                  <FileText className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {isLogin ? t("welcomeTitle") : t("createAccTitle")}
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {isLogin ? t("noAccount") : t("haveAccount")}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setError(null);
                      setEmail("");
                      setPassword("");
                      setConfirmPassword("");
                    }}
                    className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    {isLogin ? t("registerNow") : t("loginHere")}
                  </button>
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

              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t("emailLabel")}
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder-slate-500 transition-all text-sm"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t("passwordLabel")}
                    </label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowForgotPassword(true);
                          setError(null);
                          setSuccessMessage(null);
                        }}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 transition-colors cursor-pointer"
                      >
                        {t("forgotPassword")}
                      </button>
                    )}
                  </div>
                  <div className="relative mt-1.5">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isLogin ? "••••••••" : (lang === "vi" ? "Ít nhất 8 ký tự, gồm hoa, thường, số, ký tự đặc biệt..." : "At least 8 chars, uppercase, lowercase, number, symbol...")}
                      className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder-slate-500 transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {!isLogin && (
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      {lang === "vi" ? "Mật khẩu phải dài tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt." : "Password must be at least 8 characters long with uppercase, lowercase, numbers, and special symbols."}
                    </p>
                  )}
                </div>

                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <label htmlFor="confirmPassword" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t("confirmPassword")}
                    </label>
                    <div className="relative mt-1.5">
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder-slate-500 transition-all text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400 dark:bg-indigo-500 dark:hover:bg-indigo-400 transition-all cursor-pointer"
                >
                  {loading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : isLogin ? (
                    <>
                      <LogIn className="h-4 w-4" />
                      {t("loginBtn")}
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      {t("registerBtn")}
                    </>
                  )}
                </button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-wider">
                  <span className="bg-white px-3 text-slate-400 dark:bg-slate-900 dark:text-slate-500">
                    {t("orContinueWith")}
                  </span>
                </div>
              </div>

              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
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
                {t("loginWithGoogle")}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
