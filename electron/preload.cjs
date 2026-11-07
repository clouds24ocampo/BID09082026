'use strict';
// Minimal, read-only bridge. The renderer gets no Node access; it only learns it runs in the desktop shell.
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('bidocsDesktop', Object.freeze({
  platform: process.platform,
  isDesktop: true,
}));

window.addEventListener('DOMContentLoaded', () => {
  document.documentElement.classList.add('is-desktop-app');
});
