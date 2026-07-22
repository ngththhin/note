import React, { useState, useEffect } from "react";
import { EmailAuthProvider, linkWithCredential, updatePassword } from "firebase/auth";
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import { motion, AnimatePresence } from "motion/react";
import { 
  KeyRound, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Mail, 
  ArrowRight,
  Eye,
  EyeOff
} from "lucide-react";
import { validatePasswordStrength, PASSWORD_POLICY_MESSAGE } from "../lib/passwordUtils";
import OtpInput from "./OtpInput";
import { useLanguage } from "../lib/LanguageContext";

interface GooglePasswordSetupModalProps {
  isOpen: boolean;
  user: any;
  onClose: () => void;
  onSuccess?: () => void;
  onDismiss?: () => void;
}

export default function GooglePasswordSetupModal({
  isOpen,
  user,
  onClose,
  onSuccess,
  onDismiss,
}: GooglePasswordSetupModalProps) {
  const { lang } = useLanguage();
  const [step, setStep] = useState<"prompt" | "form">("prompt");
  
  // OTP Verification State
  const [inputOtp, setInputOtp] = useState<string>("");
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpLoading, setOtpLoading] = useState<boolean>(false);
  
  // Password State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // UI Feedback State
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStep("prompt");
      setInputOtp("");
      setOtpSent(false);
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
      setSuccess(null);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  // Generate & Send 6-digit In-App Verification OTP Code securely to Firestore
  const handleSendVerificationOtp = async () => {
    setError(null);
    setSuccess(null);
    setOtpLoading(true);

    try {
      const email = auth.currentUser?.email || user.email;
      const uid = auth.currentUser?.uid || user.uid;
      if (!email || !uid) {
        throw new Error(lang === "vi" ? "Không tìm thấy địa chỉ email tài khoản." : "Account email address not found.");
      }

      // Generate random 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store in Firestore 'otp_codes' collection with 5-minute expiration
      const otpDocRef = doc(db, "otp_codes", uid);
      await setDoc(otpDocRef, {
        userId: uid,
        email: email,
        otp: code,
        createdAt: serverTimestamp(),
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes validity
      });

      setOtpSent(true);
      setSuccess(
        lang === "vi"
          ? `Mã OTP 6 chữ số đã được gửi về email ${email}. Vui lòng kiểm tra hộp thư (mã có hiệu lực trong 5 phút).`
          : `A 6-digit OTP code has been sent to ${email} (valid for 5 minutes).`
      );
    } catch (err: any) {
      console.error("Lỗi khi gửi mã OTP:", err);
      setError((lang === "vi" ? "Không thể gửi mã OTP: " : "Cannot send OTP: ") + (err.message || err.code));
    } finally {
      setOtpLoading(false);
    }
  };

  // Start setup form
  const handleStartSetup = () => {
    setStep("form");
    if (!otpSent) {
      handleSendVerificationOtp();
    }
  };

  // Dismiss setup
  const handleDismiss = () => {
    if (onDismiss) onDismiss();
    onClose();
  };

  // Submit Password creation directly via Secure OTP verification & Account Linking
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError(lang === "vi" ? "Phiên đăng nhập không tồn tại hoặc đã hết hạn. Vui lòng đăng nhập lại." : "Invalid session. Please log in again.");
      return;
    }

    // Step 1: Validate Password Strength
    const pwValidation = validatePasswordStrength(newPassword);
    if (!pwValidation.valid) {
      setError(pwValidation.message || PASSWORD_POLICY_MESSAGE);
      return;
    }

    // Step 2: Validate Password Match
    if (newPassword !== confirmPassword) {
      setError(lang === "vi" ? "Xác nhận mật khẩu mới không trùng khớp." : "Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      // Step 3: Verify OTP from Firestore & Single-use Deletion
      const otpDocRef = doc(db, "otp_codes", currentUser.uid);
      const otpSnap = await getDoc(otpDocRef);

      if (!otpSnap.exists()) {
        setError(lang === "vi" ? "Mã OTP không hợp lệ hoặc đã hết hạn. Vui lòng nhấn gửi lại mã mới." : "Invalid or expired OTP code. Please request a new code.");
        setInputOtp("");
        setLoading(false);
        return;
      }

      const otpData = otpSnap.data();
      const now = Date.now();

      if (now > (otpData.expiresAt || 0)) {
        await deleteDoc(otpDocRef);
        setError(lang === "vi" ? "Mã OTP đã hết hạn (quá 5 phút). Vui lòng gửi lại mã mới." : "OTP code has expired (5 mins limit). Please request a new code.");
        setInputOtp("");
        setLoading(false);
        return;
      }

      if (otpData.otp !== inputOtp.trim()) {
        setError(lang === "vi" ? "Mã OTP không chính xác. Vui lòng kiểm tra lại." : "Incorrect OTP code. Please check again.");
        setInputOtp("");
        setLoading(false);
        return;
      }

      // SINGLE-USE OTP GUARANTEE: Immediately delete OTP document from database upon successful verification
      await deleteDoc(otpDocRef);

      const email = currentUser.email || user.email;
      
      // Step 4: Link Email/Password credential to Google User account
      try {
        const credential = EmailAuthProvider.credential(email, newPassword);
        await linkWithCredential(currentUser, credential);
      } catch (linkErr: any) {
        // Fallback: If credential was already linked, update password directly
        if (
          linkErr.code === "auth/provider-already-linked" || 
          linkErr.code === "auth/credential-already-in-use"
        ) {
          await updatePassword(currentUser, newPassword);
        } else {
          throw linkErr;
        }
      }

      // Step 5: Update Firestore database user document with hasPassword = true
      const userRef = doc(db, "users", currentUser.uid);
      await setDoc(userRef, {
        hasPassword: true,
        updatedAt: new Date(),
      }, { merge: true });

      setSuccess(
        lang === "vi"
          ? "Đã tạo mật khẩu thành công! Giờ đây bạn có thể đăng nhập bằng Email/Mật khẩu hoặc sử dụng tính năng Khóa phiên."
          : "Password created successfully! You can now log in with Email/Password or use Session Lock."
      );

      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error("Lỗi khi tạo mật khẩu:", err);
      if (err.code === "auth/weak-password") {
        setError(PASSWORD_POLICY_MESSAGE);
      } else if (err.code === "auth/requires-recent-login") {
        setError(lang === "vi" ? "Phiên đăng nhập đã quá hạn. Vui lòng đăng xuất và đăng nhập lại bằng Google." : "Session expired. Please log out and sign in with Google again.");
      } else {
        setError((lang === "vi" ? "Không thể tạo mật khẩu: " : "Cannot create password: ") + (err.message || err.code));
      }
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled =
    loading ||
    !inputOtp ||
    inputOtp.length !== 6 ||
    !newPassword ||
    !validatePasswordStrength(newPassword).valid ||
    newPassword !== confirmPassword;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <KeyRound className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {lang === "vi" ? "Tạo mật khẩu cho tài khoản Google" : "Create Password for Google Account"}
              </h3>
            </div>
            <button
              onClick={handleDismiss}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            {step === "prompt" ? (
              <div className="space-y-5">
                <div className="rounded-xl bg-indigo-50/70 p-4 border border-indigo-100 dark:bg-indigo-950/30 dark:border-indigo-900/40 text-center space-y-2">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 mb-1">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {lang === "vi" ? "Tăng cường bảo mật cho tài khoản" : "Enhance Account Security"}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {lang === "vi"
                      ? "Tạo mật khẩu riêng cho tài khoản Google của bạn để bật tính năng Khóa phiên (Session Lock) bảo vệ ghi chú riêng tư."
                      : "Create a password for your Google account to enable Session Lock and protect private notes."}
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    {lang === "vi" ? "Để sau" : "Later"}
                  </button>
                  <button
                    type="button"
                    onClick={handleStartSetup}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 transition-all cursor-pointer"
                  >
                    {lang === "vi" ? "Tạo mật khẩu ngay" : "Create Password"}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Info Banner */}
                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 dark:bg-slate-950/50 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <Mail className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span>{lang === "vi" ? `Xác nhận tài khoản (${user.email})` : `Verify account (${user.email})`}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSendVerificationOtp}
                      disabled={otpLoading}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer disabled:opacity-50"
                    >
                      {otpLoading ? (lang === "vi" ? "Đang gửi..." : "Sending...") : (lang === "vi" ? "Gửi lại mã OTP" : "Resend OTP")}
                    </button>
                  </div>

                  {otpSent && (
                    <div className="flex items-center gap-2 rounded-lg bg-indigo-50/80 px-3 py-2 text-xs text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200 border border-indigo-200/60 dark:border-indigo-800/40">
                      <Mail className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span>
                        {lang === "vi"
                          ? "Mã OTP 6 chữ số đã được gửi về email của bạn. Vui lòng kiểm tra hộp thư (mã có hiệu lực trong 5 phút)."
                          : "A 6-digit OTP code has been sent to your email (valid for 5 mins)."}
                      </span>
                    </div>
                  )}
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900/40">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Success Banner */}
                {success && (
                  <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{success}</span>
                  </div>
                )}

                {/* Field 1: OTP Code 6 digits */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 text-center">
                    {lang === "vi" ? "1. Nhập Mã xác nhận 6 chữ số" : "1. Enter 6-digit OTP code"}
                  </label>
                  <OtpInput
                    value={inputOtp}
                    onChange={setInputOtp}
                    disabled={loading}
                    autoFocus={true}
                  />
                </div>

                {/* Field 2: New Password Input */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    {lang === "vi" ? "2. Mật khẩu mới" : "2. New password"}
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={lang === "vi" ? "Tối thiểu 8 ký tự, gồm hoa, thường, số, ký tự đặc biệt..." : "Min 8 chars with uppercase, lowercase, number, symbol..."}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 pr-10 text-xs text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder-slate-500 transition-all"
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

                {/* Field 3: Confirm Password Input */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    {lang === "vi" ? "3. Xác nhận mật khẩu mới" : "3. Confirm new password"}
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={lang === "vi" ? "Nhập lại mật khẩu mới..." : "Re-enter new password..."}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 pr-10 text-xs text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder-slate-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {newPassword && confirmPassword && newPassword !== confirmPassword && (
                    <p className="mt-1 text-[11px] text-red-500">{lang === "vi" ? "Mật khẩu xác nhận chưa trùng khớp." : "Password confirmation does not match."}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    {lang === "vi" ? "Để sau" : "Later"}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitDisabled}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400 transition-all cursor-pointer"
                  >
                    {loading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      lang === "vi" ? "Xác nhận & Lưu mật khẩu" : "Confirm & Save Password"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
