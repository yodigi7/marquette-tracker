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

/**
 * The title is a shortcut home, not a primary destination and not a current-page marker, so it
 * carries no `aria-current` — the Calendar nav item owns that.
 *
 * It also carries no hover, focus, or active styling. The title already rests at full foreground,
 * so the nav links' brighten-on-hover cannot apply to it, and the owner chose that the title change
 * no visual styling at all rather than substitute a different cue. The class is deliberately only
 * what it has always been, so a later change to the top bar's appearance is a conscious decision.
 */
const TITLE_CLASS = "font-semibold";

function AppTitle() {
  return (
    <Link to="/" className={TITLE_CLASS}>
      Marquette Tracker
    </Link>
  );
}

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
      {/* Print-hidden: a document route prints on its own, with no navigation on the paper. */}
      <header className="print:hidden border-b">
        <div className="flex items-center justify-between px-4 py-3 md:hidden">
          <AppTitle />
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
        {/* The title is deliberately outside the <nav>: it is a brand link to the root route, not
            one of the four primary destinations, so the nav landmark stays exactly those four. */}
        <div className="hidden items-center gap-4 px-4 py-3 md:flex">
          <AppTitle />
          <Separator orientation="vertical" className="h-5" />
          <nav className="flex gap-3 text-sm">
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
          </nav>
        </div>
      </header>
      <main className="flex-1 px-4 py-6 print:p-0">
        <Outlet />
      </main>
    </div>
  );
}
