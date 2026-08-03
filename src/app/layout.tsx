import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "Togo Tech Hub",
  description: "Internal team productivity dashboard for the Togo tech team.",
  icons: {
    icon: [{ url: "/logo/togo.webp", type: "image/webp" }],
    shortcut: [{ url: "/logo/togo.webp", type: "image/webp" }],
  },
};

// Default zoom/scale = 100% (width=device-width, initial-scale=1) —
// explicit rather than relying on the browser's implicit default.
//
// colorScheme emits <meta name="color-scheme">, which the browser honours while
// parsing — before globals.css has loaded. Without it a cold load paints the
// default white canvas until the stylesheet arrives, which is why the site
// flashed light on a first visit and looked correct on reload (CSS cached).
// Dark first, so that's the canvas we get; the `light` fallback covers the
// scrollbars and form controls of anyone who has chosen light.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark light",
};

// Dark is the default, and it's set on <html> in the markup below rather than
// added by this script — so a first paint (or a session with JavaScript blocked,
// or a script that fails) is dark rather than light.
//
// All this script does is *remove* the class for someone who has chosen light.
// It runs before hydration, so that choice is applied on the first paint instead
// of flashing dark and snapping to light a moment later.
const themeInitScript = `
(function () {
  try {
    if (localStorage.getItem("togo-theme") === "light") {
      document.documentElement.classList.remove("dark");
    }
  } catch (e) {
    // localStorage can throw in private mode. Dark is already applied, which is
    // the default anyway, so there's nothing to recover from.
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning because the script above may have removed this
    // class before React hydrates, which would otherwise be reported as a
    // server/client mismatch.
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="bg-togo-black text-togo-white min-h-screen antialiased" suppressHydrationWarning>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
