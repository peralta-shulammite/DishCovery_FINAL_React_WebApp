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
            // 🆕 ROBUST FIX: Smart session management that handles multiple users gracefully
            (function() {
              try {
                const token = localStorage.getItem('token');
                const currentUserId = localStorage.getItem('currentUserId');
                const storedUserId = localStorage.getItem('userId');
                
                // Helper function to decode JWT token (basic decode, no verification)
                function decodeJWT(token) {
                  try {
                    const base64Url = token.split('.')[1];
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
                
                // Only clear data if there's a REAL security issue, not just different sessions
                if (token) {
                  // Decode token to get the actual user ID from the token
                  const tokenPayload = decodeJWT(token);
                  const tokenUserId = tokenPayload ? (tokenPayload.userId || tokenPayload.id || tokenPayload.sub) : null;
                  const tokenExp = tokenPayload ? (tokenPayload.exp * 1000) : null; // Convert to milliseconds
                  
                  // Check if token is expired
                  if (tokenExp && Date.now() > tokenExp) {
                    console.log('🧹 Token expired - clearing stale session');
                    localStorage.clear();
                    sessionStorage.clear();
                    return; // Exit early, don't reload
                  }
                  
                  // Only clear if token user ID doesn't match stored user ID (real security issue)
                  // This means the token is for a different user than what's stored
                  if (tokenUserId && storedUserId && tokenUserId.toString() !== storedUserId.toString()) {
                    console.log('🧹 Security: Token user ID (' + tokenUserId + ') does not match stored user ID (' + storedUserId + ') - clearing data');
                    localStorage.clear();
                    sessionStorage.clear();
                    return; // Exit early, don't reload
                  }
                  
                  // If token has user ID but no stored user ID, store it (normal case)
                  if (tokenUserId && !storedUserId) {
                    localStorage.setItem('userId', tokenUserId.toString());
                    localStorage.setItem('currentUserId', tokenUserId.toString());
                    console.log('✅ Stored user ID from token:', tokenUserId);
                  }
                  
                  // If currentUserId and storedUserId differ but token matches, just sync them
                  // This is normal when different people use the same credentials - each session is valid
                  if (currentUserId && storedUserId && currentUserId !== storedUserId) {
                    // Check if either matches the token
                    if (tokenUserId) {
                      if (currentUserId.toString() === tokenUserId.toString()) {
                        // currentUserId matches token, update storedUserId
                        localStorage.setItem('userId', currentUserId);
                        console.log('✅ Synced storedUserId to match currentUserId (from token)');
                      } else if (storedUserId.toString() === tokenUserId.toString()) {
                        // storedUserId matches token, update currentUserId
                        localStorage.setItem('currentUserId', storedUserId);
                        console.log('✅ Synced currentUserId to match storedUserId (from token)');
                      } else {
                        // Neither matches token - this is a real issue, but don't clear everything
                        // Just update to match token
                        localStorage.setItem('userId', tokenUserId.toString());
                        localStorage.setItem('currentUserId', tokenUserId.toString());
                        console.log('✅ Updated user IDs to match token');
                      }
                    } else {
                      // Can't decode token, but both IDs exist - just sync them (prefer currentUserId)
                      localStorage.setItem('userId', currentUserId);
                      console.log('✅ Synced user IDs (token decode failed, using currentUserId)');
                    }
                    // Don't clear or reload - just sync
                    return;
                  }
                  
                  // If token exists but no user data, try to extract from token
                  if (!currentUserId && !storedUserId && tokenUserId) {
                    localStorage.setItem('userId', tokenUserId.toString());
                    localStorage.setItem('currentUserId', tokenUserId.toString());
                    console.log('✅ Restored user ID from token');
                  }
                  
                  // If token exists but no user data and can't decode token, clear token (stale/invalid)
                  if (!currentUserId && !storedUserId && !tokenUserId) {
                    console.log('🧹 Token exists but invalid/can\'t decode - clearing stale session');
                    localStorage.removeItem('token');
                    // Don't clear everything, just the token
                  }
                } else {
                  // No token - only clear user data if it exists (stale data)
                  if (currentUserId || storedUserId) {
                    console.log('🧹 No token but user data exists - clearing stale data');
                    localStorage.removeItem('userId');
                    localStorage.removeItem('currentUserId');
                    // Don't clear everything, just user-related data
                  }
                }
              } catch (e) {
                console.warn('Error checking user data:', e);
                // Don't clear on error - be conservative
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
