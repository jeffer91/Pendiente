# Pendientes

Aplicación de escritorio en **Electron** para controlar documentos y pendientes de los procesos **UGPA** y **UTET**.

## Ejecutar en Windows

```powershell
cd C:\Users\ITSQMET\Desktop\Pendiente
git pull origin main
npm install
npm start
```

La aplicación abre directamente: **no tiene pantalla de login**.

## Guardado

- Los pendientes no se guardan en `localStorage`.
- Los datos se almacenan en **Cloud Firestore**.
- La aplicación inicia una sesión anónima de Firebase automáticamente en segundo plano.
- Todos los equipos conectados al mismo proyecto Firebase consultan la misma colección `pendientes`.

## Configurar Firebase

Completa `firebase-config.js` con la configuración Web de tu proyecto Firebase:

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

Después, en Firebase Console:

1. Ve a **Authentication > Sign-in method**.
2. Habilita **Anonymous / Anónimo**. No hace falta Email/Password.
3. Crea **Cloud Firestore**.
4. Publica las reglas incluidas en `firestore.rules`.

## Funciones

- Catálogo de procesos y documentos UGPA/UTET.
- Nuevo pendiente.
- Edición y eliminación.
- Estados y prioridades.
- Fechas límite y vencidos.
- Notas.
- Búsqueda y filtros.
- Indicadores.
- Carga del catálogo sin duplicados.
- Exportación CSV.
- Sincronización en tiempo real.

## Electron

- `npm install`: instala Electron.
- `npm start`: abre la aplicación.
- `contextIsolation: true`.
- `nodeIntegration: false`.
- `sandbox: true`.
