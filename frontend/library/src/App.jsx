import React, { useEffect, useState } from 'react';

function App() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault(); // prevent automatic Chrome mini-infobar
      setDeferredPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const onInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowInstall(false);
    console.log('PWA install choice:', choice);
  };

  return (
    <div>
      {/* ...existing UI... */}
      {showInstall && <button onClick={onInstallClick}>Install App</button>}
    </div>
  );
}

export default App;