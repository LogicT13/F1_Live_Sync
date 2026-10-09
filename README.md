# F1 LiveSync

El objetivo de este proyecto es crear un **Pit Wall personal** para ver telemetría de Fórmula 1 en tiempo real, sincronizable manualmente con la transmisión de TV mediante controles de delay y pausa.

## ⚠️ Reglas de Operación Estrictas (Tolerancia Cero)
1. **PROHIBIDO MODIFICAR MÚLTIPLES SUBSISTEMAS A LA VEZ:** Se trabajará estrictamente en fases ordenadas. No se pasará a la siguiente fase sin que la anterior esté testeada y confirmada.
2. **PROHIBIDO AFIRMAR QUE ALGO FUNCIONA SIN VALIDAR:** No se dará nada por solucionado sin haber probado el código, revisado los logs y verificado que cumple el objetivo. Si algo requiere validación visual manual, se declarará explícitamente.
3. **CRITERIO DE UX REALISTA:** No se agregarán elementos estáticos inútiles (como carteles permanentes de "Bandera: No"). La interfaz debe ser reactiva por eventos (toasts temporales, tooltips animados e indicadores contextuales).
4. **PREGUNTAR ANTES DE ROMPER:** Ante cualquier duda conceptual, arquitectónica o de diseño ambiguo, se presentará la duda puntualmente antes de implementar código parche.

## 🏠 Especificación de la Home (Menú Principal)
- **Estética:** Moderna, sobria y premium con fondo azul marino oscuro (`#0a0f1d`).
- **Calendario oficial de la temporada:**
  - **Carreras pasadas:** Visualmente atenuadas / apagadas (opacidad reducida).
  - **Próxima carrera:** Destacada con cuenta regresiva en vivo (T- [días, horas, mins, segs]) con tipografía nítida y moderna (sin FlipClocks toscos).
  - **Carreras futuras:** Listado limpio con sus fechas correspondientes.
- **Miniaturas de trazados:** Cada circuito debe renderizar su silueta vectorial limpia sin errores de carga.
- **Pestañas de campeonato:** Pilotos y Constructores, y sección de comparativa H2H (Versus libre) *(a mejorar en el futuro)*.

## 📡 Fuentes de Datos (APIs)
- **Telemetría en Vivo:** Conexión mediante WebSocket al backend de FastAPI, alimentado por el feed oficial de F1 SignalR (Live Timing).
- **Datos Históricos y Sesiones Pasadas:** Consumo vía FastF1 / OpenF1.
- **POLÍTICA DE DATOS ESTRICTA:** Queda terminantemente prohibido generar datos simulados (mock data). Si una sesión no arrancó, o la API no provee compuestos de neumáticos o telemetría, o si provee erróneamente datos antes de que la sesión inicie, los campos deben mostrarse vacíos o con guiones ("--").

## 🏁 Refinamiento de la Sala de Sesión y Vista en Vivo
*Aclaración: Si una sesión está en vivo, no se mostrará como "replay".*

1. **Acceso a la Sala:**
   - Se puede ingresar a la pantalla del circuito en cualquier momento (sin límite de tiempo de 15 minutos). Muestra el trazado y la información estática del circuito hasta que inicie la telemetría oficial.

2. **Leaderboard Dinámico y Navegación del Circuito:**
   - **Leaderboard:** Ubicado a la izquierda por defecto, pero desacoplable (draggable) para reposicionarlo en la pantalla.
   - **Track Map (Pan & Zoom):** El mapa del circuito soporta Zoom In / Zoom Out fluido con la rueda del ratón y paneo (arrastre) manteniendo presionado el clic izquierdo.
   - **Puntos de Pilotos:** Durante las sesiones (en tiempo real) y replays, en el circuito se ven los puntos de los pilotos distinguidos con los colores de sus escuderías y sus respectivos números.

3. **Overtake Mode (OM) y Segmentación de Pista:**
   - **Zonas OM:** Posibilidad de elegir con Toggle ver zonas de Overtake Mode (identificación clara de tramos de activación y detección).
   - **Marshal Sectors reactivos:** El trazado se ve continuo y limpio, pero mantiene una división vectorial interna por Marshal Sectors. Al emitirse una bandera amarilla en un puesto de comisario, ese segmento puntual se ilumina en amarillo brillante en el mapa sin alterar el resto de la pista.

4. **Barra de Reproducción y Sincronización (Timeline Player):**
   - **Barra de control multimedia inferior MODERNA:**
     - Botón Play / Pausa funcional para pausar el flujo de datos.
     - Botones de salto rápido modernos: `-5s` y `+5s` para ajustar el desfase con la TV.
     - Indicador "LIVE" (punto con pulso, moderno) para saltar inmediatamente al flujo de datos en directo.
     - Selector de velocidad moderno (ventana para elegir: `x0.5`, `x1`, `x2`, `x4`, `x8`) habilitado al reproducir carreras finalizadas.

5. **Estética y Microinteracciones:**
   - **Paleta:** Fondo azul marino profundo (`#0a0f1d`), acentos en rojo F1, paneles dark glassmorphism (translucidez y blur) y bordes redondeados (`rounded-xl/2xl`).
   - **Animaciones:** Notificaciones flotantes de banderas (amarillas, rojas), investigaciones a corredores y penalizaciones usando toasts modernas y tooltips con transiciones suaves (fade-in, scale y easing cúbico) con feedback visual claro en cada hover.

## 🛠 Tecnologías (Stack)
- **Frontend:** React + Vite + Tailwind CSS + D3.
- **Backend:** Python + FastAPI + websockets + FastF1 / OpenF1.

## 🏃 Cómo Ejecutar (Windows)
1. Haz doble clic en el archivo `Iniciar_F1LiveSync.bat`.
2. Disfruta de la experiencia en `http://localhost:5173`.
