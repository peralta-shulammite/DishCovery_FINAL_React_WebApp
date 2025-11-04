'use client';
import { useEffect } from 'react';

export default function SWRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(() => console.log('SW registered'))
        .catch((err) => console.error('SW register failed', err));
    }

    const handleBeforeInstallPrompt = (e) => {
      console.log('beforeinstallprompt event:', e);
      e.preventDefault(); // keep it for later
      // stash so other components can access it even if they mount later
      window.deferredBeforeInstallPrompt = e;
      // notify components that install is available
      window.dispatchEvent(new Event('pwaBeforeInstallPrompt'));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);
  return null;
}