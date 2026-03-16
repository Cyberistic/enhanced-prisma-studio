import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = theme === "dark";

  return (
    <header className="border-b border-border/80 bg-card/80 backdrop-blur supports-backdrop-filter:bg-card/70">
      <div className="container mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <nav className="flex items-center gap-4 text-sm font-medium">
          <a href="/" className="transition-colors hover:text-foreground/80">
            Home
          </a>
          <a href="/studio" className="transition-colors hover:text-foreground/80">
            Studio
          </a>
        </nav>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTheme(isDark ? "light" : "dark")}
        >
          {mounted ? (isDark ? "Light mode" : "Dark mode") : "Theme"}
        </Button>
      </div>
    </header>
  );
}
