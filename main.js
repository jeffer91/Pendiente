const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

let mainWindow = null;
let db = null;

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
