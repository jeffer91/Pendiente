# Pendientes

Aplicación de escritorio en **Electron** para controlar los documentos y pendientes de los procesos **UGPA** y **UTET**.

## Ejecutar

En Windows:

```powershell
cd C:\Users\ITSQMET\Desktop\Pendiente
git pull origin main
npm install
npm start
```

## Base de datos local

La aplicación ya no usa Firebase ni almacenamiento en línea.

Los datos se guardan en una base **SQLite local** llamada:

`pendientes.sqlite`

Electron la crea automáticamente dentro de la carpeta de datos de la aplicación del usuario. No se utiliza `localStorage`.

## Pendientes iniciales

En el primer inicio, la base se llena automáticamente con el catálogo que tenemos de los manuales UGPA y UTET:

- **19 procesos**
- **59 documentos**
- Estado inicial: **Pendiente**
- Prioridad inicial: **Media**

La carga usa `catalogId` único, por lo que al volver a abrir la aplicación no duplica los registros.

## Funciones

- Base SQLite local.
- Catálogo precargado.
- Nuevo pendiente.
- Edición y eliminación.
- Estados: Pendiente, En proceso, Bloqueado y Completado.
- Prioridades: Alta, Media y Baja.
- Fecha límite y control de vencidos.
- Notas.
- Búsqueda.
- Filtros por unidad, proceso y estado.
- Indicadores.
- Exportación CSV.

## Arquitectura

- `main.js`: ventana Electron, SQLite e IPC.
- `preload.js`: API segura entre la interfaz y la base.
- `index.html`: interfaz.
- `app.js`: lógica del panel y CRUD.
- `catalog.js`: catálogo UGPA/UTET y carga inicial.
- `styles.css`: estilos.
- `package.json`: ejecución con Electron.

## Comandos

```powershell
npm install
npm start
```

Para traer cambios futuros:

```powershell
git pull origin main
```
