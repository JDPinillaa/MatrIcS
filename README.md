# MatrIcS — Sistema de Parqueadero Automatizado por Lectura de Placas (MVP)

**Proyecto de Ingeniería de Software II — III Corte**  
Universidad Autónoma de Manizales · Programa de Ingeniería de Sistemas

---

## 1. Descripción

**MatrIcS** es un Producto Mínimo Viable (MVP) de costo cero para automatizar el ingreso, la clasificación vehicular (`CARRO` / `MOTO`), el control de cupos, la liquidación única por **día operativo (`06:00` a `05:59`)**, el registro idempotente de pagos en caja y el control de salida con barrera simulada a partir de lectura de placas (LPR).

Diseñado con **arquitectura en capas**, **5 principios SOLID**, **patrones de diseño** (`Strategy`, `Chain of Responsibility`, `State`, `Adapter`, `Factory`, `Repository`), **pruebas unitarias automatizadas**, **Scrum** y **GitFlow**.

---

## 2. Stack Tecnológico

| Capa | Tecnología | Versión base |
| :--- | :--- | :--- |
| **Backend / API** | NestJS + TypeScript + Swagger UI (`openapi.yaml`) | NestJS `11.2`, Node `24` |
| **Frontend** | React + Vite + Tailwind CSS + React Router | React `19.3`, Vite `8.3` |
| **Base de Datos** | PostgreSQL + Docker Compose | PostgreSQL `16` |
| **Motor LPR (Opcional)** | Python + FastAPI + EasyOCR (`lpr-service/`) | Python `3.11` |
| **Pruebas y Calidad** | Jest + Supertest (Backend), Vitest + Oxlint (Frontend), GitHub Actions | Jest `29.7`, Vitest `5.1` |

---

## 3. Estructura del Repositorio

```text
MatrIcS/
├── .env.example                    # Variables de PostgreSQL y usuarios semilla
├── docker-compose.yml              # Contenedor PostgreSQL 16 + carga automática de SQL
├── database/
│   └── init/
│       ├── 01-schema.sql           # 10 tablas, constraints UNIQUE/CHECK e índices
│       └── 02-seed.sql             # Roles, tipos, sede principal, franjas, tarifas, cupos y usuarios
├── backend/
│   ├── openapi.yaml                # Contrato OpenAPI 3.0.3 (única fuente de verdad)
│   ├── Dockerfile                  # Build multi-stage para despliegue contenerizado
│   ├── .env.example                # Variables del backend (fallback automático a POSTGRES_*)
│   └── src/
│       ├── domain/                 # Entidades, reglas (Strategy, State), excepciones y puertos (DIP/ISP)
│       ├── application/            # Casos de uso y cadena de validaciones (Chain of Responsibility)
│       ├── infrastructure/         # Adaptadores PostgreSQL, LPR/OCR, Swagger UI, filtro global HTTP
│       └── presentation/           # Controladores REST y DTOs validados
├── frontend/
│   ├── .env.example                # VITE_API_BASE_URL y timeout
│   └── src/                        # Vistas operativas, Barrera Simulada, cliente HTTP y store de sesión
├── lpr-service/                    # Microservicio opcional Python FastAPI + EasyOCR (HU-09)
└── docs/                           # MER (.drawio/.png), propuesta productiva y manuales
```

---

## 4. Arranque Rápido Local (Plan B Garantizado)

### 4.1. Base de Datos (PostgreSQL 16 con Docker Compose)

```bash
cp .env.example .env
# Edita .env con claves locales (nunca subir .env al repositorio)
docker compose up -d
```

Al iniciar por primera vez, PostgreSQL ejecuta automáticamente `database/init/01-schema.sql` y `database/init/02-seed.sql`.

Usuarios semilla iniciales (contraseñas definidas en `.env`):
- **Administrador:** `admin@parqueadero.local`
- **Operador:** `operador@parqueadero.local`

### 4.2. Backend (NestJS + Swagger UI)

```bash
cd backend
npm install
cp .env.example .env
npm run start:dev
```

- **API base:** `http://localhost:3000`
- **Health check:** `http://localhost:3000/health`
- **Documentación Swagger interactiva:** `http://localhost:3000/api/docs`
- **Especificación JSON:** `http://localhost:3000/api/docs-json`

### 4.3. Frontend (React + Vite)

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

- **Interfaz web:** `http://localhost:5173`

---

## 5. Verificación y Pruebas Automatizadas

### Backend
```bash
cd backend
npm run typecheck
npm run build
npm test
```

### Frontend
```bash
cd frontend
npm run typecheck
npm run lint
npm test
npm run build
```

---

## 6. Reglas de Negocio Clave del MVP

- **Día operativo (`S-02`):** de `06:00:00` a `05:59:59` del día calendario siguiente (`America/Bogota`).
- **Clasificación colombiana:** `CARRO` (`AAA123`), `MOTO` (`AAA12A` y formato antiguo `AAA12`).
- **Tarifas (`RN-01`, `RN-02`, `RN-07`):** moto configurable en `$0` (exenta); para tarifas positivas, `tarifa nocturna < tarifa diurna`; cada cobro guarda su tarifa histórica inmutable.
- **Unicidad e idempotencia (`F-03`, `F-04`, `RN-03`):** restricción `UNIQUE(placa, sede_id, fecha_dia_operativo)` en `cobros` y llave única de idempotencia en `pagos` con pase vigente hasta `05:59:59`.
- **Salida (`RN-06`):** la barrera simulada solo abre si el cobro del día está `PAGADO` o el vehículo está exento / sin cobro pendiente.

---

## 7. Flujo GitFlow y Equipo

- Ramas principales: `main` (releases con tag `v1.0.0`, protegida) y `develop` (integración por Pull Request revisado).
- Ramas de trabajo: `feature/TT-*`, `feature/HU-*`, `release/x.y.z`, `hotfix/x.y.z`.
- Integrantes: **Juan Diego Pinilla**, **María Camila Méndez Ramírez**, **Johan Andrés Villada Valencia**, **María Paz Bustamante**.
