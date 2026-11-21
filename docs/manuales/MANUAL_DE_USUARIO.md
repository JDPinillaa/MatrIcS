# Manual de Usuario — MatrIcS (MVP Parqueadero LPR)

**Audiencia:** Operadores de carril/caja y Administradores del parqueadero.  

> **Nota para exportación a PDF:** Reemplazar los marcadores `[Insertar captura de pantalla real]` con capturas tomadas directamente del aplicativo corriendo en `http://localhost:5173`.

---

## 1. Acceso al Sistema (Inicio de Sesión)

1. Abre el navegador web e ingresa a la URL del sistema (`http://localhost:5173` en entorno local).
2. En la pantalla **Iniciar sesión**, digita tu **Correo electrónico** y **Contraseña** asignados según tu rol (`OPERADOR` o `ADMINISTRADOR`).
3. Haz clic en **Ingresar**. Si tus credenciales son válidas, el sistema te redirige al panel operativo.

`[Insertar captura de pantalla real: Pantalla de Inicio de Sesión]`

---

## 2. Guía de Uso Paso a Paso

### 2.1. Carril de Entrada (Ingreso por Placa y Control de Cupos)
1. En el menú lateral, selecciona **Carril de entrada/salida**.
2. Envía una lectura de placa (simulador, imagen o lector LPR) indicando la placa y su porcentaje de confianza.
3. El sistema clasifica automáticamente el vehículo según el formato colombiano:
   - **CARRO:** 3 letras y 3 números (ej. `ABC123`).
   - **MOTO:** 3 letras, 2 números y 1 letra (ej. `XYZ45A`) o 3 letras y 2 números (ej. `MNP78`).
4. Verifica el indicador visual de la **Barrera Simulada**:
   - **ABIERTA (verde):** había cupo disponible y confianza suficiente. Se descontó 1 cupo y se registró el ingreso (y el cobro diario si aplica).
   - **LLENO (alerta):** no quedan cupos disponibles para ese tipo de vehículo. La barrera permanece cerrada y no se registra el ingreso.
   - **CERRADA (rojo):** la lectura requiere validación manual o fue rechazada.

`[Insertar captura de pantalla real: Carril de Entrada con Barrera ABIERTA y estado LLENO]`

### 2.2. Validación y Digitación Manual por Baja Confianza
1. Si la lectura llega con una confianza **inferior al umbral configurado** (por defecto `80%`), la barrera permanece **CERRADA** y el sistema solicita intervención del operador.
2. Revisa la placa sugerida y elige una acción:
   - **Confirmar / Corregir placa:** escribe los caracteres correctos y confirma. El sistema valida el formato y cupo, abre la barrera si aplica y guarda el evento marcado como **`LECTURA_MANUAL`** con tu usuario.
   - **Descartar lectura:** cancela la operación si se trató de un falso positivo.

`[Insertar captura de pantalla real: Flujo de Validación Manual de Placa]`

### 2.3. Caja de Pagos (Registro de Pago en Efectivo y Pase Diario)
1. En el menú lateral, abre **Caja de pagos**.
2. Digita la placa del vehículo para consultar su cobro **PENDIENTE** del día operativo actual (`06:00` a `05:59`).
3. Verifica el monto a pagar y la franja aplicada, y haz clic en **Registrar pago (Efectivo)**.
4. El cobro pasa a estado **PAGADO** y queda habilitado un **pase vigente hasta las `05:59:59`** del día operativo: el vehículo puede salir y volver a entrar en la misma sede sin generar un cobro nuevo.
5. Si presionas el botón de pago dos veces por error, el sistema es **idempotente**: no duplica el registro ni cobra dos veces.

`[Insertar captura de pantalla real: Módulo de Caja de Pagos]`

### 2.4. Carril de Salida (Verificación de Cobro y Apertura)
1. En el carril de salida, ingresa o captura la placa del vehículo que desea retirarse.
2. El sistema revisa el estado del cobro del día operativo actual:
   - **Moto exenta (`$0`) o vehículo sin cobro pendiente:** la barrera cambia a **ABIERTA** (*"Barrera Abierta: Moto exenta de cobro"*), registra la salida y libera 1 cupo.
   - **Carro con cobro `PAGADO`:** la barrera cambia a **ABIERTA** (*"Barrera Abierta: Pase diario vigente"*), registra la salida y libera 1 cupo.
   - **Carro con cobro `PENDIENTE`:** la barrera permanece **CERRADA** (*"Barrera Cerrada: Cobro pendiente de pago"*), no registra salida y no libera cupo hasta que pague en caja.

`[Insertar captura de pantalla real: Carril de Salida — Barrera CERRADA por cobro pendiente y ABIERTA tras pago]`

### 2.5. Administración de Tarifas, Franjas y Cupos *(Solo Administrador)*
1. Ingresa con rol **ADMINISTRADOR** y selecciona **Administración de tarifas y cupos**.
2. Modifica las tarifas diurna y nocturna de carros, la tarifa de motos (`$0` para exención o valor positivo), los horarios de franja, el umbral de confianza o los cupos máximos.
3. Haz clic en **Guardar**. El sistema impedirá guardar si la tarifa nocturna es mayor o igual que la diurna (para tarifas positivas) o si ingresas cupos negativos.

`[Insertar captura de pantalla real: Panel de Administración de Tarifas y Cupos]`

### 2.6. Consultas e Historial
1. Selecciona **Consultas** en el menú principal.
2. Alterna entre la pestaña **Eventos de acceso** y **Cobros generados**.
3. Filtra por **placa** (búsqueda total o parcial), **fecha / día operativo** y **estado** (`PENDIENTE`, `PAGADO`, `EXENTO`) o **modo de captura** (`AUTOMATICA`, `LECTURA_MANUAL`).

`[Insertar captura de pantalla real: Pantalla de Consultas de Eventos y Cobros]`

---

## 3. Solución de Problemas (Preguntas Frecuentes)

| Problema / Mensaje en pantalla | Causa probable | Cómo resolverlo |
| :--- | :--- | :--- |
| **"Formato de placa inválido"** | La placa tiene espacios, guiones o no cumple `AAA123`, `AAA12A` ni `AAA12`. | Verifica que tenga 3 letras seguidas de 3 dígitos (carro) o 3 letras + 2 dígitos (+ letra opcional) para moto, sin guiones. |
| **La barrera de entrada muestra "LLENO"** | Los cupos disponibles para ese tipo de vehículo (`CARRO` o `MOTO`) llegaron a `0`. | Espera a que salga un vehículo del mismo tipo o solicita al administrador ajustar la capacidad en Administración. |
| **La barrera de salida no abre ("Cobro pendiente de pago")** | El vehículo tiene un cobro en estado `PENDIENTE` para el día operativo en curso. | Dirige al conductor a **Caja de pagos**, registra el pago en efectivo y vuelve a leer la placa en salida. |
| **La barrera se queda cerrada pidiendo validación manual** | La confianza de la lectura LPR fue inferior al umbral configurado (ej. `60% < 80%`). | Revisa la placa en pantalla, corrígela si es necesario y haz clic en **Confirmar** (o **Descartar** si fue un falso positivo). |
| **"La tarifa nocturna debe ser menor que la diurna"** | Intentaste guardar una tarifa nocturna mayor o igual a la diurna (`RN-02`). | Ingresa un valor nocturno estrictamente menor al diurno (o `$0` en ambas solo para motos exentas). |
| **Aviso superior "Backend sin conexión"** | El servidor API (`localhost:3000`) está apagado o la red local se interrumpió. | Verifica que el backend esté corriendo (`npm run start:dev`) y haz clic en **Reintentar**. |
| **"Acceso denegado (403 Forbidden)"** | Intentaste acceder a una función exclusiva de `ADMINISTRADOR` usando una cuenta de `OPERADOR`. | Cierra sesión e ingresa con una cuenta con rol `ADMINISTRADOR`. |
| **Presioné "Registrar pago" dos veces por accidente** | Doble clic o reintento de red sobre el mismo cobro. | No te preocupes: el pago es **idempotente** y el sistema solo registra una transacción y devuelve el recibo vigente. |
