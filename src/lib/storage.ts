import type { Board, Config } from "@/types/board";
import { normalizeBoard, normalizeConfig } from "./board-helpers";

const BOARD_KEY = "kanban:v6";
const CONFIG_KEY = "kanban:cfg:v2";

export const storage = {
  loadBoard(): Board | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(BOARD_KEY);
      return raw ? normalizeBoard(JSON.parse(raw)) : null;
    } catch {
      return null;
    }
  },
  loadConfig(): Config | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      return raw ? normalizeConfig(JSON.parse(raw)) : null;
    } catch {
      return null;
    }
  },
  saveBoard(board: Board) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(BOARD_KEY, JSON.stringify(board));
    } catch (e) {
      console.error("Failed to save board", e);
    }
  },
  saveConfig(config: Config) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    } catch (e) {
      console.error("Failed to save config", e);
    }
  },
};
