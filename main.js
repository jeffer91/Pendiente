const { app, BrowserWindow, ipcMain, shell, nativeImage } = require('electron');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

let mainWindow = null;
let db = null;

const APP_ICON_DATA_URL = 'data:image/png;base64,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';
const appIcon = nativeImage.createFromDataURL(APP_ICON_DATA_URL);

if (process.platform === 'win32') {
  app.setAppUserModelId('com.jeffer91.pendientes');
}

function nowIso() {
  return new Date().toISOString();
}

function openDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'pendientes.sqlite');
  db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS pendientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      catalogId TEXT UNIQUE,
      unit TEXT NOT NULL DEFAULT '',
      processCode TEXT NOT NULL DEFAULT '',
      processName TEXT NOT NULL DEFAULT '',
      processNote TEXT NOT NULL DEFAULT '',
      documentName TEXT NOT NULL,
      documentCode TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pendiente',
      priority TEXT NOT NULL DEFAULT 'media',
      dueDate TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'manual',
      sortOrder INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_pendientes_status ON pendientes(status);
    CREATE INDEX IF NOT EXISTS idx_pendientes_unit ON pendientes(unit);
    CREATE INDEX IF NOT EXISTS idx_pendientes_process ON pendientes(processCode);
  `);
  return dbPath;
}

function mapRow(row) {
  return {
    ...row,
    id: String(row.id)
  };
}

function registerDatabaseHandlers() {
  ipcMain.handle('db:get-info', () => ({
    path: path.join(app.getPath('userData'), 'pendientes.sqlite'),
    local: true
  }));

  ipcMain.handle('db:list', () => {
    const rows = db.prepare(`
      SELECT * FROM pendientes
      ORDER BY
        CASE status
          WHEN 'pendiente' THEN 1
          WHEN 'en_proceso' THEN 2
          WHEN 'bloqueado' THEN 3
          WHEN 'completado' THEN 4
          ELSE 5
        END,
        sortOrder ASC,
        updatedAt DESC
    `).all();
    return rows.map(mapRow);
  });

  ipcMain.handle('db:seed', (_event, items = []) => {
    if (!Array.isArray(items)) return { inserted: 0 };

    const insert = db.prepare(`
      INSERT OR IGNORE INTO pendientes (
        catalogId, unit, processCode, processName, processNote,
        documentName, documentCode, status, priority, dueDate,
        notes, source, sortOrder, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const timestamp = nowIso();
    let inserted = 0;
    db.exec('BEGIN');
    try {
      items.forEach((item, index) => {
        const result = insert.run(
          String(item.catalogId || ''),
          String(item.unit || ''),
          String(item.processCode || ''),
          String(item.processName || ''),
          String(item.processNote || ''),
          String(item.documentName || 'Documento'),
          String(item.documentCode || ''),
          'pendiente',
          'media',
          '',
          String(item.processNote || ''),
          'catalogo',
          index + 1,
          timestamp,
          timestamp
        );
        inserted += Number(result.changes || 0);
      });
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }

    return { inserted };
  });

  ipcMain.handle('db:create', (_event, payload = {}) => {
    const timestamp = nowIso();
    const result = db.prepare(`
      INSERT INTO pendientes (
        catalogId, unit, processCode, processName, processNote,
        documentName, documentCode, status, priority, dueDate,
        notes, source, sortOrder, createdAt, updatedAt
      ) VALUES (NULL, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, 'manual', 99999, ?, ?)
    `).run(
      String(payload.unit || ''),
      String(payload.processCode || ''),
      String(payload.processName || ''),
      String(payload.documentName || 'Pendiente'),
      String(payload.documentCode || ''),
      String(payload.status || 'pendiente'),
      String(payload.priority || 'media'),
      String(payload.dueDate || ''),
      String(payload.notes || ''),
      timestamp,
      timestamp
    );
    return { id: String(result.lastInsertRowid) };
  });

  ipcMain.handle('db:update', (_event, id, payload = {}) => {
    db.prepare(`
      UPDATE pendientes
      SET unit = ?, processCode = ?, processName = ?,
          documentName = ?, documentCode = ?, status = ?,
          priority = ?, dueDate = ?, notes = ?, updatedAt = ?
      WHERE id = ?
    `).run(
      String(payload.unit || ''),
      String(payload.processCode || ''),
      String(payload.processName || ''),
      String(payload.documentName || 'Pendiente'),
      String(payload.documentCode || ''),
      String(payload.status || 'pendiente'),
      String(payload.priority || 'media'),
      String(payload.dueDate || ''),
      String(payload.notes || ''),
      nowIso(),
      Number(id)
    );
    return { ok: true };
  });

  ipcMain.handle('db:delete', (_event, id) => {
    db.prepare('DELETE FROM pendientes WHERE id = ?').run(Number(id));
    return { ok: true };
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 880,
    minWidth: 980,
    minHeight: 650,
    show: false,
    backgroundColor: '#f5f7f8',
    icon: appIcon,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) app.dock.setIcon(appIcon);
  openDatabase();
  registerDatabaseHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  try {
    db?.close();
  } catch {}
});
