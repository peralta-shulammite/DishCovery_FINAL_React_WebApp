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
    <html lang="en" style={{ colorScheme: 'light' }} data-theme="light">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2E7D32" />
        <meta name="color-scheme" content="light" />
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
            // FORCE LIGHT MODE - Disable dark mode completely (client-side only)
            if (typeof window !== 'undefined') {
              (function() {
                // Force light mode on HTML element (only style, no attributes to avoid hydration mismatch)
                document.documentElement.style.colorScheme = 'light';
                
                // Override prefers-color-scheme media query
                const style = document.createElement('style');
                style.textContent = \`
                  :root {
                    color-scheme: light !important;
                  }
                  html {
                    color-scheme: light !important;
                  }
                  body {
                    background-color: #ffffff !important;
                    color: #171717 !important;
                  }
                  @media (prefers-color-scheme: dark) {
                    :root {
                      color-scheme: light !important;
                      --background: #ffffff !important;
                      --foreground: #171717 !important;
                    }
                    html {
                      color-scheme: light !important;
                    }
                    body {
                      background-color: #ffffff !important;
                      color: #171717 !important;
                    }
                  }
                \`;
                document.head.appendChild(style);
              })();
            }
            
            // 🆕 BULLETPROOF FIX: Ultra-conservative session management - NEVER auto-logout unless token is expired
            // ✅ iOS FIX: Handle localStorage errors gracefully (private browsing, quota exceeded, etc.)
            (function() {
              try {
                // ✅ iOS FIX: Test localStorage availability first
                const testKey = '__localStorage_test__';
                try {
                  localStorage.setItem(testKey, 'test');
                  localStorage.removeItem(testKey);
                } catch (e) {
                  // iOS Safari private browsing or storage quota exceeded
                  console.warn('⚠️ localStorage not available (iOS private browsing or quota exceeded):', e.message);
                  // Don't proceed with session management if storage is unavailable
                  return;
                }
                
                const token = localStorage.getItem('token');
                const currentUserId = localStorage.getItem('currentUserId');
                const storedUserId = localStorage.getItem('userId');
                
                // Helper function to decode JWT token (basic decode, no verification)
                function decodeJWT(token) {
                  try {
                    if (!token || typeof token !== 'string') return null;
                    const parts = token.split('.');
                    if (parts.length !== 3) return null;
                    const base64Url = parts[1];
                    if (!base64Url) return null;
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                    }).join(''));
                    return JSON.parse(jsonPayload);
                  } catch (e) {
                    return null;
                  }
                }
                
                // ONLY clear data if token is expired - that's the ONLY reason to clear
                if (token) {
                  // Decode token to get the actual user ID from the token
                  const tokenPayload = decodeJWT(token);
                  const tokenUserId = tokenPayload ? (tokenPayload.userId || tokenPayload.id || tokenPayload.sub) : null;
                  const tokenExp = tokenPayload && tokenPayload.exp ? (tokenPayload.exp * 1000) : null; // Convert to milliseconds
                  
                  // ONLY clear if token is expired - this is the ONLY security check
                  if (tokenExp && Date.now() > tokenExp) {
                    console.log('🧹 Token expired - clearing expired session');
                    try {
                      localStorage.removeItem('token');
                      localStorage.removeItem('userId');
                      localStorage.removeItem('currentUserId');
                    } catch (e) {
                      console.warn('⚠️ Could not clear expired token (storage issue):', e.message);
                    }
                    // Don't clear everything - just user-related data
                    return; // Exit early, don't reload
                  }
                  
                  // If token is valid, always sync user IDs to match token (never clear)
                  if (tokenUserId) {
                    // Always update user IDs to match token - this is safe and correct
                    try {
                      localStorage.setItem('userId', tokenUserId.toString());
                      localStorage.setItem('currentUserId', tokenUserId.toString());
                    } catch (e) {
                      console.warn('⚠️ Could not sync user IDs (storage issue):', e.message);
                    }
                    // Silently sync - don't log unless there's a change
                    if (storedUserId && storedUserId.toString() !== tokenUserId.toString()) {
                      console.log('✅ Synced user IDs to match token (user: ' + tokenUserId + ')');
                    }
                  } else if (!tokenUserId && (currentUserId || storedUserId)) {
                    // Can't decode token but user IDs exist - keep them, don't clear
                    // Token might be valid but in different format - trust the stored IDs
                    try {
                      if (currentUserId && !storedUserId) {
                        localStorage.setItem('userId', currentUserId);
                      } else if (storedUserId && !currentUserId) {
                        localStorage.setItem('currentUserId', storedUserId);
                      }
                    } catch (e) {
                      console.warn('⚠️ Could not sync user IDs (storage issue):', e.message);
                    }
                    // Don't clear anything - be conservative
                  }
                  
                  // If no user IDs but token exists and can decode, store from token
                  if (!currentUserId && !storedUserId && tokenUserId) {
                    try {
                      localStorage.setItem('userId', tokenUserId.toString());
                      localStorage.setItem('currentUserId', tokenUserId.toString());
                      console.log('✅ Restored user ID from token: ' + tokenUserId);
                    } catch (e) {
                      console.warn('⚠️ Could not restore user ID (storage issue):', e.message);
                    }
                  }
                  
                  // If token exists but can't decode and no user data, just keep token
                  // Don't clear - token might be valid in different format
                  // The backend will validate it anyway
                } else {
                  // No token - only clear user IDs if they exist (but keep other data)
                  if (currentUserId || storedUserId) {
                    try {
                      localStorage.removeItem('userId');
                      localStorage.removeItem('currentUserId');
                    } catch (e) {
                      console.warn('⚠️ Could not clear user IDs (storage issue):', e.message);
                    }
                    // Don't clear everything - just user-related data
                  }
                }
              } catch (e) {
                console.warn('Error checking user data:', e);
                // NEVER clear on error - be ultra-conservative
                // Errors might be temporary - don't log out user
              }
            })();
            
            if ('serviceWorker' in navigator) {
              // Prevent multiple registrations
              if (window.serviceWorkerRegistered) {
                // Already registered, skip
              } else {
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
            }
          `
        }} />
      </body>
    </html>
  );
}
