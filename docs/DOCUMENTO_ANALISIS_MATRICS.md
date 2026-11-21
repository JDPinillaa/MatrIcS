# DOCUMENTO DE ANÁLISIS — SISTEMA DE PARQUEADERO AUTOMATIZADO POR LECTURA DE PLACAS (MatrIcS MVP)

> **Lista de verificación antes de exportar a PDF (`PROYECTO MVP – MATRICS.ZIP`):**
> - Agregar **portada y subportada institucional UAM** e **infografía del manual de marca institucional UAM**.
> - Insertar los **diagramas elaborados manualmente** (sin IA) en la sección **C** (Casos de Uso, Clases SOLID+Patrones, MER de `docs/DiagramaSoftwareParqueadero.png` y Mockups).
> - Completar las reglas `RN-04`, `RN-05`, supuestos `S-01`/`S-03..S-07` desde los documentos base de cortes anteriores, los roles PO/SM oficiales y el enlace público del video de funcionamiento.

---

## A. Definición del Proyecto

### A.1. Introducción
El control manual de ingreso, liquidación y salida en parqueaderos produce congestión en horas pico, errores de digitación en placas, inconsistencias de caja y falta de trazabilidad sobre el aforo real. **MatrIcS** es un Producto Mínimo Viable (MVP) que automatiza la operación integral de un parqueadero a partir de la lectura de placas (LPR), clasificando vehículos colombianos (`CARRO` / `MOTO`), controlando cupos en tiempo real, generando un cobro único por día operativo (`06:00` a `05:59`), registrando pagos en efectivo idempotentes con pase diario y condicionando la apertura de la barrera simulada al estado del cobro.

### A.2. Oportunidad de Negocio
Los parqueaderos urbanos e institucionales necesitan agilizar los carriles de acceso, impedir cobros duplicados o alteraciones de tarifa sobre transacciones pasadas y contar con auditoría de cada intervención manual. Construir un MVP funcional de costo cero —operativo 100% en entorno local y diseñado con principios SOLID y patrones de diseño— permite validar el flujo de punta a punta hoy y escalar limpiamente hacia múltiples sedes, OCR en tiempo real y pagos electrónicos en producción.

### A.3. Declaración de Visión
Construir una plataforma modular, confiable y auditable de gestión vehicular por lectura de placas capaz de operar sin costos de licenciamiento ni dependencia obligatoria de hardware físico (Plan B local garantizado), y estructurada arquitectónicamente para evolucionar sin reescrituras hacia una infraestructura cloud distribuida con múltiples sedes y cumplimiento normativo colombiano.

### A.4. Stakeholders (Partes Interesadas)

| Stakeholder | Rol / Interés en el Sistema |
| :--- | :--- |
| **Operador de Carril y Caja** | Controla ingresos y salidas, valida manualmente placas con baja confianza, cobra en efectivo de forma idempotente y consulta movimientos. |
| **Administrador del Parqueadero** | Configura tarifas (diurna, nocturna, motos), franjas horarias, cupos y umbral de confianza; supervisa auditoría e historial. |
| **Conductores (Usuarios finales)** | Obtienen ingreso/salida ágil, un único cobro por día operativo y pase de reingreso vigente hasta las `05:59:59`. |
| **Equipo de Desarrollo / Docente (UAM)** | Responsables de la calidad de ingeniería (SOLID, patrones, Clean Code, pruebas unitarias, Scrum y GitFlow). |

---

## B. Alcance y Requisitos

### B.1. Visión General
1. **Ingreso y clasificación (`F-01`, `F-02`, `F-07`):** lectura de placa y confianza, clasificación colombiana (`AAA123` carro; `AAA12A` o `AAA12` moto), validación de cupos con reserva atómica y apertura de barrera simulada.
2. **Validación manual (`F-06`):** pausa automática cuando la confianza está por debajo del umbral configurado, dejando trazabilidad `LECTURA_MANUAL` y usuario responsable.
3. **Cobro por día operativo (`F-03`):** liquidación única por `(placa, sede, día operativo 06:00–05:59)` respaldada por restricción `UNIQUE` en PostgreSQL y tarifa histórica inmutable (`RN-07`).
4. **Caja y pago idempotente (`F-04`):** pago en efectivo protegido por llave única de idempotencia, habilitando pase diario vigente hasta `05:59:59` (`RN-03`).
5. **Control de salida (`F-05`):** validación de estado del cobro (`RN-06`) mediante patrón `State`, apertura o bloqueo explícito de barrera y liberación atómica de cupo.
6. **Administración, consultas y seguridad (`F-08`, `F-09`, `F-10`):** parametrización protegida por rol (`ADMINISTRADOR`/`OPERADOR`), filtros de historial y contrato opcional de reconocimiento OCR (`HU-09`).

### B.2. Beneficios
- Cero cobros duplicados por día operativo (`uq_cobros_placa_sede_dia`) y cero pagos duplicados (`uq_pagos_llave_idempotencia`, `uq_pagos_cobro`).
- Trazabilidad auditable de intervenciones manuales (`ck_eventos_manual_con_usuario`).
- Protección de ingresos históricos ante cambios posteriores de tarifas (`RN-07`).
- Despliegue reproducible de costo cero con Plan B 100% local.

### B.3. Alcance del MVP
- **Incluido en el MVP:** `F-01` a `F-10`, pruebas unitarias y de integración (`Jest` y `Vitest`), Swagger UI interactivo (`/api/docs`), pipeline CI en GitHub Actions, adaptador opcional OCR con fallback Plan B (`HU-09`) e interfaz definida de facturación electrónica DIAN (`IElectronicInvoicingPort`).
- **Fuera del alcance ejecutable del MVP:** hardware físico de cámaras LPR/barreras reales, emisión tributaria productiva DIAN (solo interfaz), pasarela de pagos con dinero real y despliegue productivo multi-sede en vivo (cubierto en `docs/PROPUESTA_INFRAESTRUCTURA_PRODUCCION.md`).

### B.4. Restricciones
- **Costo cero** en el MVP y **Plan B local obligatorio** para la sustentación.
- **Hardware simulado** (lector de placas y barrera visual).
- **Calidad de ingeniería:** aplicación demostrable en código de los 5 principios SOLID, mínimo 3 patrones de diseño, Scrum, GitFlow estricto y pruebas unitarias.
- **Normativa:** protección de datos personales (Ley 1581 de 2012 de Colombia) y prohibición de uso de IA para generar diagramas UML/MER.

### B.5. Requisitos Funcionales (RF)

| ID | Nombre | Descripción resumida | Trazabilidad |
| :--- | :--- | :--- | :--- |
| **RF-01** | Autenticación y roles | Inicio de sesión con contraseñas cifradas (`bcrypt`) y control de acceso `OPERADOR` / `ADMINISTRADOR` (`401`/`403`). | F-10 / HU-01 |
| **RF-02** | Administración de tarifas, franjas y cupos | Configuración de tarifas (`RN-01` moto `$0`, `RN-02` nocturna < diurna), franjas horarias, umbral y cupos `>= 0`. | F-08 / HU-02 |
| **RF-03** | Ingreso, clasificación y cupos | Lectura de placa + confianza, clasificación (`AAA123` carro; `AAA12A`/`AAA12` moto), reserva atómica de cupo o aviso `LLENO`. | F-01, F-02, F-07 / HU-03 |
| **RF-04** | Validación y digitación manual | Pausa cuando `confianza < umbral` para confirmar, corregir o descartar lectura, marcando `LECTURA_MANUAL`. | F-06 / HU-04 |
| **RF-05** | Generación de cobro diario | Cobro único por `(placa, sede, día operativo 06:00–05:59)` guardando tarifa y franja históricas (`RN-07`). | F-03, S-02 / HU-05 |
| **RF-06** | Registro de pago idempotente | Pago en efectivo en caja sin duplicaciones, emitiendo pase vigente hasta `05:59:59` (`RN-03`). | F-04, RN-03 / HU-06 |
| **RF-07** | Control de salida y barrera | Apertura condicionada a cobro `PAGADO` o exento (`RN-06`), mensaje explícito y liberación atómica de cupo. | F-05, RN-06 / HU-07 |
| **RF-08** | Consulta e historial filtrado | Listado de eventos y cobros con filtros por placa, fecha/día operativo y estado/tipo/modo. | F-09 / HU-08 |
| **RF-09** | Reconocimiento LPR/OCR *(Opcional)* | Extracción de placa y confianza desde imagen vía `FastApiOcrAdapter` intercambiable por simulador (`LprReaderFactory`). | Opcional / HU-09 |

### B.6. Requisitos No Funcionales (RNF)

| ID | Categoría | Descripción | Trazabilidad |
| :--- | :--- | :--- | :--- |
| **RNF-01** | Arquitectura en capas | Separación en `domain`, `application`, `infrastructure` y `presentation`. | TT-01, TT-03 |
| **RNF-02** | Integridad de datos | PostgreSQL 16 con `uq_cobros_placa_sede_dia`, `uq_pagos_llave_idempotencia`, `ck_*` y `docker-compose.yml`. | TT-02 |
| **RNF-03** | API y errores | NestJS con Swagger UI (`/api/docs`), `/health` y `GlobalExceptionFilter` (`400/401/403/404/409/500`) con traducción segura de errores PostgreSQL. | TT-03 |
| **RNF-04** | Frontend y resiliencia | React + Vite + Tailwind con `BarrierIndicator`, cliente HTTP centralizado y manejo controlado de backend offline. | TT-04 |
| **RNF-05** | Principios SOLID | Aplicación verificable en código real de `S`, `O`, `L`, `I`, `D`. | Guía III Corte |
| **RNF-06** | Patrones de diseño | Implementados en código: `Strategy`, `Chain of Responsibility`, `State`, `Adapter`, `Factory` y `Repository`. | Guía III Corte |
| **RNF-07** | GitFlow y CI | Ramas `main`, `develop`, `feature/*`, `release/1.0.0` (tag `v1.0.0`), PRs revisados y workflow `.github/workflows/ci.yml`. | Guía III Corte |
| **RNF-08** | Pruebas automatizadas | Suites ejecutables por CLI en Jest (Backend) y Vitest (Frontend). | Guía III Corte |
| **RNF-09** | Seguridad y privacidad | Hash `bcrypt`, cero secretos versionados (`.env.example`) y alineación con Ley 1581 de 2012. | Guía III Corte |

### B.7. Reglas de Negocio y Supuestos
- **RN-01:** La tarifa de motos puede configurarse en `$0` (exenta de cobro) o en un valor positivo.
- **RN-02:** Para tarifas positivas, la tarifa nocturna debe ser estrictamente menor que la diurna del mismo tipo de vehículo.
- **RN-03:** El pago de un cobro habilita un pase de entrada y salida vigente para la placa en la sede hasta las `05:59:59` del día operativo.
- **RN-04:** `[COMPLETAR DESDE DOCUMENTOS BASE DE CORTES ANTERIORES]`
- **RN-05:** `[COMPLETAR DESDE DOCUMENTOS BASE DE CORTES ANTERIORES]`
- **RN-06:** La barrera de salida abre únicamente si el cobro del día operativo está `PAGADO` o el vehículo está exento / sin cobro pendiente.
- **RN-07:** Inmutabilidad histórica: cada cobro almacena el valor y franja aplicados al momento de su generación.
- **S-02:** El día operativo abarca de `06:00:00` de un día calendario a `05:59:59` del día siguiente (`America/Bogota`).
- **S-01, S-03 a S-07:** `[COMPLETAR DESDE DOCUMENTOS BASE DE CORTES ANTERIORES]`

### B.8. Roles y Responsabilidades (Scrum)

| Integrante | Usuario GitHub | Rol Scrum | Responsabilidades técnicas |
| :--- | :--- | :--- | :--- |
| **Juan Diego Pinilla** | `JDPinillaa` | `[PO / SM]` · Dev | `TT-04` (Frontend base + Barrera), `HU-04` (Validación manual), `HU-08` (Consultas). |
| **María Camila Méndez Ramírez** | `LaMendez006` | Dev | `TT-02` (MER, SQL, Docker Compose), `HU-02` (Tarifas/Cupos), `HU-06` (Pago idempotente). |
| **Johan Andrés Villada Valencia** | `VilladaV` | Dev | `TT-03` (Backend, Swagger, Errores PG), `HU-03` (Ingreso/Cupos), `HU-07` (Salida), `HU-09` (OCR/LPR), CI y documentación técnica. |
| **María Paz Bustamante** | `mariapazbustamante-commits` | Dev | `TT-01` (Modelado UML y Mockups), `HU-01` (Auth/Roles), `HU-05` (Motor de Cobro). |

---

## C. Diseño y Modelado

### C.1. Estrategia de Desarrollo por Iteraciones (Casos de Uso)

| ID | Caso de Uso | Actor(es) | Iteración I (Sprint 1) | Iteración II (Sprint 2) | Iteración III (Opcional / Prod) |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **CU-01** | Iniciar sesión y validar rol | Operador, Administrador | X | | |
| **CU-02** | Configurar tarifas, franjas, umbral y cupos | Administrador | X | | |
| **CU-03** | Registrar ingreso por placa y control de cupos | Operador, Lector LPR | X | | |
| **CU-04** | Validar o digitar placa manualmente | Operador | X | | |
| **CU-05** | Generar cobro único por día operativo | Sistema (al ingresar) | | X | |
| **CU-06** | Registrar pago en efectivo idempotente y pase diario | Operador | | X | |
| **CU-07** | Controlar salida y apertura de barrera (`RN-06`) | Operador, Lector LPR | | X | |
| **CU-08** | Consultar historial filtrado de eventos y cobros | Operador, Administrador | | X | |
| **CU-09** | Reconocer placa desde imagen vía OCR (`HU-09`) | Operador, Servicio OCR | | X | |
| **CU-10** | Sincronizar Gateway offline y pasarela productiva | Gateway Sede, Pasarela | | | X |

### C.2. Artefactos Gráficos (Elaboración Manual — Sin IA)
- **Diagrama de Casos de Uso:** `[Insertar imagen manual exportada desde Draw.io]`
- **Diagrama de Clases (SOLID + Patrones):** `[Insertar imagen manual mostrando Strategy, Chain of Responsibility, State, Adapter, Factory y Repository]`
- **Diagrama Entidad-Relación (MER):** disponible en `docs/DiagramaSoftwareParqueadero.png` (fuente editable `docs/DiagramaSoftwareParqueadero.drawio`, elaborado por María Camila Méndez Ramírez).
- **Mockups de Alta Fidelidad:** `[Insertar capturas de prototipos Figma / pantallas finales alineadas al manual de marca UAM]`

### C.3. Historias de Usuario
Las 4 Tareas Técnicas (`TT-01`–`TT-04`) y 9 Historias de Usuario (`HU-01`–`HU-09`) con sus criterios de aceptación (5–6 por historia), estimación en puntos Fibonacci, ramas GitFlow y casos de prueba de éxito/error se encuentran en `Backlog de Historias de Usuario y Requisitos - MVP Parqueadero.pdf` y en los Issues del repositorio.

---

## D. Gestión, Estimación y Entregables

- **Herramienta de Gestión (Tablero Scrum):** GitHub Projects en `https://github.com/JDPinillaa/MatrIcS` *(pegar URL directa del Project board y adjuntar captura del burndown/progreso)*.
- **Repositorio de Código:** https://github.com/JDPinillaa/MatrIcS
- **Video de Funcionamiento:** `[Pegar enlace público de Drive / YouTube al finalizar la integración]`
- **Técnica de Estimación:** Planning Poker con escala Fibonacci (`3`, `5`, `8` puntos por historia; evidencia de votación del equipo).
- **Tabla de Iteraciones:**
  - **Sprint 1 (Semana 1):** Base técnica (`TT-01` a `TT-04`) + `HU-01` a `HU-04` (21 puntos).
  - **Sprint 2 (Semana 2):** `HU-05` a `HU-08` (21 puntos) + `HU-09` (opcional OCR) + pruebas integrales, `release/1.0.0` → `main` (`v1.0.0`) y documentación final.
- **Script de Creación de BD:** `database/init/01-schema.sql` y `database/init/02-seed.sql`.
- **Documentación de Endpoints (OpenAPI / Swagger):** `backend/openapi.yaml` y Swagger UI interactivo en `http://localhost:3000/api/docs` (JSON en `/api/docs-json`).
- **Propuesta de Infraestructura Productiva:** `docs/PROPUESTA_INFRAESTRUCTURA_PRODUCCION.md`.
- **Manuales (para carpeta `MANUALES/`):**
  - `docs/manuales/MANUAL_DE_INSTALACION.md`
  - `docs/manuales/MANUAL_DE_ADMINISTRACION.md`
  - `docs/manuales/MANUAL_DE_USUARIO.md`

### Estructura del ZIP de Entrega Final (`PROYECTO MVP – MATRICS.ZIP`)
```text
PROYECTO MVP – MATRICS/
├── DOCUMENTO ANÁLISIS/
│   └── DOCUMENTO_ANALISIS_MATRICS.pdf        # Incluye Propuesta de Infraestructura Productiva
├── MANUALES/
│   ├── MANUAL_DE_INSTALACION.pdf
│   ├── MANUAL_DE_ADMINISTRACION.pdf
│   └── MANUAL_DE_USUARIO.pdf
└── EJECUTABLE/
    ├── docker-compose.yml                    # Ejecutable completo del MVP
    ├── icono_matrics.png                     # Ícono de aplicación
    └── database/init/
        ├── 01-schema.sql
        └── 02-seed.sql
```

---

## Referencias (Normas APA 7.ª edición)

Congreso de la República de Colombia. (2012). *Ley 1581 de 2012: Por la cual se dictan disposiciones generales para la protección de datos personales*. Diario Oficial No. 48.587.

Gamma, E., Helm, R., Johnson, R., & Vlissides, J. (1994). *Design patterns: Elements of reusable object-oriented software*. Addison-Wesley.

Martin, R. C. (2008). *Clean code: A handbook of agile software craftsmanship*. Prentice Hall.

Martin, R. C. (2017). *Clean architecture: A craftsman's guide to software structure and design*. Prentice Hall.

Pressman, R. S., & Maxim, B. R. (2021). *Ingeniería del software: Un enfoque práctico* (9.ª ed.). McGraw-Hill.

Schwaber, K., & Sutherland, J. (2020). *La guía de Scrum: La guía definitiva de Scrum, las reglas del juego*. Scrum.org. https://scrumguides.org/

Sommerville, I. (2011). *Ingeniería del software* (9.ª ed.). Pearson Educación.
