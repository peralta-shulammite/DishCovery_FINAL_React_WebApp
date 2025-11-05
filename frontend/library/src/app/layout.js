import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "DishCovery - Personalized Recipe Generator",
  description: "Generate personalized recipes from your ingredients",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DishCovery",
  }
};

// Add viewport export separately
export const viewport = {
  themeColor: "#2E7D32",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2E7D32" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="DishCovery" />
        
        {/* Windows 11 Icons */}
        <meta name="msapplication-square70x70logo" content="/windows11/SmallTile.scale-100.png" />
        <meta name="msapplication-square150x150logo" content="/windows11/Square150x150Logo.scale-100.png" />
        <meta name="msapplication-wide310x150logo" content="/windows11/Wide310x150Logo.scale-100.png" />
        <meta name="msapplication-square310x310logo" content="/windows11/LargeTile.scale-100.png" />
        
        {/* Android Icons */}
        <link rel="icon" type="image/png" sizes="192x192" href="/android/android-launchericon-192-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/android/android-launchericon-512-512.png" />
        
        {/* iOS Icons */}
        <link rel="apple-touch-icon" sizes="180x180" href="/ios/180.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/ios/152.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/ios/120.png" />
        
        {/* Favicon */}
        <link rel="icon" type="image/png" sizes="32x32" href="/ios/32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/ios/16.png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(
                  function(registration) {
                    console.log('Service Worker registered successfully:', registration.scope);
                  },
                  function(err) {
                    console.log('Service Worker registration failed:', err);
                  }
                );
              });
            }
          `
        }} />
      </body>
    </html>
  );
}
