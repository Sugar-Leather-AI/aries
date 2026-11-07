import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { BRAND_ID } from "./brand";
import AppErrorBoundary from "./components/AppErrorBoundary";
import { installErrorReporting } from "./lib/errorReporting";

// Brand tokens in index.css hang off this attribute (see src/brand).
document.documentElement.dataset.brand = BRAND_ID;

installErrorReporting();

createRoot(document.getElementById("root")!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>,
);
