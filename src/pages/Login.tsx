import React from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [isDark, setIsDark] = React.useState<boolean>(() =>
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : false,
  );

  React.useEffect(() => {
    // If already signed in, go home
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (data.session) navigate("/");
    })();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  React.useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") && session) {
        navigate("/", { replace: true });
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  React.useEffect(() => {
    // Listen for changes to the root element's class list so we can toggle Auth theme/live text color.
    const root = typeof document !== "undefined" ? document.documentElement : null;
    if (!root) return;

    const obs = new MutationObserver(() => {
      setIsDark(root.classList.contains("dark"));
    });

    obs.observe(root, { attributes: true, attributeFilter: ["class"] });

    // sync initial
    setIsDark(root.classList.contains("dark"));

    return () => obs.disconnect();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="w-full max-w-md p-6 bg-card rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Sign in / Sign up</h2>
        <Auth
          supabaseClient={supabase}
          providers={[]}
          appearance={{ theme: ThemeSupa }}
          theme={isDark ? "dark" : "light"}
        />
      </div>
    </div>
  );
};

export default Login;