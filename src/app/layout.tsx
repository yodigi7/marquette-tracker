import { Link, Outlet, useLocation } from "react-router";
import { MenuIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Calendar" },
  { to: "/status", label: "Status" },
  { to: "/history", label: "History" },
  { to: "/settings", label: "Settings" },
];

export function RootLayout() {
  const { pathname } = useLocation();

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  const navLinkClass = (to: string) =>
    cn(
      "hover:text-foreground transition-colors",
      isActive(to) ? "font-medium text-foreground" : "text-muted-foreground",
    );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="flex items-center justify-between px-4 py-3 md:hidden">
          <span className="font-semibold">Marquette Tracker</span>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation">
                <MenuIcon />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <nav className="flex flex-col px-2 py-4">
                {NAV_ITEMS.map((item) => (
                  <SheetClose key={item.to} asChild>
                    <Link
                      to={item.to}
                      aria-current={isActive(item.to) ? "page" : undefined}
                      className={cn(navLinkClass(item.to), "py-3 text-base")}
                    >
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
        <nav className="hidden items-center gap-4 px-4 py-3 md:flex">
          <span className="font-semibold">Marquette Tracker</span>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex gap-3 text-sm">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                aria-current={isActive(item.to) ? "page" : undefined}
                className={navLinkClass(item.to)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <main className="flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
