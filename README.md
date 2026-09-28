# Pendientes

Aplicación web para controlar documentos y pendientes de los procesos **UGPA** y **UTET**.

## Qué incluye

- Catálogo inicial de 19 procesos y 59 documentos.
- Filtros por unidad, proceso, estado y búsqueda libre.
- Estados: Pendiente, En proceso, Bloqueado y Completado.
- Prioridad: Alta, Media y Baja.
- Fecha límite y detección visual de vencidos.
- Notas por cada pendiente.
- Edición y eliminación.
- Importación del catálogo sin duplicar documentos ya cargados.
- Exportación CSV de la vista filtrada.
- Sincronización en tiempo real con Cloud Firestore.
- Acceso con Firebase Authentication (correo y contraseña).
- Los pendientes **no se almacenan en localStorage**.

## Configuración de Firebase

La aplicación está preparada para GitHub Pages, pero necesita un proyecto Firebase para guardar los datos en la nube.

1. En Firebase Console, crea o usa un proyecto existente.
2. Agrega una aplicación **Web**.
3. Copia la configuración Web del proyecto.
4. Reemplaza los valores de `firebase-config.js`.
5. En **Authentication > Sign-in method**, habilita **Email/Password**.
6. Crea una base de datos **Cloud Firestore**.
7. Publica las reglas incluidas en `firestore.rules`.
8. En Authentication > Settings > Authorized domains, agrega `jeffer91.github.io` si no aparece.

## Reglas de Firestore

Cada usuario solo puede leer y modificar sus propios pendientes:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/pendientes/{pendingId} {
      allow read, create, update, delete: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Publicar en GitHub Pages

En el repositorio abre **Settings > Pages** y selecciona:

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/ (root)`

Luego la aplicación quedará disponible en:

`https://jeffer91.github.io/Pendiente/`

## Estructura

- `index.html`: interfaz principal.
- `styles.css`: estilos.
- `app.js`: autenticación, filtros, CRUD y sincronización Firestore.
- `catalog.js`: procesos y documentos UGPA/UTET.
- `firebase-config.js`: configuración del proyecto Firebase.
- `firestore.rules`: reglas recomendadas de seguridad.
