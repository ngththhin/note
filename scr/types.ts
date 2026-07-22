import { Timestamp } from "firebase/firestore";

export interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export type CategoryType = "Tất cả" | "Công việc" | "Cá nhân" | "Học tập" | "Khác";
