import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Epilogue, Inter } from "next/font/google";
import "./globals.css";
import "./landing.css";
import "./dashboard.css";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { buildPageMetadata, OG_IMAGES, SITE_URL } from "@/lib/siteMetadata";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const epilogue = Epilogue({
  variable: "--font-epilogue",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const defaultTitle =
  "AI Recruiting OS for Sourcing, Outreach & Hiring Automation | Huntlo AI";
const defaultDescription =
  "Hire faster with Agentic AI candidate sourcing, automated outreach across email and WhatsApp, AI voice screening, interview scheduling, and access to the EarlyJobs recruiter network.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: defaultTitle,
  description: defaultDescription,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/favicon.png",
  },
  ...buildPageMetadata({
    title: defaultTitle,
    description: defaultDescription,
    ogImage: OG_IMAGES.platform,
  }),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${epilogue.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""}>
          {children}
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
