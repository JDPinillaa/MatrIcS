import io
import re
from typing import Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image

PLATE_PATTERN = re.compile(r"([A-Z]{3}[0-9]{2}[0-9A-Z]?)")
ALLOWED_TYPES = {"image/jpeg", "image/jpg", "image/png"}

app = FastAPI(
    title="MatrIcS LPR/OCR Service",
    version="1.0.0",
    description="Microservicio opcional de extracción de placas colombianas (HU-09).",
)

_reader = None


def _get_reader():
    global _reader
    if _reader is None:
        import easyocr  # Lazy import para arrancar rápido y permitir Plan B sin GPU

        _reader = easyocr.Reader(["en"], gpu=False)
    return _reader


def extract_plate_from_detections(
    detections: list[tuple],
) -> tuple[Optional[str], float]:
    best_plate: Optional[str] = None
    best_conf = 0.0

    for item in detections:
        if len(item) < 3:
            continue
        raw_text = str(item[1])
        conf = float(item[2])
        cleaned = re.sub(r"[^A-Z0-9]", "", raw_text.upper())
        match = PLATE_PATTERN.search(cleaned)
        if match and conf >= best_conf:
            best_plate = match.group(1)
            best_conf = conf

    return best_plate, round(max(0.0, min(100.0, best_conf * 100.0)), 2)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "matrics-lpr-service",
        "engine": "easyocr",
    }


@app.post("/ocr/placa")
async def recognize_plate(imagen: UploadFile = File(...)):
    if imagen.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Formato no soportado. Envíe una imagen .jpg o .png.",
        )

    raw_bytes = await imagen.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="La imagen está vacía.")

    try:
        import numpy as np

        pil_img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
        np_img = np.array(pil_img)
        reader = _get_reader()
        detections = reader.readtext(np_img)
        placa, confianza = extract_plate_from_detections(detections)
        return {"placa": placa, "confianza": confianza}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Error procesando imagen OCR: {exc}"
        ) from exc
