import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import "@/app/globals.css";
import { router } from "@/src/router";
import { isNativeLocalizedRoute } from "@/lib/native-localized-routes";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing application root element");
}

function applyTranslationPolicy(pathname: string): void {
  const nativeLocale = isNativeLocalizedRoute(pathname);
  // Protect before React renders, including portals under body. Apply again
  // before client-side navigation from public pages; a mount effect is too late
  // when translation is already enabled in the browser.
  for (const element of [document.documentElement, document.body, rootElement!]) {
    element.translate = !nativeLocale;
    element.classList.toggle("notranslate", nativeLocale);
  }
}

applyTranslationPolicy(window.location.pathname);
router.subscribe("onBeforeNavigate", ({ toLocation }) => applyTranslationPolicy(toLocation.pathname));

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
