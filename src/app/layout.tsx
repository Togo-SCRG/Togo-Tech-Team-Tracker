import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "Togo Tech Team Tracker",
  description: "Internal team productivity dashboard for the Togo tech team.",
  icons: {
    icon: [{ url: "/logo/togo.webp", type: "image/webp" }],
    shortcut: [{ url: "/logo/togo.webp", type: "image/webp" }],
  },
};

// Default zoom/scale = 100% (width=device-width, initial-scale=1) —
// explicit rather than relying on the browser's implicit default.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
