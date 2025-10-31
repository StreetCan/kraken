"use client";

import React from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import Index from "@/pages/Index";
import ModulePage from "@/pages/Module";
import DarkModeToggle from "@/components/DarkModeToggle";
import { SessionProvider, useSession } from "@/contexts/SessionProvider";
import Login from "@/pages/Login";
import { showSuccess, showError } from "@/utils/toast";

const Header: React.FC = () => {
  // useSession must be called while rendered inside SessionProvider (which is true)
  const { user, signOut } = useSession();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    showSuccess("Signed out");
    navigate("/");
  };

  return (
    <header className="w-full border-b dark:border-b-border/20 bg-white dark:bg-background">
      <div className="max-w-[1700px] mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-lg font-semibold">
            Kraken
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <DarkModeToggle />

          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">
                {user.email ?? "Account"}
              </div>
              <button
                onClick={handleSignOut}
                className="px-3 py-1 rounded bg-red-50 text-red-600 dark:bg-red-900 dark:text-red-200 text-sm"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link to="/login" className="text-sm text-muted-foreground hover:underline">
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <SessionProvider>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/module/:id" element={<ModulePage />} />
              <Route path="*" element={<Index />} />
            </Routes>
          </main>
        </div>
      </SessionProvider>
    </BrowserRouter>
  );
};

export default App;