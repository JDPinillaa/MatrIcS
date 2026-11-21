# Manual de Administración — MatrIcS (MVP Parqueadero LPR)

**Audiencia:** Administradores del sistema y personal de soporte técnico.  

---

## 1. Configuración del Sistema: Roles, Permisos y Usuarios

### 1.1. Matriz de Roles y Permisos
El sistema controla el acceso mediante dos roles definidos en la tabla `roles`:

| Módulo / Operación | `OPERADOR` | `ADMINISTRADOR` |
| :--- | :---: | :---: |
| Iniciar sesión y consultar perfil (`/auth/login`, `/auth/perfil`) | Sí | Sí |
| Operar carril de entrada y salida (`/accesos/ingreso`, `/accesos/salida`) | Sí | Sí |
| Validar / corregir lecturas manuales (`/accesos/validacion-manual`) | Sí | Sí |
| Consultar cobro pendiente y registrar pago en efectivo (`/cobros/pendiente`, `/pagos`) | Sí | Sí |
| Consultar historial filtrado de eventos y cobros (`/eventos`, `/cobros`) | Sí | Sí |
| Modificar tarifas por tipo de vehículo y franja (`PUT /sedes/{id}/tarifas`) | **No (403)** | **Sí** |
| Modificar franjas horarias (`PUT /sedes/{id}/franjas`) | **No (403)** | **Sí** |
| Modificar capacidad máxima de cupos (`PUT /sedes/{id}/cupos`) | **No (403)** | **Sí** |
| Modificar umbral de confianza LPR (`PUT /sedes/{id}/umbral-confianza`) | **No (403)** | **Sí** |

### 1.2. Usuarios Semilla Iniciales
Creados automáticamente por `database/init/02-seed.sql` con hash `bcrypt` (`pgcrypto`):
- **Administrador:** `admin@parqueadero.local` (contraseña configurada en `SEED_ADMIN_PASSWORD` del `.env`).
- **Operador:** `operador@parqueadero.local` (contraseña configurada en `SEED_OPERADOR_PASSWORD` del `.env`).

> **Buena práctica de seguridad:** Cambiar las contraseñas por defecto inmediatamente antes de operar en un entorno compartido. Nunca almacenar contraseñas en texto plano en la base de datos ni en archivos versionados.

### 1.3. Reglas de Parametrización Comercial y Operativa
Al modificar la configuración desde el panel de Administración:
- **Tarifas de carros (`RN-02`):** la tarifa nocturna debe ser **estrictamente menor** que la tarifa diurna. Cualquier intento con `nocturna >= diurna` es rechazado con HTTP `400`.
- **Tarifas de motos (`RN-01`):** pueden configurarse en `$0` (diurna y nocturna en `0.00` = exentas de cobro) o con tarifas positivas cumpliendo igualmente `nocturna < diurna`.
- **Inmutabilidad histórica (`RN-07`):** cambiar una tarifa solo afecta a los nuevos cobros generados a partir de ese instante; los cobros ya creados conservan su `valor_aplicado` y `franja_aplicada`.
- **Día operativo (`S-02`):** va de `06:00:00` a `05:59:59` del día siguiente (`America/Bogota`).
- **Cupos (`F-07`):** la capacidad máxima debe ser `>= 0` y no puede fijarse por debajo del número de vehículos actualmente ocupados (`ck_cupos_ocupados`).
- **Umbral de confianza (`F-06`):** porcentaje entre `0` y `100` (por defecto `80.00`). Lecturas por debajo de este umbral pausan la barrera y exigen intervención manual del operador.

---

## 2. Mantenimiento del Sistema

### 2.1. Respaldos (Backups) de Base de Datos
Ejecutar un respaldo lógico comprimido desde el host con Docker Compose:
```bash
mkdir -p backups
docker exec parqueadero-db pg_dump -U parqueadero_user -d parqueadero -F c -f /tmp/matrics_backup.dump
docker cp parqueadero-db:/tmp/matrics_backup.dump ./backups/matrics_$(date +%Y%m%d_%H%M).dump
```

### 2.2. Prueba de Restauración
Para verificar que un respaldo es usable (recomendado mensualmente en un entorno de prueba):
```bash
docker cp ./backups/matrics_YYYYMMDD_HHMM.dump parqueadero-db:/tmp/restore.dump
docker exec parqueadero-db pg_restore -U parqueadero_user -d parqueadero --clean --if-exists /tmp/restore.dump
```

### 2.3. Reinicio limpio en entorno local / pruebas
Si se requiere recrear la base de datos desde cero (elimina todos los datos almacenados):
```bash
docker compose down -v
docker compose up -d
```

### 2.4. Limpieza de Logs y Auditoría
- **Logs del contenedor de BD:** revisar con `docker compose logs --tail=200 db`. En despliegue productivo se configuran drivers de rotación (`max-size: "10m"`, `max-file: "5"`) para evitar agotamiento de disco.
- **Auditoría de lecturas manuales:** consultar eventos donde `lectura_manual = TRUE` junto con el `usuario_id` responsable:
  ```sql
  SELECT e.fecha_hora, e.placa, e.tipo_evento, e.confianza_lectura, u.email AS operador, e.motivo
  FROM eventos_acceso e
  JOIN usuarios u ON u.id = e.usuario_id
  WHERE e.lectura_manual = TRUE
  ORDER BY e.fecha_hora DESC
  LIMIT 50;
  ```

### 2.5. Actualización de Datos Maestros
- **Alta de un nuevo usuario (SQL administrativo):**
  ```sql
  INSERT INTO usuarios (rol_id, nombre_completo, email, password_hash)
  SELECT r.id, 'Nombre Operador', lower('nuevo.operador@parqueadero.local'), crypt('ClaveSegura123*', gen_salt('bf', 10))
  FROM roles r
  WHERE r.nombre = 'OPERADOR';
  ```
- **Desactivar un usuario sin perder trazabilidad histórica:**
  ```sql
  UPDATE usuarios SET activo = FALSE WHERE email = 'nuevo.operador@parqueadero.local';
  ```
- **Verificación de salud del sistema:** consultar `GET http://localhost:3000/health` (debe devolver `"status": "ok"` y `"database": "connected"`).
