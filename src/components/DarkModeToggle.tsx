import React from "react";
import { Sun, Moon } from "lucide-react";

const STORAGE_KEY = "dyad-dark-mode";

const getInitial = (): boolean => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "true") return true;
    if (raw === "false") return false;
  } catch {}
  // fallback to system preference
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return false;
};

const DarkModeToggle: React.FC = () => {
  const [dark, setDark] = React.useState<boolean>(getInitial);

  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, dark ? "true" : "false");
    } catch {}
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [dark]);

  return (
    <button
      onClick={() => setDark((d) => !d)}
      aria-pressed={dark}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
      <span className="sr-only">Toggle dark mode</span>
    </button>
  );
};

export default DarkModeToggle;