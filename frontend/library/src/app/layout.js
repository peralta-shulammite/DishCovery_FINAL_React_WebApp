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
            // 🆕 FIX: Clear stale user data on every page load to prevent random user instances
            (function() {
              try {
                const token = localStorage.getItem('token');
                const currentUserId = localStorage.getItem('currentUserId');
                const storedUserId = localStorage.getItem('userId');
                
                // If we have a token, verify it matches stored user data
                if (token) {
                  // If there's a mismatch between currentUserId and stored userId, clear everything
                  if (currentUserId && storedUserId && currentUserId !== storedUserId) {
                    console.log('🧹 Detected user mismatch - clearing all data');
                    localStorage.clear();
                    sessionStorage.clear();
                    // Force page reload to get fresh data
                    window.location.reload();
                    return;
                  }
                  
                  // If token exists but no user data, clear token (stale session)
                  if (!currentUserId && !storedUserId) {
                    console.log('🧹 Token exists but no user data - clearing stale session');
                    localStorage.clear();
                    sessionStorage.clear();
                  }
                } else {
                  // No token but user data exists - clear it
                  if (currentUserId || storedUserId) {
                    console.log('🧹 No token but user data exists - clearing stale data');
                    localStorage.clear();
                    sessionStorage.clear();
                  }
                }
              } catch (e) {
                console.warn('Error checking user data:', e);
              }
            })();
            
            if ('serviceWorker' in navigator) {
              // Prevent multiple registrations
              if (window.serviceWorkerRegistered) {
                return;
              }
              
              window.addEventListener('load', function() {
                // Unregister ALL old service workers first to force fresh start
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  // Unregister all old service workers
                  return Promise.all(registrations.map(function(registration) {
                    console.log('Unregistering old Service Worker:', registration.scope);
                    return registration.unregister();
                  }));
                }).then(function() {
                  // Clear all caches
                  if ('caches' in window) {
                    return caches.keys().then(function(cacheNames) {
                      return Promise.all(cacheNames.map(function(cacheName) {
                        console.log('Clearing cache:', cacheName);
                        return caches.delete(cacheName);
                      }));
                    });
                  }
                }).then(function() {
                  // Wait a bit before registering new service worker
                  return new Promise(function(resolve) {
                    setTimeout(resolve, 100);
                  });
                }).then(function() {
                  // Register new service worker
                  return navigator.serviceWorker.register('/sw.js', { scope: '/' });
                }).then(function(registration) {
                  console.log('Service Worker registered successfully:', registration.scope);
                  window.serviceWorkerRegistered = true;
                  
                  // Force update on next page load
                  registration.update();
                }).catch(function(err) {
                  // Handle abort errors gracefully (page navigation during registration)
                  if (err.name === 'AbortError' || err.message.includes('aborted')) {
                    console.log('Service Worker registration aborted (page navigation)');
                    return;
                  }
                  // Only log actual errors
                  if (err.name !== 'AbortError') {
                    console.warn('Service Worker registration failed:', err.name, err.message);
                  }
                });
              });
            }
          `
        }} />
      </body>
    </html>
  );
}
