# F1 Live Sync (Windows Native)

Aplicaci\u00f3n nativa para Windows (React + FastAPI) que permite ver la telemetr\u00eda de la F1 en vivo y sincronizarla manualmente con tu transmisi\u00f3n de video (Disney+, Fox Sports, etc.).

## 🏎️ Caracter\u00edsticas Principales

1. **Control de Sincronizaci\u00f3n Total (Delay):**
   - Casillero para ingresar los segundos exactos de retraso respecto a la pista real.
   - Bot\u00f3n de **Play / Pausa** para congelar la telemetr\u00eda hasta que el video alcance a los datos.

2. **Layout Optimizado:**
   - **Izquierda:** Tabla de posiciones (Leaderboard) con tiempos, gaps, neum\u00e1ticos y paradas en pits.
   - **Derecha:** Mapa de la pista (Track Canvas) mostrando la posici\u00f3n de los autos en tiempo real.

3. **Men\u00fa Moderno y Calendario:**
   - Visualizaci\u00f3n de carreras pasadas y futuras de la temporada actual.
   - **T-Minus Flip Clock:** Cuenta regresiva en tiempo real (d\u00edas, horas, mins, segs) para la pr\u00f3xima sesi\u00f3n de la Race Week activa.

4. **Notificaciones de Direcci\u00f3n de Carrera (Race Control):**
   - "Cartelitos" emergentes en tiempo real en la esquina superior derecha.
   - Avisos de Banderas Amarillas, Rojas, Investigaciones y Sanciones.
   - Detalle expandible al interactuar.

## 🛠️ Tecnolog\u00edas (Stack)

- **Frontend:** React + Vite + Tailwind CSS.
- **Backend:** Python + FastAPI + websockets.
- **Data Source:** Servidores oficiales de SignalR de F1 (a trav\u00e9s de la l\u00f3gica base de FastF1).

## 🚀 C\u00f3mo Ejecutar (Windows)

No requiere Docker ni configuraciones complejas en Linux.

1. Simplemente haz doble clic en el archivo `Iniciar_F1LiveSync.bat`.
2. El script se encargar\u00e1 de:
   - Crear el entorno virtual (`venv`) si no existe.
   - Instalar dependencias de Python y Node.js.
   - Levantar el servidor Backend en una ventana.
   - Levantar el Frontend en una segunda ventana.
3. El navegador se abrir\u00e1 autom\u00e1ticamente en `http://localhost:5173`.
