import { useState, useEffect, useMemo } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { Note, CategoryType } from "./types";
import { handleFirestoreError, OperationType } from "./lib/firestoreUtils";
import AuthScreen from "./components/AuthScreen";
import Navbar from "./components/Navbar";
import NoteCard from "./components/NoteCard";
import NoteModal from "./components/NoteModal";
import TwoFactorLoginScreen from "./components/TwoFactorLoginScreen";
import SettingsModal from "./components/SettingsModal";
import LockScreen from "./components/LockScreen";
import EmailVerificationScreen from "./components/EmailVerificationScreen";
import GooglePasswordSetupModal from "./components/GooglePasswordSetupModal";
import { useLanguage } from "./lib/LanguageContext";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, 
  Search, 
  Grid, 
  List, 
  FolderOpen, 
  FilterX, 
  CalendarDays,
  FileCheck2
} from "lucide-react";

export default function App() {
  const { lang, t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>("Tất cả");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [noteToEdit, setNoteToEdit] = useState<Note | null>(null);

  // Settings & 2FA state variables
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [is2FAVerified, setIs2FAVerified] = useState(false);
  const [isChecking2FA, setIsChecking2FA] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState("");
  const [enableSessionLock, setEnableSessionLock] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState(() => {
    return sessionStorage.getItem("isUnlocked") !== "true";
  });

  // Google account onboarding popup state
  const isGoogleUser = user?.providerData?.some((p: any) => p.providerId === "google.com");
  const hasPassword = user?.providerData?.some((p: any) => p.providerId === "password");
  const [isGooglePwPromptOpen, setIsGooglePwPromptOpen] = useState(false);

  useEffect(() => {
    if (user && isGoogleUser && !hasPassword) {
      const isDismissed = sessionStorage.getItem(`dismiss_google_pw_prompt_${user.uid}`) === "true";
      if (!isDismissed) {
        setIsGooglePwPromptOpen(true);
      }
    } else {
      setIsGooglePwPromptOpen(false);
    }
  }, [user, isGoogleUser, hasPassword]);

  // Dark / Light Theme state
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  // Apply theme to HTML tag
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecking(false);
    });
    return unsubscribe;
  }, []);

  // Check if page mount is a fresh login or a page reload (F5)
  useEffect(() => {
    const justLoggedIn = sessionStorage.getItem("justLoggedIn") === "true";
    if (justLoggedIn) {
      sessionStorage.removeItem("justLoggedIn");
    } else {
      // If F5 reload or tab open, clear isUnlocked so if enableSessionLock === true, lock screen will appear
      sessionStorage.removeItem("isUnlocked");
    }
  }, []);

  // Handler for toggling Session Lock
  const handleToggleSessionLock = async (enabled: boolean) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, { enableSessionLock: enabled }, { merge: true });
      setEnableSessionLock(enabled);
      sessionStorage.setItem("isUnlocked", "true");
      setIsLocked(false);
    } catch (err) {
      console.error("Lỗi khi cập nhật Cài đặt Khóa phiên:", err);
      throw err;
    }
  };

  // 2FA & Session Lock Setup Checking on login
  useEffect(() => {
    if (!user) {
      setIs2FAVerified(false);
      setTwoFactorEnabled(false);
      setTwoFactorSecret("");
      setEnableSessionLock(false);
      setIsChecking2FA(false);
      return;
    }

    setIsChecking2FA(true);
    const userDocRef = doc(db, "users", user.uid);
    
    // Listen to changes real-time so enable/disable in settings modal affects layout instantly
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();

        // 2FA logic
        const enabled = !!data.twoFactorEnabled;
        const secret = data.twoFactorSecret || "";
        setTwoFactorEnabled(enabled);
        setTwoFactorSecret(secret);
        
        if (!enabled) {
          setIs2FAVerified(true);
        } else {
          const verifiedRaw = localStorage.getItem(`2fa_verified_${user.uid}`);
          let isVerified = false;
          if (verifiedRaw) {
            try {
              const parsed = JSON.parse(verifiedRaw);
              if (parsed && parsed.status === true) {
                isVerified = true;
              }
            } catch {
              if (verifiedRaw === "true") {
                isVerified = true;
              }
            }
          }
          setIs2FAVerified(isVerified);
        }

        // Session Lock logic
        const sessionLockSetting = !!data.enableSessionLock; // default false
        setEnableSessionLock(sessionLockSetting);

        if (!sessionLockSetting) {
          // If session lock is disabled by user, skip LockScreen completely
          sessionStorage.setItem("isUnlocked", "true");
          setIsLocked(false);
        } else {
          // If session lock is enabled by user, check if sessionStorage has "isUnlocked" = "true"
          const isUnlockedSession = sessionStorage.getItem("isUnlocked") === "true";
          setIsLocked(!isUnlockedSession);
        }
      } else {
        setTwoFactorEnabled(false);
        setTwoFactorSecret("");
        setIs2FAVerified(true);
        setEnableSessionLock(false);
        sessionStorage.setItem("isUnlocked", "true");
        setIsLocked(false);
      }
      setIsChecking2FA(false);
    }, (error) => {
      console.error("Lỗi khi tải cấu hình người dùng:", error);
      setIs2FAVerified(true); // Fallback to avoid lockout
      setIsChecking2FA(false);
    });

    return unsubscribe;
  }, [user]);

  // Centralized Full Session Cleanup & Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Lỗi khi đăng xuất:", err);
    }

    // Preserve UI preferences
    const savedTheme = localStorage.getItem("theme");
    const savedLang = localStorage.getItem("app_language");

    // Clean up all local storage & session storage
    localStorage.clear();
    sessionStorage.clear();

    if (savedTheme) localStorage.setItem("theme", savedTheme);
    if (savedLang) localStorage.setItem("app_language", savedLang);

    // Reset JS state cleanly to LOGGED_OUT
    setUser(null);
    setNotes([]);
    setIs2FAVerified(false);
    setIsLocked(true);
    setSelectedCategory("Tất cả");
    setSearchQuery("");
    setIsSettingsOpen(false);
  };

  // ROUTE GUARD: Only subscribe and fetch user notes when user is fully AUTHENTICATED
  // (User exists, email is verified, 2FA is verified, and app is unlocked)
  useEffect(() => {
    const isFullyAuthenticated = 
      !!user && 
      user.emailVerified && 
      is2FAVerified && 
      !isLocked && 
      !isChecking2FA;

    if (!isFullyAuthenticated) {
      setNotes([]);
      return;
    }

    const path = `users/${user.uid}/notes`;
    const notesRef = collection(db, "users", user.uid, "notes");

    const unsubscribe = onSnapshot(
      notesRef,
      (snapshot) => {
        const notesData: Note[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          notesData.push({
            id: docSnap.id,
            title: data.title || "",
            content: data.content || "",
            category: data.category || "Khác",
            createdAt: data.createdAt as Timestamp,
            updatedAt: data.updatedAt as Timestamp,
          });
        });
        setNotes(notesData);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );

    return unsubscribe;
  }, [user, is2FAVerified, isLocked, isChecking2FA]);

  // Calculate Note statistics
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      "Tất cả": notes.length,
      "Công việc": 0,
      "Cá nhân": 0,
      "Học tập": 0,
      "Khác": 0,
    };
    notes.forEach((note) => {
      const cat = note.category || "Khác";
      if (counts[cat] !== undefined) {
        counts[cat]++;
      } else {
        counts["Khác"]++;
      }
    });
    return counts;
  }, [notes]);

  // Handle Create / Edit save action
  const handleSaveNote = async (title: string, content: string, category: string) => {
    if (!user) return;

    if (noteToEdit) {
      // Edit
      const path = `users/${user.uid}/notes/${noteToEdit.id}`;
      try {
        const noteRef = doc(db, "users", user.uid, "notes", noteToEdit.id);
        await updateDoc(noteRef, {
          title,
          content,
          category,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    } else {
      // Create
      const path = `users/${user.uid}/notes`;
      try {
        const notesCol = collection(db, "users", user.uid, "notes");
        await addDoc(notesCol, {
          title,
          content,
          category,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    }
  };

  // Handle Note Deletion
  const handleDeleteNote = async (id: string) => {
    if (!user) return;
    const confirmDelete = window.confirm(t("confirmDeleteMessage"));
    if (!confirmDelete) return;

    const path = `users/${user.uid}/notes/${id}`;
    try {
      const noteRef = doc(db, "users", user.uid, "notes", id);
      await deleteDoc(noteRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  // Filter & Search Notes
  const filteredNotes = useMemo(() => {
    let result = [...notes];

    // Filter by category
    if (selectedCategory !== "Tất cả") {
      result = result.filter((note) => note.category === selectedCategory);
    }

    // Search query
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (note) =>
          note.title.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query)
      );
    }

    // Sort: newest updated or created first
    return result.sort((a, b) => {
      const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0);
      const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0);
      return timeB - timeA;
    });
  }, [notes, selectedCategory, searchQuery]);

  if (authChecking || isChecking2FA) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent dark:border-indigo-400" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Đang tải cấu hình...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthScreen 
        onAuthSuccess={() => {
          sessionStorage.setItem("isUnlocked", "true");
          setIsLocked(false);
        }} 
      />
    );
  }

  if (!user.emailVerified) {
    return (
      <EmailVerificationScreen
        user={user}
        onVerifiedSuccess={(updatedUser) => {
          setUser({ ...updatedUser });
          sessionStorage.setItem("isUnlocked", "true");
          setIsLocked(false);
        }}
        onLogout={handleLogout}
      />
    );
  }

  if (!is2FAVerified) {
    return (
      <TwoFactorLoginScreen
        user={user}
        secret={twoFactorSecret}
        onVerifySuccess={() => {
          const verifiedData = JSON.stringify({ status: true, verifiedAt: Date.now() });
          localStorage.setItem(`2fa_verified_${user.uid}`, verifiedData);
          setIs2FAVerified(true);
        }}
        onLogout={handleLogout}
      />
    );
  }

  if (isLocked) {
    return (
      <LockScreen
        user={user}
        onUnlock={() => {
          sessionStorage.setItem("isUnlocked", "true");
          setIsLocked(false);
        }}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300 font-sans">
      <Navbar 
        user={user} 
        isDark={isDark} 
        toggleTheme={() => setIsDark(!isDark)} 
        onSignOut={handleLogout}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Left Panel - Sidebar (Visible on large screens) */}
          <aside className="hidden lg:flex lg:flex-col space-y-6">
            {/* Quick Action Button */}
            <button
              onClick={() => {
                setNoteToEdit(null);
                setIsModalOpen(true);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 transition-all cursor-pointer"
            >
              <Plus className="h-4.5 w-4.5" />
              {t("addNote")}
            </button>

            {/* Category Filter list with counts */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">
                {t("categoryLabel")}
              </h3>
              <nav className="space-y-1">
                {(["Tất cả", "Công việc", "Cá nhân", "Học tập", "Khác"] as CategoryType[]).map((cat) => {
                  const getDotColor = (c: string) => {
                    if (c === "Công việc") return "bg-blue-400";
                    if (c === "Cá nhân") return "bg-green-400";
                    if (c === "Học tập") return "bg-amber-400";
                    if (c === "Khác") return "bg-slate-400";
                    return "bg-indigo-500";
                  };

                  const getCatLabel = (c: string) => {
                    if (c === "Tất cả") return t("catAll");
                    if (c === "Công việc") return t("catWork");
                    if (c === "Cá nhân") return t("catPersonal");
                    if (c === "Học tập") return t("catStudy");
                    return t("catOther");
                  };

                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                        selectedCategory === cat
                          ? "bg-slate-100 text-indigo-700 dark:bg-slate-800 dark:text-indigo-400"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white"
                      }`}
                    >
                      <span className="flex items-center">
                        <span className={`w-2 h-2 rounded-full mr-3 ${getDotColor(cat)}`} />
                        {getCatLabel(cat)}
                      </span>
                      <span className={`rounded-md px-1.5 py-0.5 text-xs font-bold ${
                        selectedCategory === cat
                          ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500"
                      }`}>
                        {categoryCounts[cat] || 0}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Quick Statistics */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">
                {lang === "vi" ? "Thống kê nhanh" : "Quick Stats"}
              </h3>
              <div className="space-y-3.5 text-sm">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-2">
                    <FileCheck2 className="h-4 w-4 text-indigo-500" />
                    {lang === "vi" ? "Tổng số ghi chú" : "Total Notes"}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">{notes.length}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-indigo-500" />
                    {lang === "vi" ? "Cập nhật mới nhất" : "Last Updated"}
                  </span>
                  <span className="font-medium text-xs">
                    {notes.length > 0 ? (lang === "vi" ? "Vừa xong" : "Just now") : (lang === "vi" ? "Chưa có" : "None")}
                  </span>
                </div>
              </div>
            </div>
          </aside>

          {/* Right/Content area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Search, Filter on mobile and Layout controller panel */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              {/* Search Bar */}
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Search className="h-5 w-5" />
                </span>
                <input
                  type="text"
                  placeholder={t("searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-950 dark:border-slate-800 dark:text-white dark:placeholder-slate-500 sm:text-sm transition-all"
                />
              </div>

              {/* View layout Mode / New note on mobile */}
              <div className="flex items-center gap-4">
                {/* Mobile Create note button */}
                <button
                  onClick={() => {
                    setNoteToEdit(null);
                    setIsModalOpen(true);
                  }}
                  className="flex lg:hidden items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  {t("addNote")}
                </button>

                {/* Grid vs List View toggle */}
                <div className="flex bg-slate-100 p-1 rounded-md dark:bg-slate-800">
                  <button
                    onClick={() => setViewMode("grid")}
                    aria-label="Dạng lưới"
                    className={`p-1.5 rounded transition-all cursor-pointer ${
                      viewMode === "grid"
                        ? "bg-white text-slate-700 shadow-sm dark:bg-slate-900 dark:text-indigo-400"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    aria-label="Dạng danh sách"
                    className={`p-1.5 rounded transition-all cursor-pointer ${
                      viewMode === "list"
                        ? "bg-white text-slate-700 shadow-sm dark:bg-slate-900 dark:text-indigo-400"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Category Filters slider */}
            <div className="flex lg:hidden items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {(["Tất cả", "Công việc", "Cá nhân", "Học tập", "Khác"] as CategoryType[]).map((cat) => {
                const getDotColor = (c: string) => {
                  if (c === "Công việc") return "bg-blue-400";
                  if (c === "Cá nhân") return "bg-green-400";
                  if (c === "Học tập") return "bg-amber-400";
                  if (c === "Khác") return "bg-slate-400";
                  return "bg-indigo-500";
                };

                const getCatLabel = (c: string) => {
                  if (c === "Tất cả") return t("catAll");
                  if (c === "Công việc") return t("catWork");
                  if (c === "Cá nhân") return t("catPersonal");
                  if (c === "Học tập") return t("catStudy");
                  return t("catOther");
                };

                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`shrink-0 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold border transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-sm dark:bg-indigo-500 dark:border-indigo-500"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${getDotColor(cat)} ${selectedCategory === cat ? "bg-white" : ""}`} />
                    {getCatLabel(cat)} ({categoryCounts[cat] || 0})
                  </button>
                );
              })}
            </div>

            {/* Notes List / Grid display with transitions */}
            <AnimatePresence mode="popLayout">
              {filteredNotes.length > 0 ? (
                <motion.div
                  layout
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
                      : "space-y-4"
                  }
                >
                  {filteredNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      viewMode={viewMode}
                      onEdit={(n) => {
                        setNoteToEdit(n);
                        setIsModalOpen(true);
                      }}
                      onDelete={handleDeleteNote}
                    />
                  ))}

                  {/* Add New Placeholder Card (Grid mode only) */}
                  {viewMode === "grid" && (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => {
                        setNoteToEdit(null);
                        setIsModalOpen(true);
                      }}
                      className="border-2 border-dashed border-slate-200 rounded-xl p-5 flex flex-col items-center justify-center h-64 hover:border-indigo-300 hover:bg-indigo-50/30 dark:border-slate-800 dark:hover:border-indigo-800/50 dark:hover:bg-indigo-950/20 transition-all group cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center group-hover:bg-indigo-100 dark:group-hover:bg-indigo-950 transition-colors mb-4">
                        <Plus className="w-6 h-6 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                      </div>
                      <span className="text-slate-500 font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{t("addNote")}</span>
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                /* Empty States */
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-16 px-4 text-center dark:border-slate-800 dark:bg-slate-900"
                >
                  {searchQuery || selectedCategory !== "Tất cả" ? (
                    <>
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 dark:bg-amber-950/20 dark:text-amber-400">
                        <FilterX className="h-8 w-8" />
                      </div>
                      <h3 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">
                        {t("noNotesFound")}
                      </h3>
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                        {lang === "vi" ? "Thử điều chỉnh từ khóa tìm kiếm hoặc chọn danh mục khác để tìm thấy kết quả." : "Try adjusting your search keywords or filter to find what you are looking for."}
                      </p>
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedCategory("Tất cả");
                        }}
                        className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        {lang === "vi" ? "Đặt lại tìm kiếm" : "Reset Filter"}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 animate-bounce mb-4">
                        <FolderOpen className="h-8 w-8" />
                      </div>
                      <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
                        {t("noNotes")}
                      </h3>
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                        {t("createNewNotePrompt")}
                      </p>
                      <button
                        onClick={() => {
                          setNoteToEdit(null);
                          setIsModalOpen(true);
                        }}
                        className="mt-6 flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 transition-all cursor-pointer"
                      >
                        <Plus className="h-4.5 w-4.5" />
                        {t("addNote")}
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        </main>

      {/* Note Creation / Editing Modal */}
      <NoteModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setNoteToEdit(null);
        }}
        noteToEdit={noteToEdit}
        onSave={handleSaveNote}
      />

      {/* Settings & Account Security Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        twoFactorEnabled={twoFactorEnabled}
        enableSessionLock={enableSessionLock}
        onToggleSessionLock={handleToggleSessionLock}
      />

      {/* Initial Google Password Onboarding Modal */}
      <GooglePasswordSetupModal
        isOpen={isGooglePwPromptOpen}
        user={user}
        onClose={() => setIsGooglePwPromptOpen(false)}
        onDismiss={() => {
          if (user) {
            sessionStorage.setItem(`dismiss_google_pw_prompt_${user.uid}`, "true");
          }
          setIsGooglePwPromptOpen(false);
        }}
        onSuccess={() => {
          if (user) {
            sessionStorage.setItem(`dismiss_google_pw_prompt_${user.uid}`, "true");
          }
          setIsGooglePwPromptOpen(false);
        }}
      />
    </div>
  );
}
