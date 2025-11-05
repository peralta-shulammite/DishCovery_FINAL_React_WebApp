# ⚡ Quick Start - DishCovery PWA

## 🚨 MUST DO FIRST: Generate Icons

Your app needs 3 icon files. Choose ONE method:

### Method 1: Online Tool (Recommended) ⭐
1. Go to: https://realfavicongenerator.net/
2. Upload: `frontend/library/public/assets/LOGO.png`
3. Download icons
4. Save to: `frontend/library/public/`
   - icon-192.png
   - icon-512.png
   - icon-144.png

### Method 2: Command Line
```bash
cd frontend/library/public
magick assets/LOGO.png -resize 192x192 icon-192.png
magick assets/LOGO.png -resize 512x512 icon-512.png
magick assets/LOGO.png -resize 144x144 icon-144.png
```

---

## ▶️ Run Your PWA

```bash
cd frontend/library
npm run build
npm start
```

Visit: http://localhost:3000/user/home

---

## ✅ What You Get

### Install Prompt (Shows after 3 seconds)
```
┌──────────────────────────────────────┐
│ [Logo] Install DishCovery         [×]│
│        Get quick access to           │
│        personalized recipes!         │
│        [Install App]                 │
└──────────────────────────────────────┘
```

### Features
- ✅ Custom install prompt with your logo
- ✅ Green "Install App" button
- ✅ X button to close (reopens after 7 days)
- ✅ Offline support
- ✅ Add to home screen
- ✅ Works on all devices

---

## 📱 Test Install

### Desktop (Chrome)
1. Open: http://localhost:3000/user/home
2. Wait 3 seconds
3. Click "Install App" button

### Mobile (Android)
1. Deploy with HTTPS
2. Open in Chrome
3. Tap "Install App"

### iPhone (iOS)
1. Open in Safari
2. Tap Share → "Add to Home Screen"

---

## 🎨 Customize

### Change prompt delay (page.jsx:95)
```javascript
setTimeout(() => setDishCoveryShowPWAPrompt(true), 3000); // 3 seconds
```

### Change re-show time (page.jsx:94)
```javascript
7 * 24 * 60 * 60 * 1000  // 7 days
```

---

## 🐛 Not Working?

1. **No install prompt?**
   - Generate icons first!
   - Clear cache (Ctrl+Shift+Delete)
   - Use localhost or HTTPS

2. **Service worker error?**
   - F12 → Console → Check errors
   - Application → Service Workers → Unregister

3. **Icons missing?**
   - Check files exist in `/public/`
   - Names: `icon-192.png`, `icon-512.png`, `icon-144.png`

---

## 📁 Files Modified

```
frontend/library/
├── public/
│   ├── manifest.json          ✅ Created
│   ├── sw.js                  ✅ Created
│   ├── offline.html           ✅ Created
│   ├── icon-192.png           ⚠️ YOU CREATE
│   ├── icon-512.png           ⚠️ YOU CREATE
│   └── icon-144.png           ⚠️ YOU CREATE
├── src/app/
│   ├── layout.js              ✅ Modified
│   └── user/home/
│       ├── page.jsx           ✅ Modified
│       └── styles.css         ✅ Modified
```

---

## 🎯 Next Steps

1. ✅ Generate icons (see above)
2. ✅ Test locally
3. ✅ Deploy with HTTPS
4. ✅ Test on mobile devices
5. ✅ Run Lighthouse audit (should score 100/100)

---

**Full Guide:** See `PWA_IMPLEMENTATION_GUIDE.md`

**Questions?** Check the troubleshooting section in the full guide.
