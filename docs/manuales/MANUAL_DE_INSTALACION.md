# Manual de Instalación — MatrIcS (MVP Parqueadero LPR)

**Versión del aplicativo:** `1.0.0`  
**Sistema Operativo probado:** Windows 10/11 (64 bits) y Linux (Ubuntu 22.04+ / CI)  

---

## 1. Tabla de Herramientas y Tecnologías


| Logo | Herramienta / Lenguaje | Descripción | Versión exacta | Link de Descarga Oficial |
| :---: | :--- | :--- | :--- | :--- |
| `[Logo]` | **Node.js** | Entorno de ejecución JavaScript/TypeScript para backend y frontend. | `24.21.0` (LTS ≥ 20) | https://nodejs.org/en/download |
| `[Logo]` | **TypeScript** | Superset tipado de JavaScript usado en backend y frontend. | `5.9.3` (BE) / `~7.0.2` (FE) | https://www.typescriptlang.org/download |
| `[Logo]` | **NestJS** | Framework backend modular en capas con inyección de dependencias nativa. | `11.2.10` | https://nestjs.com/ |
| `[Logo]` | **React** | Biblioteca para la interfaz web operativa de carriles, caja y consultas. | `19.3.1` | https://react.dev/ |
| `[Logo]` | **Vite** | Empaquetador y servidor de desarrollo rápido para el frontend. | `8.3.6` | https://vite.dev/ |
| `[Logo]` | **Tailwind CSS** | Framework de utilidades CSS basado en tokens visuales. | `4.3.5` | https://tailwindcss.com/ |
| `[Logo]` | **PostgreSQL** | Motor de base de datos relacional (unicidad de cobros e idempotencia). | `16` | https://www.postgresql.org/download/ |
| `[Logo]` | **Docker & Docker Compose** | Contenerización y despliegue reproducible de la base de datos y servicios. | Docker Engine ≥ 24 / Compose v2 | https://www.docker.com/products/docker-desktop/ |
| `[Logo]` | **Swagger UI Express** | Documentación interactiva OpenAPI 3.0.3 servida en `/api/docs`. | `5.0.1` | https://swagger.io/tools/swagger-ui/ |
| `[Logo]` | **Jest + Supertest** | Framework de pruebas unitarias e integración HTTP del backend. | `29.7.0` / `7.0.0` | https://jestjs.io/ |
| `[Logo]` | **Vitest + Oxlint** | Ejecutor de pruebas unitarias y linter rápido del frontend. | `5.1.0` / `1.90.0` | https://vitest.dev/ |
| `[Logo]` | **Python + FastAPI (Opcional HU-09)** | Microservicio opcional de reconocimiento de placas con EasyOCR. | Python `3.11` / FastAPI `0.115.6` | https://www.python.org/downloads/ |
| `[Logo]` | **Git** | Control de versiones distribuido bajo flujo GitFlow. | ≥ `2.40` | https://git-scm.com/downloads |
| `[Logo]` | **Visual Studio Code** | Editor de código recomendado para desarrollo y depuración. | Última estable | https://code.visualstudio.com/ |

---

## 2. Guía de Configuración Paso a Paso

### Paso 1: Clonar el repositorio
```bash
git clone https://github.com/JDPinillaa/MatrIcS.git
cd MatrIcS
git checkout develop   # o la rama/tag de release v1.0.0
```

### Paso 2: Configurar variables de entorno (`.env`)
El repositorio **no versiona contraseñas reales**; solo incluye archivos `.env.example`.

1. **Raíz del proyecto (PostgreSQL y semillas iniciales):**
   ```bash
   cp .env.example .env
   ```
   Variables en `.env`:
   ```dotenv
   POSTGRES_DB=parqueadero
   POSTGRES_USER=parqueadero_user
   POSTGRES_PASSWORD=cambiar_esta_clave
   POSTGRES_PORT=5432

   SEED_ADMIN_PASSWORD=cambiar_clave_admin
   SEED_OPERADOR_PASSWORD=cambiar_clave_operador
   ```
2. **Backend (`backend/.env`):**
   ```bash
   cp backend/.env.example backend/.env
   ```
   > Si no se crea `backend/.env`, el backend detecta automáticamente las variables `POSTGRES_*` del archivo `.env` en la raíz.
   ```dotenv
   NODE_ENV=development
   PORT=3000
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=parqueadero_user
   DB_PASSWORD=cambiar_esta_clave
   DB_NAME=parqueadero
   DB_SSL=false
   LPR_MODE=simulator
   OCR_SERVICE_URL=http://localhost:8000
   ```
3. **Frontend (`frontend/.env.local`):**
   ```bash
   cp frontend/.env.example frontend/.env.local
   ```
   ```dotenv
   VITE_API_BASE_URL=http://localhost:3000
   VITE_API_TIMEOUT_MS=8000
   ```

### Resumen de puertos utilizados
| Servicio | Puerto por defecto | URL local |
| :--- | :---: | :--- |
| PostgreSQL 16 | `5432` | `localhost:5432` |
| Backend NestJS + Swagger | `3000` | `http://localhost:3000` · `http://localhost:3000/api/docs` |
| Frontend React + Vite | `5173` | `http://localhost:5173` |
| Microservicio OCR FastAPI (Opcional) | `8000` | `http://localhost:8000/health` |

---

## 3. Despliegue y Verificación de la Base de Datos

### Opción A — Con Docker Compose (Recomendada)
Desde la raíz del repositorio:
```bash
docker compose up -d
docker compose ps
```
Al arrancar por primera vez sobre un volumen limpio, PostgreSQL ejecuta automáticamente en orden:
1. `database/init/01-schema.sql`: crea la función `fn_dia_operativo`, las 10 tablas (`roles`, `usuarios`, `sedes`, `tipos_vehiculo`, `franjas_horarias`, `tarifas`, `cupos`, `eventos_acceso`, `cobros`, `pagos`), restricciones (`pk_`, `fk_`, `uq_`, `ck_`) e índices.
2. `database/init/02-seed.sql`: crea la extensión `pgcrypto` e inserta roles, tipos de vehículo (`CARRO`, `MOTO`), la `Sede Principal` (umbral `80%`), franjas `DIURNA`/`NOCTURNA`, tarifas (`$4.000` / `$2.500` / `$0`), cupos (`50` carros / `30` motos) y los dos usuarios semilla con contraseñas cifradas en `bcrypt`.

Verificar tablas y datos semilla:
```bash
docker exec -it parqueadero-db psql -U parqueadero_user -d parqueadero -c "\dt"
docker exec -it parqueadero-db psql -U parqueadero_user -d parqueadero -c "SELECT email, activo FROM usuarios;"
```

### Opción B — PostgreSQL instalado localmente (sin Docker)
> **Importante:** `02-seed.sql` utiliza la directiva `\getenv` de **`psql` ≥ 15** para leer `SEED_ADMIN_PASSWORD` y `SEED_OPERADOR_PASSWORD` sin guardar claves en el archivo SQL. Por eso debe ejecutarse desde **`psql`** (no desde clientes gráficos que no interpretan meta-comandos `\getenv`).

```bash
# En PowerShell:
$env:SEED_ADMIN_PASSWORD="cambiar_clave_admin"
$env:SEED_OPERADOR_PASSWORD="cambiar_clave_operador"
psql -U postgres -c "CREATE DATABASE parqueadero;"
psql -U postgres -d parqueadero -f database/init/01-schema.sql
psql -U postgres -d parqueadero -f database/init/02-seed.sql
```

---

## 4. Instalación y Arranque de Backend y Frontend

### Backend (NestJS)
```bash
cd backend
npm ci
npm run typecheck
npm test
npm run start:dev
```
Verificación:
- `GET http://localhost:3000/health` debe responder `200 OK` con `"database": "connected"`.
- `GET http://localhost:3000/api/docs` debe mostrar la interfaz interactiva **Swagger UI**.

### Frontend (React + Vite)
```bash
cd frontend
npm ci
npm run typecheck
npm run lint
npm test
npm run dev
```
Abrir `http://localhost:5173` en el navegador.

### Microservicio OCR Opcional (`lpr-service/`, HU-09)
Si se desea probar OCR real sobre imágenes (Plan A):
```bash
cd lpr-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
Luego cambiar `LPR_MODE=ocr` en `backend/.env` y reiniciar el backend. Si el servicio OCR se detiene, el backend conmuta automáticamente al **Plan B local** sin interrumpir el sistema.
