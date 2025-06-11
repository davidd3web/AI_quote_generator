import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/themes-provider";

export const metadata: Metadata = {
  title: "Generate AI Quote",
  description: "Generate a quote from a famour person or yours using AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="h-screen">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
