import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tesfa Loan | The Next Chapter Starts Here",
  description: "Digital lending built on trust: apply securely, verify your identity, and track every stage.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
