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

// Runs before hydration so the correct theme class is present on first
// paint — otherwise the page would flash the default theme and then
// snap to the user's stored preference.
const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem("togo-theme");
    var theme = stored === "light" || stored === "dark" ? stored : "dark";
    document.documentElement.classList.toggle("dark", theme === "dark");
  } catch (e) {
    document.documentElement.classList.add("dark");
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="bg-togo-black text-togo-white min-h-screen antialiased" suppressHydrationWarning>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
