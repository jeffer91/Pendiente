# Pendientes

Aplicación de escritorio en **Electron** para controlar documentos y pendientes de los procesos **UGPA** y **UTET**.

## Ejecutar en Windows

Después de clonar el repositorio:

```powershell
cd C:\Users\ITSQMET\Desktop\Pendiente
git pull origin main
npm install
npm start
```

La aplicación se abre en una ventana de Electron.

## Qué incluye

- Catálogo inicial de 19 procesos y 59 documentos.
- Filtros por unidad, proceso, estado y búsqueda libre.
- Estados: Pendiente, En proceso, Bloqueado y Completado.
- Prioridades: Alta, Media y Baja.
- Fecha límite y detección visual de vencidos.
- Notas por cada pendiente.
- Edición y eliminación.
- Importación del catálogo sin duplicar documentos ya cargados.
- Exportación CSV.
- Sincronización en tiempo real con Cloud Firestore.
- Acceso con Firebase Authentication.
- Los datos de los pendientes no se guardan en `localStorage`.

## Arquitectura

- Electron: aplicación de escritorio.
- HTML/CSS/JavaScript: interfaz.
- Firebase Authentication: acceso de usuarios.
- Cloud Firestore: almacenamiento y sincronización en línea.
- `contextIsolation: true`.
- `nodeIntegration: false`.
- `sandbox: true`.

## Configuración de Firebase

Para que el guardado en la nube funcione, configura `firebase-config.js` con los datos de una aplicación Web de Firebase:

```js
export const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

Luego:

1. Habilita **Email/Password** en Firebase Authentication.
2. Crea una base de datos **Cloud Firestore**.
3. Publica las reglas incluidas en `firestore.rules`.

## Estructura

- `package.json`: scripts y dependencia de Electron.
- `main.js`: proceso principal de Electron.
- `preload.js`: preload aislado.
- `index.html`: interfaz principal.
- `styles.css`: estilos.
- `app.js`: autenticación, filtros, CRUD y sincronización Firestore.
- `catalog.js`: procesos y documentos UGPA/UTET.
- `firebase-config.js`: configuración del proyecto Firebase.
- `firestore.rules`: reglas de seguridad.

## Comandos

Instalar:

```powershell
npm install
```

Abrir la aplicación:

```powershell
npm start
```

Para descargar cambios nuevos desde GitHub:

```powershell
git pull origin main
```
