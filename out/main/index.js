"use strict";
const electron = require("electron");
const path = require("path");
const url = require("url");
const promises = require("fs/promises");
const uuid = require("uuid");
const fs = require("fs");
const is = {
  dev: !electron.app.isPackaged
};
const platform = {
  isWindows: process.platform === "win32",
  isMacOS: process.platform === "darwin",
  isLinux: process.platform === "linux"
};
const electronApp = {
  setAppUserModelId(id) {
    if (platform.isWindows)
      electron.app.setAppUserModelId(is.dev ? process.execPath : id);
  },
  setAutoLaunch(auto) {
    if (platform.isLinux)
      return false;
    const isOpenAtLogin = () => {
      return electron.app.getLoginItemSettings().openAtLogin;
    };
    if (isOpenAtLogin() !== auto) {
      electron.app.setLoginItemSettings({
        openAtLogin: auto,
        path: process.execPath
      });
      return isOpenAtLogin() === auto;
    } else {
      return true;
    }
  },
  skipProxy() {
    return electron.session.defaultSession.setProxy({ mode: "direct" });
  }
};
const optimizer = {
  watchWindowShortcuts(window, shortcutOptions) {
    if (!window)
      return;
    const { webContents } = window;
    const { escToCloseWindow = false, zoom = false } = shortcutOptions || {};
    webContents.on("before-input-event", (event, input) => {
      if (input.type === "keyDown") {
        if (!is.dev) {
          if (input.code === "KeyR" && (input.control || input.meta))
            event.preventDefault();
        } else {
          if (input.code === "F12") {
            if (webContents.isDevToolsOpened()) {
              webContents.closeDevTools();
            } else {
              webContents.openDevTools({ mode: "undocked" });
              console.log("Open dev tool...");
            }
          }
        }
        if (escToCloseWindow) {
          if (input.code === "Escape" && input.key !== "Process") {
            window.close();
            event.preventDefault();
          }
        }
        if (!zoom) {
          if (input.code === "Minus" && (input.control || input.meta))
            event.preventDefault();
          if (input.code === "Equal" && input.shift && (input.control || input.meta))
            event.preventDefault();
        }
      }
    });
  },
  registerFramelessWindowIpc() {
    electron.ipcMain.on("win:invoke", (event, action) => {
      const win = electron.BrowserWindow.fromWebContents(event.sender);
      if (win) {
        if (action === "show") {
          win.show();
        } else if (action === "showInactive") {
          win.showInactive();
        } else if (action === "min") {
          win.minimize();
        } else if (action === "max") {
          const isMaximized = win.isMaximized();
          if (isMaximized) {
            win.unmaximize();
          } else {
            win.maximize();
          }
        } else if (action === "close") {
          win.close();
        }
      }
    });
  }
};
function registerIpcHandlers() {
  electron.ipcMain.handle("dialog:openImages", async () => {
    const result = await electron.dialog.showOpenDialog({
      properties: ["openFile", "multiSelections"],
      filters: [
        { name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }
      ]
    });
    if (result.canceled) return [];
    return result.filePaths.map((fp) => ({
      id: uuid.v4(),
      path: fp,
      name: path.basename(fp),
      type: "image"
    }));
  });
  electron.ipcMain.handle("dialog:openAudio", async () => {
    const result = await electron.dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [
        { name: "Audio", extensions: ["mp3", "wav", "ogg", "m4a"] }
      ]
    });
    if (result.canceled) return null;
    return {
      id: uuid.v4(),
      path: result.filePaths[0],
      name: path.basename(result.filePaths[0]),
      type: "audio"
    };
  });
  electron.ipcMain.handle("file:readAsBase64", async (_event, filePath) => {
    const buffer = await promises.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    let mime = "application/octet-stream";
    if (ext === ".png") mime = "image/png";
    else if (ext === ".jpg" || ext === ".jpeg") mime = "image/jpeg";
    else if (ext === ".webp") mime = "image/webp";
    else if (ext === ".mp3") mime = "audio/mpeg";
    else if (ext === ".wav") mime = "audio/wav";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  });
  electron.ipcMain.handle("file:readBuffer", async (_event, filePath) => {
    let targetPath = filePath;
    if (filePath.startsWith("media://")) targetPath = filePath.slice("media://".length);
    if (filePath.startsWith("file://")) targetPath = new URL(filePath).pathname.replace(/^\/([A-Z]:)/, "$1");
    let finalPath = targetPath;
    try {
      await promises.access(targetPath);
    } catch {
      try {
        finalPath = decodeURIComponent(targetPath);
        await promises.access(finalPath);
      } catch {
        finalPath = targetPath;
      }
    }
    const buffer = await promises.readFile(finalPath);
    return new Uint8Array(buffer);
  });
  electron.ipcMain.handle("file:readDataUrl", async (_event, filePath) => {
    let targetPath = filePath;
    if (filePath.startsWith("media://")) targetPath = filePath.slice("media://".length);
    let finalPath = targetPath;
    try {
      await promises.access(targetPath);
    } catch {
      try {
        finalPath = decodeURIComponent(targetPath);
        await promises.access(finalPath);
      } catch {
        finalPath = targetPath;
      }
    }
    const buffer = await promises.readFile(finalPath);
    const ext = finalPath.split(".").pop()?.toLowerCase();
    let mime = "audio/mpeg";
    if (ext === "wav") mime = "audio/wav";
    else if (ext === "m4a") mime = "audio/mp4";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  });
  electron.ipcMain.handle("app:getDataPath", () => {
    return electron.app.getPath("userData");
  });
  electron.ipcMain.handle("project:save", async (_event, data) => {
    const result = await electron.dialog.showSaveDialog({
      filters: [{ name: "SpeedRamp Project", extensions: ["speedramp"] }],
      defaultPath: "untitled.speedramp"
    });
    if (result.canceled || !result.filePath) return false;
    await promises.writeFile(result.filePath, data, "utf-8");
    return result.filePath;
  });
  electron.ipcMain.handle("project:load", async () => {
    const result = await electron.dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "SpeedRamp Project", extensions: ["speedramp"] }]
    });
    if (result.canceled) return null;
    const data = await promises.readFile(result.filePaths[0], "utf-8");
    return { path: result.filePaths[0], data: JSON.parse(data) };
  });
  electron.ipcMain.handle("dialog:saveExport", async () => {
    const result = await electron.dialog.showSaveDialog({
      filters: [{ name: "MP4 Video", extensions: ["mp4"] }],
      defaultPath: "speedramp-export.mp4"
    });
    if (result.canceled || !result.filePath) return null;
    return result.filePath;
  });
  electron.ipcMain.handle("settings:getPath", () => {
    return path.join(electron.app.getPath("userData"), "settings.json");
  });
  electron.ipcMain.handle("project:export", async (_event, options) => {
    const { exportVideo } = await Promise.resolve().then(() => require("./ffmpeg.service-D-_9lBXd.js"));
    return exportVideo(options);
  });
  electron.ipcMain.handle("settings:save", async (_event, settings) => {
    const settingsPath = path.join(electron.app.getPath("userData"), "settings.json");
    await promises.writeFile(settingsPath, settings, "utf-8");
    return true;
  });
  electron.ipcMain.handle("settings:load", async () => {
    const settingsPath = path.join(electron.app.getPath("userData"), "settings.json");
    if (!fs.existsSync(settingsPath)) return null;
    const data = await promises.readFile(settingsPath, "utf-8");
    return JSON.parse(data);
  });
}
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#0d0d1a",
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#0d0d1a",
      symbolColor: "#e0e0e0",
      height: 36
    },
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.protocol.registerSchemesAsPrivileged([
  { scheme: "media", privileges: { secure: true, standard: true, supportFetchAPI: true, stream: true } }
]);
electron.app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.speedramp.ai");
  electron.app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });
  electron.protocol.handle("media", (request) => {
    let path2 = decodeURIComponent(request.url.slice("media://".length));
    if (path2.startsWith("/")) path2 = path2.slice(1);
    return electron.net.fetch(url.pathToFileURL(path2).toString());
  });
  registerIpcHandlers();
  createWindow();
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
