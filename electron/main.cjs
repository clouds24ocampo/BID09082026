'use strict';
/**
 * BiDOCS desktop shell (Electron).
 * Loads the built web app from disk (or the Vite dev server in development).
 * Security: context isolation on, node integration off, sandboxed renderer,
 * navigation locked to the app, external links open in the system browser.
 */
const { app, BrowserWindow, Menu, shell, session, dialog } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const DEV_URL = process.env.BIDOCS_DEV_URL; // e.g. http://localhost:3001 (set by `npm run desktop:dev`)
const isMac = process.platform === 'darwin';

// One instance only: a second launch focuses the existing window.
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let mainWindow = null;

// The only document the window may ever show: the built index.html (hash and query ignored).
const APP_FILE_URL = pathToFileURL(path.join(__dirname, '..', 'dist', 'index.html')).href;

function isAppUrl(url) {
  try {
    const u = new URL(url);
    if (DEV_URL) return u.origin === new URL(DEV_URL).origin;
    return u.protocol === 'file:' && pathToFileURL(decodeURIComponent(u.pathname.replace(/^\/([A-Za-z]:)/, '$1'))).href === APP_FILE_URL;
  } catch {
    return false;
  }
}

// Sub-frames (PDF previews) may use inline data:/blob: documents, nothing else outside the app.
function isAllowedFrameUrl(url) {
  return url === 'about:blank' || /^(data|blob):/i.test(url) || isAppUrl(url);
}

// Same policy as the web build (netlify.toml / server.js), adapted so file:// assets load.
const CSP = [
  "default-src 'self' file:",
  "script-src 'self' file:",
  "style-src 'self' 'unsafe-inline' file: https://fonts.googleapis.com",
  "font-src 'self' file: https://fonts.gstatic.com data:",
  "img-src 'self' file: data: blob: https:",
  "connect-src 'self' file: https:",
  "frame-src 'self' file: data: blob: https://drive.google.com",
  "object-src 'self' data: blob:",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 360,
    minHeight: 600,
    show: false,
    backgroundColor: '#030712',
    title: 'BiDOCS',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Keep navigation inside the app; send everything else to the OS browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  const guard = (event, url) => {
    if (!isAppUrl(url)) {
      event.preventDefault(); // also blocks files dropped onto the window
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  };
  mainWindow.webContents.on('will-navigate', guard);
  mainWindow.webContents.on('will-redirect', guard);
  mainWindow.webContents.on('will-frame-navigate', (event) => {
    if (event.isMainFrame) return guard(event, event.url);
    if (!isAllowedFrameUrl(event.url)) {
      event.preventDefault();
      if (/^https?:\/\//i.test(event.url)) shell.openExternal(event.url);
    }
  });

  if (DEV_URL) {
    mainWindow.loadURL(DEV_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    if (code === -3) return; // aborted navigation
    dialog.showErrorBox('BiDOCS could not load', `${desc} (${code})\n${url}`);
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

function buildMenu() {
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        ...(DEV_URL ? [{ type: 'separator' }, { role: 'toggleDevTools' }] : []),
      ],
    },
    { role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  // Deny every permission request (camera, mic, geolocation, notifications...) - the app needs none.
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));

  if (!DEV_URL) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [CSP] } });
    });
  }

  buildMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});
