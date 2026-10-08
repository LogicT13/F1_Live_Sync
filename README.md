# F1 Live Sync

¡Tu compañero perfecto para disfrutar de la Fórmula 1! Esta aplicación (React + FastAPI) te permite visualizar la telemetría de la F1 en vivo y, lo más importante, **sincronizarla a la perfección con tu transmisión de video** (Disney+, Fox Sports, DAZN, F1TV, etc.).

## 🏎️ Características Principales

1. **Sincronización Precisa tipo VLC:**
   - Control total sobre el "delay" de los datos. Puedes usar botones de `+` y `-` para ajustar el tiempo en incrementos de **0.1 segundos**, o escribir los segundos exactos.
   - Botón de **Play / Pausa** para congelar la telemetría hasta que tu video alcance la transmisión de los datos.

2. **Panel de Control Personalizable:**
   - Menú de configuraciones (⚙️) que te permite elegir exactamente qué información mostrar u ocultar en pantalla (Gaps, Tiempos, Neumáticos, Paradas en Boxes, etc.).
   - Interfaz moderna, limpia, y completamente configurable a tu gusto.

3. **Multilingüe:**
   - Interfaz disponible tanto en **Español** (predeterminado) como en **Inglés**.

4. **Layout Optimizado:**
   - **Izquierda:** Tabla de posiciones (Leaderboard) detallada con la información que elijas ver.
   - **Derecha:** Mapa del circuito (Track Canvas) mostrando la posición de los pilotos en tiempo real.

5. **Notificaciones de Dirección de Carrera (Race Control):**
   - Avisos en tiempo real sobre Banderas Amarillas, Banderas Rojas, Investigaciones y Sanciones directamente en la pantalla.

## 🛠️ Tecnologías (Stack)

- **Frontend:** React + Vite + Tailwind CSS.
- **Backend:** Python + FastAPI + websockets.
- **Data Source:** Servidores oficiales de SignalR de F1.

## 🚀 Cómo Ejecutar (Windows)

No se requiere Docker ni instalaciones complejas.

1. Haz doble clic en el archivo `Iniciar_F1LiveSync.bat`.
2. El script de forma automática:
   - Creará un entorno virtual de Python (`venv`).
   - Instalará todas las dependencias necesarias.
   - Iniciará el Backend y el Frontend en tu navegador.
3. Disfruta de la carrera en `http://localhost:5173`.

---

# F1 Live Sync (English)

Your perfect companion for Formula 1! This application (React + FastAPI) allows you to view live F1 telemetry and, most importantly, **synchronize it perfectly with your video broadcast** (Disney+, Fox Sports, DAZN, F1TV, etc.).

## 🏎️ Main Features

1. **VLC-style Precise Synchronization:**
   - Total control over the data "delay". Use `+` and `-` buttons to adjust the time in **0.1 second** increments, or type the exact seconds.
   - **Play / Pause** button to freeze telemetry until your video catches up with the data feed.

2. **Customizable Dashboard:**
   - Settings menu (⚙️) allows you to choose exactly what information to display or hide on the screen (Gaps, Times, Tyres, Pit Stops, etc.).
   - Modern, clean interface, fully configurable to your liking.

3. **Multilingual:**
   - Interface available in both **Spanish** (default) and **English**.

4. **Optimized Layout:**
   - **Left:** Detailed Leaderboard with the information you choose to see.
   - **Right:** Track Canvas showing drivers' positions in real-time.

5. **Race Control Notifications:**
   - Real-time alerts for Yellow Flags, Red Flags, Investigations, and Penalties directly on screen.

## 🚀 How to Run (Windows)

1. Simply double-click the `Iniciar_F1LiveSync.bat` file.
2. The script will automatically handle the setup and open your browser at `http://localhost:5173`.
