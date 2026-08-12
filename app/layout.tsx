import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tesfa Loan | Finance Your Future",
  description: "A secure, simple and transparent way to apply for a loan and follow every step.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
