import { auth } from "../firebase";
import { signOut, User } from "firebase/auth";
import { Sun, Moon, LogOut, FileText, Settings, Globe } from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";

interface NavbarProps {
  user: User;
  isDark: boolean;
  toggleTheme: () => void;
  onSignOut: () => void;
  onOpenSettings: () => void;
}

export default function Navbar({ 
  user, 
  isDark, 
  toggleTheme, 
  onSignOut, 
  onOpenSettings
}: NavbarProps) {
  const { lang, setLang, t } = useLanguage();

  const handleSignOut = async () => {
    try {
      const uid = auth.currentUser?.uid || user?.uid;
      if (uid) {
        localStorage.removeItem(`2fa_verified_${uid}`);
        sessionStorage.removeItem(`is_2fa_verified_${uid}`);
      }
      await signOut(auth);
      onSignOut();
    } catch (err) {
      console.error("Lỗi khi đăng xuất: ", err);
    }
  };

  const getInitials = (user: User) => {
    if (user.displayName) {
      const parts = user.displayName.split(" ");
      if (parts.length > 1) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return user.displayName[0].toUpperCase();
    }
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    return "?";
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80 transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo / Branding */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white dark:bg-indigo-500 shadow-sm">
              <FileText className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Note - Ghi chú
            </span>
          </div>

          {/* Actions & User Info */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Language Toggle Button */}
            <button
              onClick={() => setLang(lang === "vi" ? "en" : "vi")}
              aria-label={t("languageLabel")}
              title={lang === "vi" ? "Switch to English" : "Chuyển sang Tiếng Việt"}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-xs"
            >
              <Globe className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="font-mono tracking-wider">{lang === "vi" ? "VI" : "EN"}</span>
            </button>

            {/* Settings Button */}
            <button
              onClick={onOpenSettings}
              aria-label={t("settings")}
              title={t("settings")}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-all cursor-pointer"
            >
              <Settings className="h-4.5 w-4.5" />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label={t("themeLabel")}
              title={t("themeLabel")}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-all cursor-pointer"
            >
              {isDark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>

            {/* Profile */}
            <div className="flex items-center gap-2.5 border-l border-slate-200 pl-3 dark:border-slate-800">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "Avatar"}
                  referrerPolicy="no-referrer"
                  className="h-8 w-8 rounded-lg object-cover ring-2 ring-slate-100 dark:ring-slate-800"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 font-bold text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 ring-2 ring-indigo-100/50 dark:ring-indigo-950/50 text-xs">
                  {getInitials(user)}
                </div>
              )}
              
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-slate-900 dark:text-white max-w-[150px] truncate">
                  {user.displayName || (lang === "vi" ? "Người dùng" : "User")}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[150px] truncate">
                  {user.email || ""}
                </p>
              </div>

              {/* Sign out */}
              <button
                onClick={handleSignOut}
                aria-label={t("logout")}
                className="ml-1 flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:border-red-100 hover:bg-red-50 hover:text-red-600 dark:border-slate-800 dark:text-slate-400 dark:hover:border-red-950/30 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition-all cursor-pointer"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{t("logout")}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

