import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "vi" | "en";

export type TranslationKey = string;

export const translations: Record<Language, Record<string, string>> = {
  vi: {
    // App Branding
    appTitle: "Note - Ghi chú",
    appSubtitle: "Quản lý ghi chú an toàn & hiện đại",

    // Navigation & Search
    myNotes: "Ghi chú của tôi",
    searchPlaceholder: "Tìm kiếm ghi chú...",
    addNote: "Thêm ghi chú",
    settings: "Cài đặt",
    logout: "Đăng xuất",
    login: "Đăng nhập",
    register: "Đăng ký",
    lockSession: "Khóa phiên",
    unlockSession: "Mở khóa phiên",

    // Categories
    catAll: "Tất cả",
    catWork: "Công việc",
    catPersonal: "Cá nhân",
    catStudy: "Học tập",
    catOther: "Khác",

    // Notes List
    noNotes: "Chưa có ghi chú nào",
    noNotesFound: "Không tìm thấy ghi chú phù hợp",
    createNewNotePrompt: "Tạo ghi chú mới để bắt đầu lưu trữ ý tưởng của bạn",
    pin: "Ghim",
    unpin: "Bỏ ghim",
    edit: "Chỉnh sửa",
    delete: "Xóa",
    confirmDeleteTitle: "Xác nhận xóa ghi chú",
    confirmDeleteMessage: "Bạn có chắc chắn muốn xóa ghi chú này không? Thao tác này không thể hoàn tác.",
    createdOn: "Tạo lúc",
    updatedOn: "Cập nhật",

    // Note Modal
    modalNewNoteTitle: "Thêm ghi chú mới",
    modalEditNoteTitle: "Chỉnh sửa ghi chú",
    noteTitlePlaceholder: "Tiêu đề ghi chú...",
    noteContentPlaceholder: "Viết nội dung ghi chú của bạn ở đây...",
    categoryLabel: "Danh mục",
    save: "Lưu ghi chú",
    cancel: "Hủy bỏ",
    confirm: "Xác nhận",
    saving: "Đang lưu...",

    // Lock Screen
    sessionLockedTitle: "Phiên làm việc đã bị khóa",
    sessionLockedDesc: "Nhập mật khẩu tài khoản của bạn để tiếp tục truy cập ghi chú.",
    enterPasswordPlaceholder: "Nhập mật khẩu tài khoản...",
    unlockButton: "Mở khóa",
    invalidPassword: "Mật khẩu không chính xác. Vui lòng thử lại.",

    // Auth Screen Keys
    welcomeTitle: "Chào mừng quay lại",
    welcomeBack: "Chào mừng quay lại",
    createAccTitle: "Tạo tài khoản mới",
    authSubtitle: "Đăng nhập để đồng bộ và bảo mật ghi chú của bạn",
    loginTab: "Đăng nhập",
    registerTab: "Đăng ký",
    googleSignIn: "Đăng nhập với Google",
    loginWithGoogle: "Đăng nhập với Google",
    orDivider: "HOẶC TIẾP TỤC VỚI",
    orContinueWith: "HOẶC TIẾP TỤC VỚI",
    emailLabel: "ĐỊA CHỈ EMAIL",
    passwordLabel: "MẬT KHẨU",
    confirmPasswordLabel: "XÁC NHẬN MẬT KHẨU",
    confirmPassword: "XÁC NHẬN MẬT KHẨU",
    forgotPassword: "Quên mật khẩu?",
    forgotPasswordTitle: "Khôi phục mật khẩu",
    forgotPasswordDesc: "Nhập email của bạn để nhận liên kết đặt lại mật khẩu.",
    sendResetLink: "Gửi link khôi phục",
    backToLogin: "Quay lại Đăng nhập",
    haveAccount: "Đã có tài khoản?",
    needAccount: "Chưa có tài khoản?",
    noAccount: "Chưa có tài khoản?",
    registerNow: "Đăng ký ngay",
    loginHere: "Đăng nhập ngay",
    loginBtn: "Đăng nhập",
    registerBtn: "Đăng ký ngay",
    resetLinkSent: "Đã gửi liên kết khôi phục mật khẩu vào email của bạn.",
    passwordsDoNotMatch: "Mật khẩu xác nhận không khớp.",

    // 2FA Screen
    twoFactorTitle: "Xác thực 2 bước (2FA)",
    twoFactorDesc: "Mở ứng dụng Google Authenticator trên điện thoại để lấy mã 6 chữ số.",
    verify2FAButton: "Xác thực & Tiếp tục",
    invalidOtpCode: "Mã xác nhận 6 chữ số không đúng. Vui lòng thử lại.",
    confirmBtn: "Xác nhận",
    enterPasswordToUnlock: "Mật khẩu để mở khóa",
    verifyEmailTitle: "Xác minh Email",
    resendVerification: "Gửi lại email xác minh",

    // Settings & Security Modal
    settingsModalTitle: "Cài đặt tài khoản & Bảo mật",
    tabPassword: "Đổi mật khẩu",
    tabSecurity: "Bảo mật (Security)",
    currentPassword: "Mật khẩu hiện tại",
    newPassword: "Mật khẩu mới",
    confirmNewPassword: "Xác nhận mật khẩu mới",
    updatePasswordBtn: "Cập nhật mật khẩu",
    sessionLockTitle: "Khóa ứng dụng khi tải lại trang (Session Lock)",
    sessionLockDesc: "Yêu cầu nhập mật khẩu để mở khóa mỗi khi F5 hoặc tải lại trang web.",
    twoFactorStatus: "Trạng thái Xác thực 2 bước",
    twoFactorActive: "Đã bật (Active)",
    twoFactorInactive: "Chưa kích hoạt",
    scanQrTitle: "Quét mã QR dưới đây bằng Authenticator App",
    copyCode: "Sao chép mã",
    enterOtpPrompt: "Nhập mã 6 chữ số từ ứng dụng để xác nhận kích hoạt",
    activate2fa: "Kích hoạt 2FA",
    disableOtpPrompt: "Nhập mã OTP 6 chữ số hiện tại để xác nhận tắt",
    confirmDisable2fa: "Xác nhận Tắt 2FA",

    securityTitle: "Cài đặt & Bảo mật",
    passwordTab: "Mật khẩu & Khóa phiên",
    twoFactorTab: "Xác thực 2 bước (2FA)",
    sessionLockLabel: "Khóa phiên (Session Lock)",
    hasPasswordSet: "Đã cài đặt mật khẩu",
    noPasswordSet: "Chưa cài đặt mật khẩu",
    changePasswordBtn: "Đổi mật khẩu",
    createPasswordBtn: "Tạo mật khẩu",
    twoFactorStatusEnabled: "Đã bật Xác thực 2 bước (2FA)",
    twoFactorStatusDisabled: "Chưa bật Xác thực 2 bước (2FA)",
    setup2FABtn: "Kích hoạt 2FA ngay",
    disable2FABtn: "Tắt Xác thực 2 bước",
    googlePasswordModalTitle: "Tạo mật khẩu cho tài khoản Google",
    googlePasswordModalDesc: "Tạo mật khẩu riêng để bật tính năng Khóa phiên (Session Lock) bảo vệ ghi chú.",
    sendOtpLink: "Gửi mã xác nhận OTP",
    enterOtpLabel: "1. Mã xác nhận 6 chữ số",
    newPasswordLabel: "2. Mật khẩu mới",
    confirmNewPasswordLabel: "3. Xác nhận mật khẩu mới",
    savePasswordBtn: "Xác nhận & Lưu mật khẩu",
    deferBtn: "Để sau",

    // Common UI
    languageLabel: "Ngôn ngữ",
    themeLabel: "Giao diện",
    close: "Đóng",
  },
  en: {
    // App Branding
    appTitle: "Note - Ghi chú",
    appSubtitle: "Secure & Modern Note Management",

    // Navigation & Search
    myNotes: "My Notes",
    searchPlaceholder: "Search notes...",
    addNote: "Add Note",
    settings: "Settings",
    logout: "Logout",
    login: "Login",
    register: "Register",
    lockSession: "Lock Session",
    unlockSession: "Unlock Session",

    // Categories
    catAll: "All",
    catWork: "Work",
    catPersonal: "Personal",
    catStudy: "Study",
    catOther: "Other",

    // Notes List
    noNotes: "No notes yet",
    noNotesFound: "No matching notes found",
    createNewNotePrompt: "Create a new note to start organizing your thoughts",
    pin: "Pin",
    unpin: "Unpin",
    edit: "Edit",
    delete: "Delete",
    confirmDeleteTitle: "Delete Note",
    confirmDeleteMessage: "Are you sure you want to delete this note? This action cannot be undone.",
    createdOn: "Created",
    updatedOn: "Updated",

    // Note Modal
    modalNewNoteTitle: "Create New Note",
    modalEditNoteTitle: "Edit Note",
    noteTitlePlaceholder: "Note title...",
    noteContentPlaceholder: "Write your note content here...",
    categoryLabel: "Category",
    save: "Save Note",
    cancel: "Cancel",
    confirm: "Confirm",
    saving: "Saving...",

    // Lock Screen
    sessionLockedTitle: "Session Locked",
    sessionLockedDesc: "Enter your account password to unlock and view your notes.",
    enterPasswordPlaceholder: "Enter account password...",
    unlockButton: "Unlock",
    invalidPassword: "Incorrect password. Please try again.",

    // Auth Screen Keys
    welcomeTitle: "Welcome Back",
    welcomeBack: "Welcome Back",
    createAccTitle: "Create New Account",
    authSubtitle: "Sign in to sync and protect your notes",
    loginTab: "Login",
    registerTab: "Register",
    googleSignIn: "Sign in with Google",
    loginWithGoogle: "Sign in with Google",
    orDivider: "OR CONTINUE WITH",
    orContinueWith: "OR CONTINUE WITH",
    emailLabel: "EMAIL ADDRESS",
    passwordLabel: "PASSWORD",
    confirmPasswordLabel: "CONFIRM PASSWORD",
    confirmPassword: "CONFIRM PASSWORD",
    forgotPassword: "Forgot password?",
    forgotPasswordTitle: "Reset Password",
    forgotPasswordDesc: "Enter your email address to receive a password reset link.",
    sendResetLink: "Send Reset Link",
    backToLogin: "Back to Login",
    haveAccount: "Already have an account?",
    needAccount: "Don't have an account?",
    noAccount: "Don't have an account?",
    registerNow: "Register now",
    loginHere: "Log in here",
    loginBtn: "Login",
    registerBtn: "Register now",
    resetLinkSent: "Password reset link sent to your email.",
    passwordsDoNotMatch: "Passwords do not match.",

    // 2FA Screen
    twoFactorTitle: "2-Step Verification (2FA)",
    twoFactorDesc: "Open Google Authenticator on your mobile device to view your 6-digit code.",
    verify2FAButton: "Verify & Continue",
    invalidOtpCode: "Invalid 6-digit verification code. Please try again.",
    confirmBtn: "Confirm",
    enterPasswordToUnlock: "Password to unlock",
    verifyEmailTitle: "Verify Email",
    resendVerification: "Resend verification email",

    // Settings & Security Modal
    settingsModalTitle: "Account & Security Settings",
    tabPassword: "Change Password",
    tabSecurity: "Security",
    currentPassword: "Current Password",
    newPassword: "New Password",
    confirmNewPassword: "Confirm New Password",
    updatePasswordBtn: "Update Password",
    sessionLockTitle: "Lock App on Page Reload (Session Lock)",
    sessionLockDesc: "Require password to unlock whenever F5 or page is reloaded.",
    twoFactorStatus: "2-Factor Authentication Status",
    twoFactorActive: "Enabled (Active)",
    twoFactorInactive: "Inactive",
    scanQrTitle: "Scan QR Code with Authenticator App",
    copyCode: "Copy secret key",
    enterOtpPrompt: "Enter 6-digit code from app to verify activation",
    activate2fa: "Activate 2FA",
    disableOtpPrompt: "Enter current 6-digit OTP code to confirm disable",
    confirmDisable2fa: "Confirm Disable 2FA",

    securityTitle: "Settings & Security",
    passwordTab: "Password & Session Lock",
    twoFactorTab: "2-Step Verification (2FA)",
    sessionLockLabel: "Session Lock",
    hasPasswordSet: "Password set",
    noPasswordSet: "No password set",
    changePasswordBtn: "Change Password",
    createPasswordBtn: "Create Password",
    twoFactorStatusEnabled: "2-Step Verification Enabled",
    twoFactorStatusDisabled: "2-Step Verification Disabled",
    setup2FABtn: "Setup 2FA Now",
    disable2FABtn: "Disable 2FA",
    googlePasswordModalTitle: "Set Password for Google Account",
    googlePasswordModalDesc: "Set an account password to enable Session Lock and protect private notes.",
    sendOtpLink: "Send Verification Code",
    enterOtpLabel: "1. Enter 6-digit Verification Code",
    newPasswordLabel: "2. New Password",
    confirmNewPasswordLabel: "3. Confirm New Password",
    savePasswordBtn: "Save & Link Password",
    deferBtn: "Maybe Later",

    // Common UI
    languageLabel: "Language",
    themeLabel: "Theme",
    close: "Close",
  },
};

interface LanguageContextType {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "vi",
  setLang: () => {},
  t: (key: string) => translations["vi"]?.[key] || key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem("app_language");
    if (saved === "en" || saved === "vi") return saved;
    return "vi";
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("app_language", newLang);
  };

  const t = (key: string): string => {
    return translations[lang]?.[key] || translations["vi"]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
