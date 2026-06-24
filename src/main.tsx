import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { bootstrapRecoveryRedirect } from "@/lib/auth-recovery";
import App from "./App";
import "./index.css";

bootstrapRecoveryRedirect();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
