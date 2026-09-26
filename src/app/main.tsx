import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router";
import "@/index.css";
import { Providers } from "@/app/providers";
import { AppRouter } from "@/app/router";

export function App() {
  return (
    <StrictMode>
      <HashRouter>
        <Providers>
          <AppRouter />
        </Providers>
      </HashRouter>
    </StrictMode>
  );
}

const root = document.getElementById("root");

if (root) {
  createRoot(root).render(<App />);
}
