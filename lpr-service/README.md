# MatrIcS — Microservicio LPR / OCR (HU-09)

Microservicio opcional en **Python + FastAPI + EasyOCR** para extraer placas colombianas (`AAA123`, `AAA12A`, `AAA12`) y su porcentaje de confianza desde una imagen `.jpg` o `.png`.

## Arranque local

```bash
cd lpr-service
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Conexión con el Backend (NestJS)

En `backend/.env`:

```dotenv
LPR_MODE=ocr
OCR_SERVICE_URL=http://localhost:8000
OCR_TIMEOUT_MS=5000
```

Si el microservicio está apagado o responde con timeout, el `FastApiOcrAdapter` en `backend/` activa automáticamente el **respaldo local (Plan B)** devolviendo `requiereValidacionManual: true` para que el operador continúe sin interrumpir el carril.
