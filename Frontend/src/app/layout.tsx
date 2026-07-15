import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { Epilogue, Inter } from "next/font/google";
import "./globals.css";
import "./landing.css";
import "./dashboard.css";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthSessionGuard } from "@/components/AuthSessionGuard";
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
        <Script
          id="reb2b-loader"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `!function(key) {if (window.reb2b) return;window.reb2b = {loaded: true};var s = document.createElement("script");s.async = true;s.src = "https://ddwl4m2hdecbv.cloudfront.net/b/" + key + "/" + key + ".js.gz";document.getElementsByTagName("script")[0].parentNode.insertBefore(s, document.getElementsByTagName("script")[0]);}("1N5W0H7Y82O5");`,
          }}
        />
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""}>
          <AuthSessionGuard />
          {children}
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
