import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function Header() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  function toggleTheme() {
    if (!mounted) {
      return;
    }

    setTheme(isDark ? "light" : "dark");
  }

  return (
    <header className="border-b border-border/80 bg-card/80 text-foreground backdrop-blur supports-backdrop-filter:bg-card/70">
      <div className="container mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <nav className="flex items-center gap-4 text-sm font-medium">
          <a href="/" className="transition-colors hover:text-foreground/80">
            Home
          </a>
          <a href="/studio" className="transition-colors hover:text-foreground/80">
            Studio (Prisma)
          </a>
          <a href="/studio-new" className="transition-colors hover:text-foreground/80">
            Studio New (Enhanced)
          </a>
        </nav>
        <Button variant="outline" size="sm" onClick={toggleTheme}>
          {mounted ? (isDark ? "Light mode" : "Dark mode") : "Theme"}
        </Button>
      </div>
    </header>
  );
}
