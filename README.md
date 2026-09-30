# Pendientes

Aplicación de escritorio en **Electron** para controlar documentos y pendientes de los procesos **UGPA** y **UTET**.

## Funciones

- Base SQLite local.
- Catálogo precargado.
- Estados: **Pendiente → Realizado → Enviado a firmar → Subido**.
- **Subido** representa el proceso terminado.
- Prioridades: Máxima, Alta, Media y Baja.
- Prioridad automática según la fecha de entrega.
- Pantalla independiente de **Prioridades**.
- Fecha de entrega editable directamente desde la tabla.
- Búsqueda y filtros.
- Indicadores y vencidos.
- Exportación CSV.

## Base de datos local

Los datos se guardan en `pendientes.sqlite` dentro de la carpeta de datos de la aplicación del usuario. La base queda fuera de la carpeta de instalación, por lo que una actualización del programa no debe borrar los pendientes.

## Ejecutar

```powershell
cd C:\Users\ITSQMET\Desktop\Pendiente
git pull origin main
npm install
npm start
```

## Crear el instalador de Windows

```powershell
npm install
npm run dist
```

El instalador se genera en:

```text
dist\Pendientes-Setup-1.2.0.exe
```

También se puede empaquetar sin instalador con:

```powershell
npm run pack
```

## Arquitectura

- `main.js`: Electron, SQLite, migración de estados e IPC.
- `preload.js`: API segura entre interfaz y base.
- `index.html`: interfaz.
- `app.js`: CRUD, estados, fechas y prioridades.
- `catalog.js`: catálogo UGPA/UTET.
- `styles.css`: diseño.
- `assets/icon.png`: icono de la aplicación y del instalador.
- `package.json`: ejecución y empaquetado.
