import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { Toaster } from "sonner";
import App from "./App";
import "./index.css";
const url = new URLSearchParams(location.search).has("preview")
  ? undefined
  : import.meta.env.VITE_CONVEX_URL;
const app = (
  <>
    <App connected={Boolean(url)} />
    <Toaster richColors />
  </>
);
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {url ? (
      <ConvexAuthProvider client={new ConvexReactClient(url)}>
        {app}
      </ConvexAuthProvider>
    ) : (
      app
    )}
  </StrictMode>,
);
