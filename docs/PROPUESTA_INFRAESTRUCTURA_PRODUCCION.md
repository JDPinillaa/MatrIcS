# Propuesta de Infraestructura para Producción — MatrIcS

**Proyecto:** Sistema de Parqueadero Automatizado por Lectura de Placas (LPR)  
**Stack de referencia:** NestJS (TypeScript) · React + Vite + Tailwind CSS · PostgreSQL 16 · FastAPI + EasyOCR · Docker  

---

## 1. Arquitectura del Entorno Productivo

> **Nota de entrega (restricción académica):** El diagrama gráfico del entorno productivo debe dibujarse manualmente en Draw.io / Lucidchart (sin generación por IA) tomando como base los bloques y flujos descritos a continuación.

### Bloques y flujos principales
1. **Capa de Sede (Edge / On-Premise):**
   - **Cámaras LPR IP y Barreras Físicas:** envían capturas al Gateway local por red LAN aislada (VLAN de dispositivos).
   - **Gateway de Sede (`Node.js` + `Redis` local en contenedor):** mantiene caché local de pases vigentes del día operativo (`06:00`–`05:59`) y cola de eventos offline para garantizar operación sin caída ante cortes de internet.
   - **Servicio LPR/OCR local o en nube (`FastAPI + EasyOCR / YOLOv8`):** procesa fotogramas cuando la cámara no trae OCR embebido.
2. **Capa de Seguridad y Red (Perímetro):**
   - **Cloud DNS + Cloud Load Balancer (HTTPS / TLS 1.3) + Cloud Armor (WAF).**
   - **Túnel VPN Site-to-Site (IPsec / WireGuard) o mTLS** entre cada Gateway de sede y la nube.
3. **Capa de Aplicación en la Nube (Google Cloud Platform — región `us-east1` / `southamerica-east1`):**
   - **Frontend SPA (`React + Vite`):** compilado estático servido por **Cloud Storage + Cloud CDN** (o Cloudflare Pages).
   - **API Central (`NestJS` en Cloud Run):** instancias sin estado (*stateless*) con autoescalado horizontal (`min=1`, `max=N`).
   - **Worker de Facturación / Notificaciones (Cloud Run Jobs / Service):** suscrito al bus de eventos.
4. **Capa de Datos, Almacenamiento y Mensajería:**
   - **Base de Datos Relacional (`Cloud SQL for PostgreSQL 16`):** instancia primaria con Alta Disponibilidad (HA multi-zona) y réplicas de lectura para consultas/reportes.
   - **Almacenamiento de Fotos (`Cloud Storage`):** bucket privado cifrado (CMEK/AES-256) con política de ciclo de vida (*Lifecycle Policy*) a **30 días** (Ley 1581 de 2012).
   - **Bus de Eventos (`Cloud Pub/Sub`):** desacopla eventos `vehiculo.ingresado`, `pago.confirmado` y `vehiculo.salido` para sincronizar pases con los Gateways de sede y alimentar auditoría.
5. **Servicios Externos:**
   - **Pasarela de Pagos Productiva (Wompi / Mercado Pago / PayU)** vía `IPasarelaPago` (Adapter) con webhook firmado e idempotente.
   - **Proveedor Tecnológico de Facturación Electrónica DIAN** vía `IElectronicInvoicingPort` (ya definida en el MVP).
6. **Observabilidad:**
   - **Cloud Logging** (logs JSON estructurados con `correlationId`), **Cloud Monitoring** (latencia p95, tasa de error 5xx, ocupación de carriles, estado de gateways) y **Alerting** hacia Slack/Correo de soporte.

---

## 2. Tabla Comparativa: MVP vs. Producción

| Componente | En el MVP (Costo $0) | En Producción (GCP) | Por qué cambia |
| :--- | :--- | :--- | :--- |
| **Backend / API** | NestJS local / contenedor en `Docker Compose` | **Google Cloud Run** (contenedores *stateless*, autoescalado) | Alta disponibilidad, escalado automático en horas pico y cero administración de servidores. |
| **Frontend Web** | Vite dev server / build local | **Cloud Storage + Cloud CDN** (o Cloudflare Pages) | Distribución global con HTTPS administrado, caché en borde y latencia mínima. |
| **Base de Datos** | PostgreSQL 16 en contenedor local (`docker-compose.yml`) | **Cloud SQL for PostgreSQL 16 (HA + Réplica de lectura)** | Backups automáticos, failover multi-zona, PITR y aislamiento de consultas analíticas. |
| **Lectura de Placas (LPR)** | Simulador en UI / adaptador opcional `FastAPI + EasyOCR` local | **Cámara LPR IP o servicio OCR dedicado en Gateway de sede** | Menor latencia (< 500 ms) sin saturar el ancho de banda de subida por sede. |
| **Barrera Física** | Indicador visual reutilizable `BarrierIndicator` | **Controlador de relé / PLC conectado al Gateway** | Control físico seguro por GPIO/Modbus/TCP con respaldo manual en sitio. |
| **Gateway de Sede** | Integrado directamente en API local | **Proceso separado en mini-PC en sede (`Node.js + Redis`)** | Continuidad operativa ante caídas de internet mediante caché de pases y cola local. |
| **Almacenamiento de Fotos** | Disco local / fuera de MVP | **Google Cloud Storage** con regla de borrado automático (30 días) | Durabilidad 99.999999999%, cifrado en reposo y cumplimiento de retención legal. |
| **Bus de Eventos** | Llamadas síncronas en proceso | **Cloud Pub/Sub** | Desacopla pagos, actualización de pases en gateways y auditoría ante picos de tráfico. |
| **Pasarela de Pagos** | Pago en efectivo idempotente (`EFECTIVO`) | **Wompi / Mercado Pago / PayU (producción)** + webhook firmado | Recaudo digital conciliado con firma criptográfica e idempotencia. |
| **Facturación Electrónica** | Interfaz `IElectronicInvoicingPort` + `NoopElectronicInvoicingAdapter` | **Adaptador proveedor tecnológico autorizado DIAN** | Cumplimiento tributario colombiano sin modificar el núcleo de pagos (OCP/DIP). |
| **Observabilidad** | Logs en consola + `GET /health` | **Cloud Logging + Cloud Monitoring + Uptime Checks + Alertas** | Detección proactiva de caídas de carril, errores 5xx y degradación de BD. |

---

## 3. Estrategia de Escalabilidad (1 sede → *N* sedes y múltiples carriles)

1. **De 1 carril a múltiples carriles en una sede:**
   - El modelo relacional ya garantiza concurrencia segura en cupos mediante `UPDATE cupos SET ocupados = ocupados + 1 WHERE ... AND ocupados < capacidad_maxima` y unicidad de cobros con `UNIQUE(placa, sede_id, fecha_dia_operativo)`.
   - Cada carril envía su `sedeId` y `carrilId` al Gateway local; el Backend NestJS al ser *stateless* escala horizontalmente sin sesiones en memoria (JWT).
2. **De 1 sede a *N* sedes:**
   - Todas las entidades operativas (`sedes`, `franjas_horarias`, `tarifas`, `cupos`, `eventos_acceso`, `cobros`) ya están segmentadas por `sede_id`.
   - Cada sede opera su propio Gateway local con caché de pases filtrada por `sede_id`, sincronizada mediante tópicos/suscripciones de **Cloud Pub/Sub** (`pases.sede.<sedeId>`).
3. **Escalado de lectura y datos históricos:**
   - Las consultas de historial (`HU-08`) y reportes se enrutan a una **réplica de lectura** de PostgreSQL para no impactar la latencia transaccional de los carriles.
   - **Particionado declarativo por rango mensual** (`PARTITION BY RANGE (fecha_hora)` en `eventos_acceso` y `PARTITION BY RANGE (fecha_dia_operativo)` en `cobros`) con archivado de particiones > 12 meses hacia Cloud Storage (Parquet/CSV) para mantener índices pequeños y rápidos.

---

## 4. Paso a Paso del Despliegue a Producción (10 Pasos Obligatorios)

| # | Paso | Implementación en MatrIcS |
| :---: | :--- | :--- |
| **1** | **Entornos** | Tres entornos aislados en proyectos GCP separados: **`dev`** (alimentado por merges a `develop`), **`staging`** (alimentado por ramas `release/x.y.z`, réplica exacta de producción con pasarela sandbox) y **`prod`** (desplegado exclusivamente desde tags semánticos `vX.Y.Z` en `main`). |
| **2** | **Contenedores** | Imágenes Docker multi-stage inmutables (`backend/Dockerfile`, `lpr-service/Dockerfile`) etiquetadas con el SHA del commit y el tag semántico (`v1.0.0`), publicadas en **Google Artifact Registry** (nunca se usa `:latest` en producción). |
| **3** | **Infraestructura como Código (IaC)** | **Terraform** versionado en repositorio de infraestructura con módulos reutilizables (`network`, `cloud_sql`, `cloud_run`, `pubsub`, `gcs_photos`, `iam`) y estado remoto cifrado en Cloud Storage con bloqueo (*state locking*). |
| **4** | **CI/CD** | **GitHub Actions**: en cada PR hacia `develop`/`main` ejecuta `.github/workflows/ci.yml` (`typecheck`, `lint`, `build`, `jest` y `vitest`). Al crear un tag `v*.*.*` en `main`, construye las imágenes, escanea vulnerabilidades (Trivy), sube a Artifact Registry y despliega a `staging` → aprobación manual → `prod`. |
| **5** | **Base de datos** | Esquema versionado con migraciones incrementales inmutables (ej. Flyway / node-pg-migrate a partir de `01-schema.sql`), ejecutadas automáticamente como job previo al despliegue. **Backups automáticos diarios** + **PITR** (Point-in-Time Recovery de 7 días) y **prueba mensual de restauración** en instancia temporal verificando integridad de `cobros` y `pagos`. |
| **6** | **Secretos** | Credenciales de BD, `JWT_SECRET`, llaves de pasarela y tokens de gateways viven cifrados en **Google Secret Manager** (nunca en Git ni en imágenes Docker). Cloud Run los inyecta como variables de entorno en tiempo de ejecución mediante una Service Account con privilegio mínimo. |
| **7** | **Red y seguridad** | Dominio corporativo con certificado **TLS 1.3 administrado**, Cloud SQL en VPC privada (sin IP pública), tráfico sede ↔ nube sobre **VPN IPsec / mTLS** y autenticación individual por dispositivo (certificado cliente o API key rotada cada 90 días por Gateway). |
| **8** | **Observabilidad** | Logs estructurados JSON (nivel, `sedeId`, `placa` enmascarada en logs generales, `latencyMs`), métricas de negocio (tasa de apertura, rechazos `LLENO`, tasa de `LECTURA_MANUAL`, errores 5xx) en **Cloud Monitoring**, alertas automáticas (latencia p95 > 1 s, error rate > 2%, gateway offline > 2 min) atendidas por guardia técnica (*on-call*) nivel 1 y escalamiento a ingeniería. |
| **9** | **Despliegue sin caída** | Estrategia **Blue-Green / Canary** nativa de Cloud Run: la nueva revisión recibe inicialmente **10% del tráfico** durante 15 minutos validando `/health` y tasa de errores; si pasa, sube a **100%**. En caso de anomalía, **rollback inmediato (< 30 s)** reasignando 100% del tráfico a la revisión anterior (con migraciones de BD siempre retrocompatibles *expand-and-contract*). |
| **10** | **Alta de una sede nueva** | **Sin cambios de código ni redespliegues:** (1) El administrador crea la sede en `sedes`, sus `franjas_horarias`, `tarifas` y `cupos`; (2) se emite el certificado/credencial del Gateway en Secret Manager; (3) se ejecuta el contenedor del Gateway en la sede con `SEDE_ID=<nuevo_id>` en su `.env`; (4) el Gateway se autentica, descarga la configuración de su sede y queda operativo. |

---

## 5. Seguridad y Cumplimiento Legal (Ley 1581 de 2012 — Colombia)

- **Control de acceso por roles (RBAC):** Separación estricta entre `OPERADOR` (carriles, caja, consultas) y `ADMINISTRADOR` (tarifas, cupos, usuarios, auditoría); contraseñas almacenadas con `bcrypt` (factor de costo 10) y sesiones con JWT de corta duración.
- **Auditoría de acciones manuales:** Todo evento con baja confianza validado o digitado por un operador queda marcado con `lectura_manual = TRUE` y `usuario_id` obligatorio (forzado a nivel de base de datos con `ck_eventos_manual_con_usuario`).
- **Tratamiento de datos personales (Ley 1581 de 2012 y Decreto 1377 de 2013):**
  - La placa vehicular y su fotografía asociada pueden vincularse a un titular (dato personal).
  - **Finalidad y aviso de privacidad:** Señalización visible al ingreso del parqueadero informando la captura fotográfica de placas para control de acceso, liquidación y seguridad, junto con el canal de atención para derechos **ARCO** (Acceso, Rectificación, Cancelación y Oposición).
  - **Minimización y retención:** Política automática de eliminación (*Lifecycle Rule*) en Cloud Storage que purga fotografías de placas a los **30 días calendario** (salvo bloqueo legal por incidente), conservando solo los registros contables exigidos por ley tributaria.
  - **Cifrado:** TLS 1.3 en tránsito y AES-256 en reposo (Cloud SQL y Cloud Storage).

---

## 6. Costo Mensual Estimado (1 Sede vs. 5 Sedes)

Estimación de referencia basada en tarifas públicas de **Google Cloud Platform (región `us-east1`, precios USD/mes)** para operación continua 24/7:

> **Nota para la exposición:** Verificar estas cifras en la [Google Cloud Pricing Calculator](https://cloud.google.com/products/calculator) y adjuntar la captura de pantalla de ambos escenarios (1 sede y 5 sedes) en la presentación.

| Recurso GCP | Escenario 1 Sede (USD/mes) | Escenario 5 Sedes (USD/mes) | Supuesto técnico |
| :--- | :---: | :---: | :--- |
| **Cloud Run (API NestJS)** | $18 | $55 | 1 sede: 1 vCPU / 512 MiB (`min=1`). 5 sedes: autoescalado 2–4 instancias en pico. |
| **Cloud SQL PostgreSQL 16** | $52 | $165 | 1 sede: `db-custom-1-3840` zonal + 20 GB SSD. 5 sedes: `db-custom-2-7680` HA + réplica lectura + 100 GB SSD. |
| **Cloud Storage + CDN (Frontend + Fotos 30 días)** | $6 | $24 | Fotos comprimidas (~150 KB/captura, ~400 ingresos/día/sede, purga a 30 días). |
| **Cloud Load Balancing + Cloud Armor + DNS** | $25 | $35 | 1 balanceador HTTPS compartido + reglas WAF básicas + tráfico adicional de 5 sedes. |
| **Cloud VPN (Site-to-Site)** | $36 | $180 | 1 túnel VPN por sede ($0.05/hora ≈ $36/mes por túnel; alternativa más económica: mTLS sobre HTTPS sin túnel dedicado reduce este rubro a ~$0). |
| **Cloud Pub/Sub + Secret Manager + Artifact Registry** | $5 | $12 | Volumen bajo/moderado de mensajes JSON y secretos rotados. |
| **Cloud Logging & Monitoring** | $8 | $24 | Ingesta de logs estructurados (retención 30 días) + alertas. |
| **TOTAL MENSUAL ESTIMADO (con VPN dedicada)** | **~$150 USD/mes** | **~$495 USD/mes** | Equivale a ~$150/sede (1 sede) y baja a **~$99/sede** (5 sedes) por economía de escala. |
| **Alternativa optimizada (mTLS sin VPN dedicada)** | **~$114 USD/mes** | **~$315 USD/mes** | (~$63/sede en escenario de 5 sedes). |
