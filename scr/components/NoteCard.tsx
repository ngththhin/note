import { Note } from "../types";
import { motion } from "motion/react";
import { Trash2, Edit3 } from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";

interface NoteCardProps {
  key?: string;
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void | Promise<void>;
  viewMode: "grid" | "list";
}

export default function NoteCard({ note, onEdit, onDelete, viewMode }: NoteCardProps) {
  const { lang, t } = useLanguage();

  // Format timestamp safely
  const formatTime = (timestamp: any) => {
    if (!timestamp) return lang === "vi" ? "Đang cập nhật..." : "Updating...";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString(lang === "vi" ? "vi-VN" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "Tất cả": return t("catAll");
      case "Công việc": return t("catWork");
      case "Cá nhân": return t("catPersonal");
      case "Học tập": return t("catStudy");
      default: return t("catOther");
    }
  };

  const getCategoryStyles = (category: string) => {
    switch (category) {
      case "Công việc":
        return "bg-blue-100 text-blue-700 border-transparent text-[10px] font-bold uppercase rounded-md tracking-wider dark:bg-blue-950/40 dark:text-blue-400";
      case "Cá nhân":
        return "bg-green-100 text-green-700 border-transparent text-[10px] font-bold uppercase rounded-md tracking-wider dark:bg-green-950/40 dark:text-green-400";
      case "Học tập":
        return "bg-amber-100 text-amber-700 border-transparent text-[10px] font-bold uppercase rounded-md tracking-wider dark:bg-amber-950/40 dark:text-amber-400";
      default:
        return "bg-slate-100 text-slate-700 border-transparent text-[10px] font-bold uppercase rounded-md tracking-wider dark:bg-slate-800 dark:text-slate-400";
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md dark:border-slate-800 dark:bg-slate-900 transition-all ${
        viewMode === "list" ? "flex-row items-center gap-6 h-auto" : "h-64"
      }`}
    >
      <div className={`flex-1 flex flex-col ${viewMode === "list" ? "min-w-0" : "h-full justify-between"}`}>
        <div>
          {/* Header containing title and category */}
          <div className="flex items-center justify-between gap-4 mb-3">
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${getCategoryStyles(
                note.category
              )}`}
            >
              {getCategoryLabel(note.category)}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              {formatTime(note.updatedAt || note.createdAt)}
            </span>
          </div>

          <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
            {note.title || (lang === "vi" ? "Không có tiêu đề" : "Untitled")}
          </h3>

          {/* Content Preview */}
          <p className={`mt-2 text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap ${
            viewMode === "list" ? "line-clamp-2" : "line-clamp-5 flex-1"
          }`}>
            {note.content || (lang === "vi" ? "Không có nội dung" : "No content")}
          </p>
        </div>

        {/* Footer / Actions section */}
        <div className={`mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between ${
          viewMode === "list" ? "mt-0 border-t-0 pt-0 shrink-0 gap-4" : ""
        }`}>
          <div className="flex -space-x-1">
            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border border-white dark:border-slate-900 flex items-center justify-center text-[10px] shadow-sm">
              {note.category === "Công việc" ? "💻" : note.category === "Cá nhân" ? "🛒" : note.category === "Học tập" ? "📖" : "🏷️"}
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(note)}
              aria-label={t("edit")}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400 transition-all cursor-pointer"
            >
              <Edit3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(note.id)}
              aria-label={t("delete")}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-all cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
