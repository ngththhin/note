import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { 
  EmailAuthProvider, 
  reauthenticateWithCredential, 
  updatePassword,
  linkWithCredential
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import * as OTPAuth from "otpauth";
import { auth, db } from "../firebase";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Lock, 
  ShieldCheck, 
  ShieldAlert, 
  KeyRound, 
  Copy, 
  Check, 
  AlertCircle, 
  CheckCircle2,
  QrCode,
  Eye,
  EyeOff
} from "lucide-react";
import OtpInput from "./OtpInput";
import GooglePasswordSetupModal from "./GooglePasswordSetupModal";
import { validatePasswordStrength, PASSWORD_POLICY_MESSAGE } from "../lib/passwordUtils";
import { useLanguage } from "../lib/LanguageContext";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  twoFactorEnabled: boolean;
  enableSessionLock: boolean;
  onToggleSessionLock: (enabled: boolean) => Promise<void>;
}

export default function SettingsModal({
  isOpen,
  onClose,
  user,
  twoFactorEnabled,
  enableSessionLock,
  onToggleSessionLock,
}: SettingsModalProps) {
  const { lang, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"password" | "2fa">("password");
  const isGoogleUser = user?.providerData?.some((p: any) => p.providerId === "google.com");
  const hasPasswordProvider = user?.providerData?.some((p: any) => p.providerId === "password") || auth.currentUser?.providerData?.some((p: any) => p.providerId === "password");

  const [customHasPassword, setCustomHasPassword] = useState(false);
  const effectiveHasPassword = hasPasswordProvider || customHasPassword;

  const [isGooglePwSetupModalOpen, setIsGooglePwSetupModalOpen] = useState(false);

  // State for Session Lock
  const [sessionLockLoading, setSessionLockLoading] = useState(false);
  const [showCreatePasswordPrompt, setShowCreatePasswordPrompt] = useState(false);
  const [sessionLockNewPassword, setSessionLockNewPassword] = useState("");
  const [sessionLockConfirmPassword, setSessionLockConfirmPassword] = useState("");
  const [sessionLockPasswordError, setSessionLockPasswordError] = useState<string | null>(null);
  const [sessionLockPasswordSuccess, setSessionLockPasswordSuccess] = useState<string | null>(null);
  const [sessionLockPasswordLoading, setSessionLockPasswordLoading] = useState(false);

  const handleSessionLockToggle = async () => {
    setSessionLockPasswordError(null);
    setSessionLockPasswordSuccess(null);

    // If user wants to turn ON Session Lock, check if account has a password
    if (!enableSessionLock) {
      if (!effectiveHasPassword) {
        // Block toggle and show prompt to create password
        setShowCreatePasswordPrompt(true);
        return;
      }
    }

    // Turning OFF or user already has password
    setSessionLockLoading(true);
    try {
      await onToggleSessionLock(!enableSessionLock);
      setShowCreatePasswordPrompt(false);
    } catch (err) {
      console.error("Lỗi khi đổi trạng thái Khóa phiên:", err);
    } finally {
      setSessionLockLoading(false);
    }
  };

  const [showSessionLockNewPw, setShowSessionLockNewPw] = useState(false);
  const [showSessionLockConfirmPw, setShowSessionLockConfirmPw] = useState(false);

  const handleCreatePasswordAndEnableSessionLock = async (e: React.FormEvent) => {
    e.preventDefault();
    setSessionLockPasswordError(null);
    setSessionLockPasswordSuccess(null);

    if (!auth.currentUser) {
      setSessionLockPasswordError("Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.");
      return;
    }

    if (!sessionLockNewPassword || !sessionLockConfirmPassword) {
      setSessionLockPasswordError("Vui lòng điền đầy đủ mật khẩu và xác nhận.");
      return;
    }

    const pwValidation = validatePasswordStrength(sessionLockNewPassword);
    if (!pwValidation.valid) {
      setSessionLockPasswordError(pwValidation.message || PASSWORD_POLICY_MESSAGE);
      return;
    }

    if (sessionLockNewPassword !== sessionLockConfirmPassword) {
      setSessionLockPasswordError("Mật khẩu mới và xác nhận mật khẩu không khớp.");
      return;
    }

    setSessionLockPasswordLoading(true);
    try {
      // 1. Attach/update password in Firebase Auth
      const email = auth.currentUser.email || user?.email;
      try {
        await updatePassword(auth.currentUser, sessionLockNewPassword);
      } catch (uErr: any) {
        if (email) {
          const cred = EmailAuthProvider.credential(email, sessionLockNewPassword);
          await linkWithCredential(auth.currentUser, cred);
        } else {
          throw uErr;
        }
      }

      // 2. Turn ON Session Lock in Firestore settings
      await onToggleSessionLock(true);
      setSessionLockPasswordSuccess("Thiết lập mật khẩu thành công và đã Bật Khóa phiên!");
      setShowCreatePasswordPrompt(false);
      setSessionLockNewPassword("");
      setSessionLockConfirmPassword("");
    } catch (err: any) {
      console.error("Lỗi thiết lập mật khẩu:", err);
      setSessionLockPasswordError("Không thể tạo mật khẩu: " + (err.message || err.code));
    } finally {
      setSessionLockPasswordLoading(false);
    }
  };

  // State for Change Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // State for 2FA Enable
  const [twoFactorStep, setTwoFactorStep] = useState<1 | 2>(1); // Step 1: Verify current user, Step 2: Show QR & verify OTP
  const [accountPassword, setAccountPassword] = useState("");
  const [showAccountPassword, setShowAccountPassword] = useState(false);
  const [generatedSecret, setGeneratedSecret] = useState("");
  const [generatedUri, setGeneratedUri] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [otpVerifyCode, setOtpVerifyCode] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupSuccess, setSetupSuccess] = useState<string | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);

  // State for 2FA Disable
  const [disablePassword, setDisablePassword] = useState("");
  const [showDisablePassword, setShowDisablePassword] = useState(false);
  const [disableOtpCode, setDisableOtpCode] = useState("");
  const [disableError, setDisableError] = useState<string | null>(null);
  const [disableSuccess, setDisableSuccess] = useState<string | null>(null);
  const [disableLoading, setDisableLoading] = useState(false);

  // Generate Base32 String helper
  const generateBase32Secret = (length = 16) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let secret = "";
    for (let i = 0; i < length; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  };

  // Clear states when tab changes
  useEffect(() => {
    setPasswordError(null);
    setPasswordSuccess(null);
    setSetupError(null);
    setSetupSuccess(null);
    setDisableError(null);
    setDisableSuccess(null);
    setSessionLockPasswordError(null);
    setSessionLockPasswordSuccess(null);
    setShowCreatePasswordPrompt(false);
    setSessionLockNewPassword("");
    setSessionLockConfirmPassword("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setAccountPassword("");
    setOtpVerifyCode("");
    setDisablePassword("");
    setDisableOtpCode("");
    setTwoFactorStep(1);
    setGeneratedSecret("");
  }, [activeTab, isOpen]);

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!auth.currentUser) {
      setPasswordError("Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.");
      return;
    }

    if (isGoogleUser) return;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError("Vui lòng điền đầy đủ tất cả các trường.");
      return;
    }

    const pwValidation = validatePasswordStrength(newPassword);
    if (!pwValidation.valid) {
      setPasswordError(pwValidation.message || PASSWORD_POLICY_MESSAGE);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError("Mật khẩu mới và xác nhận mật khẩu không khớp.");
      return;
    }

    setPasswordLoading(true);
    try {
      const email = auth.currentUser.email || user?.email;
      if (!email) {
        throw new Error("Không tìm thấy email tài khoản.");
      }
      // Re-authenticate using auth.currentUser
      const credential = EmailAuthProvider.credential(email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      // Update password using auth.currentUser
      await updatePassword(auth.currentUser, newPassword);
      
      setPasswordSuccess("Cập nhật mật khẩu thành công!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || "";
      const isInvalidCred = 
        err.code === "auth/invalid-credential" || 
        err.code === "auth/wrong-password" ||
        errMsg.includes("invalid-credential") ||
        errMsg.includes("wrong-password");

      if (isInvalidCred) {
        setPasswordError("Mật khẩu hiện tại không chính xác.");
      } else {
        setPasswordError("Đã xảy ra lỗi khi đổi mật khẩu: " + (err.message || err.code));
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  // Initiate 2FA Enable Setup (Step 1 -> Step 2)
  const handleInitiate2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError(null);
    setSetupSuccess(null);

    if (!auth.currentUser) {
      setSetupError("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.");
      return;
    }

    setSetupLoading(true);
    try {
      if (!isGoogleUser) {
        if (!accountPassword) {
          setSetupError("Vui lòng nhập mật khẩu tài khoản của bạn.");
          setSetupLoading(false);
          return;
        }
        const email = auth.currentUser.email || user?.email;
        if (!email) {
          throw new Error("Không tìm thấy email tài khoản.");
        }
        // Verify current password with auth.currentUser
        const credential = EmailAuthProvider.credential(email, accountPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
      }

      // Re-auth passed or user is google user, generate secret
      const secret = generateBase32Secret(16);
      const userLabel = auth.currentUser.email || user?.email || user?.uid;
      const totp = new OTPAuth.TOTP({
        issuer: "NoteFlow",
        label: userLabel,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
      });

      const otpauthURI = totp.toString();
      setGeneratedSecret(secret);
      setGeneratedUri(otpauthURI);

      try {
        const url = await QRCode.toDataURL(otpauthURI, { width: 220, margin: 2 });
        setQrCodeUrl(url);
      } catch (qrErr) {
        console.error("Lỗi tạo QR:", qrErr);
      }

      setTwoFactorStep(2);
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || "";
      const isInvalidCred = 
        err.code === "auth/invalid-credential" || 
        err.code === "auth/wrong-password" ||
        errMsg.includes("invalid-credential") ||
        errMsg.includes("wrong-password");

      if (isInvalidCred) {
        setSetupError("Mật khẩu tài khoản không chính xác.");
      } else {
        setSetupError("Xác minh thất bại: " + (err.message || err.code));
      }
    } finally {
      setSetupLoading(false);
    }
  };

  // Complete 2FA Enable Setup (Step 2 Verification & Save)
  const processVerifyAndEnable2FA = async (codeToVerify: string) => {
    setSetupError(null);
    setSetupSuccess(null);

    const cleanCode = codeToVerify.trim().replace(/\s+/g, "");
    if (cleanCode.length !== 6 || !/^\d+$/.test(cleanCode)) {
      setSetupError("Mã OTP phải chứa đúng 6 chữ số.");
      return;
    }

    setSetupLoading(true);
    try {
      const totp = new OTPAuth.TOTP({
        issuer: "NoteFlow",
        label: auth.currentUser?.email || user?.email || user?.uid,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(generatedSecret),
      });

      const delta = totp.validate({
        token: cleanCode,
        window: 1,
      });

      if (delta === null) {
        setSetupError("Mã OTP không chính xác hoặc đã hết hạn. Vui lòng nhập mã mới.");
        setSetupLoading(false);
        return;
      }

      // Save to Firestore
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        twoFactorEnabled: true,
        is2FAEnabled: true,
        twoFactorSecret: generatedSecret,
        updatedAt: new Date(),
      }, { merge: true });

      const verifiedData = JSON.stringify({ status: true, verifiedAt: Date.now() });
      localStorage.setItem(`2fa_verified_${user.uid}`, verifiedData);

      setSetupSuccess("Chúc mừng! Đã kích hoạt Xác thực 2 bước (2FA) thành công.");
      setTwoFactorStep(1);
      setAccountPassword("");
      setOtpVerifyCode("");
      setGeneratedSecret("");
    } catch (err: any) {
      console.error(err);
      setSetupError("Lỗi kích hoạt 2FA: " + (err.message || err.code));
    } finally {
      setSetupLoading(false);
    }
  };

  const handleVerifyAndEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (setupLoading) return;
    await processVerifyAndEnable2FA(otpVerifyCode);
  };

  // Handle Disable 2FA
  const processDisable2FA = async (codeToVerify: string) => {
    setDisableError(null);
    setDisableSuccess(null);

    if (!auth.currentUser) {
      setDisableError("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.");
      return;
    }

    const cleanCode = codeToVerify.trim().replace(/\s+/g, "");
    if (cleanCode.length !== 6 || !/^\d+$/.test(cleanCode)) {
      setDisableError("Mã OTP phải chứa đúng 6 chữ số.");
      return;
    }

    setDisableLoading(true);
    try {
      // 1. Re-authenticate if email/password user
      if (!isGoogleUser) {
        if (!disablePassword) {
          setDisableError("Vui lòng nhập mật khẩu tài khoản.");
          setDisableLoading(false);
          return;
        }
        const email = auth.currentUser.email || user?.email;
        if (!email) {
          throw new Error("Không tìm thấy email tài khoản.");
        }
        const credential = EmailAuthProvider.credential(email, disablePassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
      }

      // 2. We need to verify OTP using current secret in Firestore.
      const userRef = doc(db, "users", user.uid);
      const { getDoc } = await import("firebase/firestore");
      const userDocSnap = await getDoc(userRef);
      if (!userDocSnap.exists()) {
        setDisableError("Không tìm thấy thông tin cấu hình người dùng.");
        setDisableLoading(false);
        return;
      }
      
      const userSecret = userDocSnap.data()?.twoFactorSecret;
      if (!userSecret) {
        setDisableError("Không tìm thấy cấu hình mã bí mật 2FA.");
        setDisableLoading(false);
        return;
      }

      const totp = new OTPAuth.TOTP({
        issuer: "NoteFlow",
        label: auth.currentUser?.email || user?.email || user?.uid,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(userSecret),
      });

      const delta = totp.validate({
        token: cleanCode,
        window: 1,
      });

      if (delta === null) {
        setDisableError("Mã OTP không chính xác hoặc đã hết hạn.");
        setDisableLoading(false);
        return;
      }

      // 3. Update firestore to disable 2FA
      await setDoc(userRef, {
        twoFactorEnabled: false,
        is2FAEnabled: false,
        twoFactorSecret: "",
        updatedAt: new Date(),
      }, { merge: true });

      localStorage.removeItem(`2fa_verified_${user.uid}`);
      sessionStorage.removeItem(`is_2fa_verified_${user.uid}`);

      setDisableSuccess("Đã tắt Xác thực 2 bước thành công!");
      setDisablePassword("");
      setDisableOtpCode("");
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || "";
      const isInvalidCred = 
        err.code === "auth/invalid-credential" || 
        err.code === "auth/wrong-password" ||
        errMsg.includes("invalid-credential") ||
        errMsg.includes("wrong-password");

      if (isInvalidCred) {
        setDisableError("Mật khẩu tài khoản không chính xác.");
      } else {
        setDisableError("Đã xảy ra lỗi khi tắt 2FA: " + (err.message || err.code));
      }
    } finally {
      setDisableLoading(false);
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disableLoading) return;
    await processDisable2FA(disableOtpCode);
  };

  const copyToClipboard = () => {
    if (!generatedSecret) return;
    navigator.clipboard.writeText(generatedSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm dark:bg-slate-950/80">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              {t("settingsModalTitle")}
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50 px-6 dark:border-slate-800 dark:bg-slate-950/40">
            <button
              onClick={() => setActiveTab("password")}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "password"
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Lock className="h-4 w-4" />
              {t("tabPassword")}
            </button>
            <button
              onClick={() => setActiveTab("2fa")}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "2fa"
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              {t("tabSecurity")}
            </button>
          </div>

          {/* Tab Contents */}
          <div className="max-h-[70vh] overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              {activeTab === "password" ? (
                <motion.div
                  key="password-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {!effectiveHasPassword ? (
                    <div className="rounded-xl bg-amber-50/80 p-5 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 border border-amber-200 dark:border-amber-900/40 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 font-bold">
                          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>{lang === "vi" ? "Trạng thái: Chưa cài đặt mật khẩu" : "Status: Password not set"}</span>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                          Google Login
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {lang === "vi"
                          ? "Tài khoản của bạn hiện đang sử dụng đăng nhập bằng Google và chưa thiết lập mật khẩu riêng. Tạo mật khẩu ngay để có thể đăng nhập bằng Email/Password và kích hoạt tính năng Khóa phiên (Session Lock)."
                          : "Your account uses Google login and doesn't have a custom password. Create a password now to enable Email/Password login and Session Lock."}
                      </p>
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setIsGooglePwSetupModalOpen(true)}
                          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 transition-all cursor-pointer"
                        >
                          <KeyRound className="h-4 w-4" />
                          {lang === "vi" ? "Tạo mật khẩu" : "Create password"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {isGoogleUser && (
                        <div className="flex items-center justify-between rounded-xl bg-emerald-50/80 p-3.5 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40">
                          <div className="flex items-center gap-2 font-semibold">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>{lang === "vi" ? "Trạng thái: Đã có mật khẩu" : "Status: Password configured"}</span>
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            (Google + Email/Password)
                          </span>
                        </div>
                      )}

                      <form onSubmit={handleChangePassword} className="space-y-4">
                        {passwordError && (
                          <div className="flex items-start gap-2.5 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-100 dark:border-red-900/30">
                            <AlertCircle className="h-5 w-5 shrink-0" />
                            <span>{passwordError}</span>
                          </div>
                        )}

                        {passwordSuccess && (
                          <div className="flex items-start gap-2.5 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <span>{passwordSuccess}</span>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                            {t("currentPassword")}
                          </label>
                          <div className="relative">
                            <input
                              type={showCurrentPassword ? "text" : "password"}
                              required
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder-slate-500 transition-all text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                            >
                              {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                            {t("newPassword")}
                          </label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? "text" : "password"}
                              required
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder={lang === "vi" ? "Ít nhất 8 ký tự, gồm hoa, thường, số, ký tự đặc biệt..." : "Min 8 chars with uppercase, lowercase, number, symbol..."}
                              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder-slate-500 transition-all text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                            >
                              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                            {lang === "vi"
                              ? "Mật khẩu phải dài tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt."
                              : "Password must be at least 8 characters long, including uppercase, lowercase, digits, and special characters."}
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                            {t("confirmNewPassword")}
                          </label>
                          <div className="relative">
                            <input
                              type={showConfirmNewPassword ? "text" : "password"}
                              required
                              value={confirmNewPassword}
                              onChange={(e) => setConfirmNewPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder-slate-500 transition-all text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                            >
                              {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-end pt-2">
                          <button
                            type="submit"
                            disabled={passwordLoading}
                            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400 dark:bg-indigo-500 dark:hover:bg-indigo-400 transition-all cursor-pointer"
                          >
                            {passwordLoading ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                              t("updatePasswordBtn")
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="2fa-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* Session Lock Feature */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {t("sessionLockTitle")}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          {t("sessionLockDesc")}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                          enableSessionLock 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/30"
                            : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/50"
                        }`}>
                          {enableSessionLock ? (lang === "vi" ? "Đang bật" : "Enabled") : (lang === "vi" ? "Đã tắt" : "Disabled")}
                        </span>

                        <button
                          type="button"
                          role="switch"
                          aria-checked={enableSessionLock}
                          disabled={sessionLockLoading}
                          onClick={handleSessionLockToggle}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
                            enableSessionLock ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              enableSessionLock ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {showCreatePasswordPrompt && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3"
                      >
                        <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>
                            {lang === "vi"
                              ? "Tài khoản đăng nhập bằng Google cần thiết lập mật khẩu trước khi bật tính năng Khóa phiên để dùng làm mật khẩu mở khóa."
                              : "Google login accounts need to set a password before enabling Session Lock."}
                          </span>
                        </div>

                        {sessionLockPasswordError && (
                          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-100 dark:border-red-900/30">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>{sessionLockPasswordError}</span>
                          </div>
                        )}

                        <form onSubmit={handleCreatePasswordAndEnableSessionLock} className="space-y-3 pt-1">
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                              {lang === "vi" ? "Tạo mật khẩu mở khóa mới" : "Create unlock password"}
                            </label>
                            <div className="relative">
                              <input
                                type={showSessionLockNewPw ? "text" : "password"}
                                required
                                value={sessionLockNewPassword}
                                onChange={(e) => setSessionLockNewPassword(e.target.value)}
                                placeholder={lang === "vi" ? "Ít nhất 8 ký tự, gồm hoa, thường, số, ký tự đặc biệt..." : "Min 8 chars with uppercase, lowercase, number, symbol..."}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-9 text-xs text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                              />
                              <button
                                type="button"
                                onClick={() => setShowSessionLockNewPw(!showSessionLockNewPw)}
                                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                              >
                                {showSessionLockNewPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                              {lang === "vi"
                                ? "Mật khẩu phải dài tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt."
                                : "Password must be at least 8 characters long, including uppercase, lowercase, digits, and special characters."}
                            </p>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                              {t("confirmNewPassword")}
                            </label>
                            <div className="relative">
                              <input
                                type={showSessionLockConfirmPw ? "text" : "password"}
                                required
                                value={sessionLockConfirmPassword}
                                onChange={(e) => setSessionLockConfirmPassword(e.target.value)}
                                placeholder={lang === "vi" ? "Nhập lại mật khẩu..." : "Confirm password..."}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-9 text-xs text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                              />
                              <button
                                type="button"
                                onClick={() => setShowSessionLockConfirmPw(!showSessionLockConfirmPw)}
                                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                              >
                                {showSessionLockConfirmPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setShowCreatePasswordPrompt(false);
                                setSessionLockNewPassword("");
                                setSessionLockConfirmPassword("");
                                setSessionLockPasswordError(null);
                              }}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all cursor-pointer"
                            >
                              {t("cancel")}
                            </button>
                            <button
                              type="submit"
                              disabled={sessionLockPasswordLoading}
                              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400 transition-all cursor-pointer"
                            >
                              {sessionLockPasswordLoading ? (
                                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              ) : (
                                (lang === "vi" ? "Lưu mật khẩu & Bật khóa phiên" : "Save Password & Enable Lock")
                              )}
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    )}
                  </div>
                  {/* Status Badge */}
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4 border border-slate-200 dark:bg-slate-950/30 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      {twoFactorEnabled ? (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          <ShieldAlert className="h-5 w-5" />
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {t("twoFactorStatus")}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {lang === "vi" ? "Bảo vệ tài khoản bằng ứng dụng Authenticator." : "Protect account with Authenticator app."}
                        </p>
                      </div>
                    </div>
                    <div>
                      {twoFactorEnabled ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30">
                          {t("twoFactorActive")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50">
                          {t("twoFactorInactive")}
                        </span>
                      )}
                    </div>
                  </div>

                  {!twoFactorEnabled ? (
                    /* Setup 2FA Flow */
                    <div className="space-y-4">
                      {setupSuccess && (
                        <div className="flex items-start gap-2.5 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          <span>{setupSuccess}</span>
                        </div>
                      )}

                      {setupError && (
                        <div className="flex items-start gap-2.5 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-100 dark:border-red-900/30">
                          <AlertCircle className="h-5 w-5 shrink-0" />
                          <span>{setupError}</span>
                        </div>
                      )}

                      {twoFactorStep === 1 ? (
                        <form onSubmit={handleInitiate2FA} className="space-y-4">
                          <div className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                            <p className="font-medium text-slate-900 dark:text-white">
                              {lang === "vi" ? "Tại sao nên bật 2FA?" : "Why enable 2FA?"}
                            </p>
                            <p>
                              {lang === "vi"
                                ? "Khi bật 2FA, mỗi khi đăng nhập ngoài việc nhập mật khẩu chính xác, bạn sẽ cần nhập thêm mã OTP 6 số từ thiết bị di động của mình để bảo mật tuyệt đối các ghi chú."
                                : "When 2FA is enabled, every login requires a 6-digit OTP code from your mobile device in addition to your password for maximum security."}
                            </p>
                          </div>

                          {!isGoogleUser && (
                            <div>
                              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                                {lang === "vi" ? "Nhập lại mật khẩu để xác minh chính chủ" : "Enter password to verify ownership"}
                              </label>
                              <div className="relative">
                                <input
                                  type={showAccountPassword ? "text" : "password"}
                                  required
                                  value={accountPassword}
                                  onChange={(e) => setAccountPassword(e.target.value)}
                                  placeholder={lang === "vi" ? "Nhập mật khẩu tài khoản của bạn..." : "Enter your account password..."}
                                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder-slate-500 transition-all text-sm"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowAccountPassword(!showAccountPassword)}
                                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                >
                                  {showAccountPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={setupLoading}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400 dark:bg-indigo-500 dark:hover:bg-indigo-400 transition-all cursor-pointer"
                          >
                            {setupLoading ? (
                              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                              lang === "vi" ? "Bắt đầu cài đặt 2FA" : "Start 2FA Setup"
                            )}
                          </button>
                        </form>
                      ) : (
                        /* Step 2: Show QR & verify OTP */
                        <form onSubmit={handleVerifyAndEnable2FA} className="space-y-5">
                          <div className="space-y-3">
                            <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                              {t("scanQrTitle")}
                            </h5>
                            
                            <div className="flex flex-col sm:flex-row items-center gap-6 justify-center bg-slate-50 p-4 rounded-lg border border-slate-200 dark:bg-slate-950/20 dark:border-slate-800">
                              {/* QR Code Container */}
                              <div className="flex h-48 w-48 shrink-0 items-center justify-center rounded-lg bg-white p-2 border border-slate-200 shadow-sm mx-auto sm:mx-0">
                                {qrCodeUrl ? (
                                  <img
                                    src={qrCodeUrl}
                                    alt="2FA QR Code"
                                    className="h-full w-full object-contain rounded"
                                  />
                                ) : (
                                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                                )}
                              </div>

                              <div className="flex-1 space-y-2 text-center sm:text-left">
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {lang === "vi" ? "Nếu không quét được, hãy thêm thủ công bằng khoá bí mật:" : "If you cannot scan, enter the secret key manually:"}
                                </p>
                                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded border border-slate-200 dark:bg-slate-950 dark:border-slate-850 justify-center sm:justify-start">
                                  <code className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-200 break-all">
                                    {generatedSecret}
                                  </code>
                                  <button
                                    type="button"
                                    onClick={copyToClipboard}
                                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                    title={t("copyCode")}
                                  >
                                    {copiedSecret ? (
                                      <Check className="h-4 w-4 text-emerald-500" />
                                    ) : (
                                      <Copy className="h-4 w-4" />
                                    )}
                                  </button>
                                </div>
                                <p className="text-[10px] text-slate-400">
                                  Config: TOTP, Algorithm: SHA1, Digits: 6, Period: 30s.
                                </p>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 text-center">
                              {t("enterOtpPrompt")}
                            </label>
                            <OtpInput
                              value={otpVerifyCode}
                              onChange={setOtpVerifyCode}
                              onComplete={(completedCode) => {
                                if (!setupLoading) processVerifyAndEnable2FA(completedCode);
                              }}
                              disabled={setupLoading}
                            />
                          </div>

                          <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setTwoFactorStep(1);
                                setGeneratedSecret("");
                              }}
                              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              {t("cancel")}
                            </button>
                            <button
                              type="submit"
                              disabled={setupLoading || otpVerifyCode.trim().length !== 6}
                              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400 dark:bg-indigo-500 dark:hover:bg-indigo-400 transition-all cursor-pointer"
                            >
                              {setupLoading ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              ) : (
                                t("activate2fa")
                              )}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  ) : (
                    /* Disable 2FA Flow */
                    <form onSubmit={handleDisable2FA} className="space-y-4">
                      <div className="rounded-lg bg-red-50/50 p-4 border border-red-150 text-sm text-red-800 dark:bg-red-950/20 dark:text-red-350 dark:border-red-900/30">
                        <div className="flex items-center gap-2 font-bold mb-1">
                          <AlertCircle className="h-5 w-5 text-red-500" />
                          {lang === "vi" ? "Hành động nhạy cảm" : "Sensitive action"}
                        </div>
                        <p>{lang === "vi" ? "Tắt Xác thực 2 bước sẽ làm giảm mức độ bảo mật cho tài khoản của bạn. Bạn nên giữ nó luôn bật." : "Disabling 2-Factor Authentication lowers your account security. Keeping it enabled is recommended."}</p>
                      </div>

                      {disableSuccess && (
                        <div className="flex items-start gap-2.5 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          <span>{disableSuccess}</span>
                        </div>
                      )}

                      {disableError && (
                        <div className="flex items-start gap-2.5 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-100 dark:border-red-900/30">
                          <AlertCircle className="h-5 w-5 shrink-0" />
                          <span>{disableError}</span>
                        </div>
                      )}

                      {!isGoogleUser && (
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                            {lang === "vi" ? "Nhập mật khẩu tài khoản để xác thực" : "Enter account password to verify"}
                          </label>
                          <div className="relative">
                            <input
                              type={showDisablePassword ? "text" : "password"}
                              required
                              value={disablePassword}
                              onChange={(e) => setDisablePassword(e.target.value)}
                              placeholder={lang === "vi" ? "Mật khẩu của bạn..." : "Your password..."}
                              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder-slate-500 transition-all text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => setShowDisablePassword(!showDisablePassword)}
                              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                            >
                              {showDisablePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 text-center">
                          {t("disableOtpPrompt")}
                        </label>
                        <OtpInput
                          value={disableOtpCode}
                          onChange={setDisableOtpCode}
                          onComplete={(completedCode) => {
                            if (!disableLoading) processDisable2FA(completedCode);
                          }}
                          disabled={disableLoading}
                        />
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={disableLoading || disableOtpCode.trim().length !== 6}
                          className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:bg-red-400 transition-all cursor-pointer"
                        >
                          {disableLoading ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : (
                            t("confirmDisable2fa")
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      <GooglePasswordSetupModal
        isOpen={isGooglePwSetupModalOpen}
        user={user}
        onClose={() => setIsGooglePwSetupModalOpen(false)}
        onSuccess={() => {
          setCustomHasPassword(true);
          setIsGooglePwSetupModalOpen(false);
        }}
      />
    </AnimatePresence>
  );
}
