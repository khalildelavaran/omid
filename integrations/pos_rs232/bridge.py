"""Local Omid RS-232 bridge. POS transaction protocol must be vendor-specific."""
import os
import threading
from contextlib import asynccontextmanager
import serial
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

PORT = os.getenv("OMID_POS_SERIAL_PORT", "COM1" if os.name == "nt" else "/dev/ttyUSB0")
BAUD = int(os.getenv("OMID_POS_BAUD_RATE", "9600"))
TOKEN = os.getenv("OMID_POS_BRIDGE_TOKEN", "")
ORIGINS = [x.strip() for x in os.getenv("OMID_POS_ALLOWED_ORIGINS", "http://localhost:3000").split(",") if x.strip()]
serial_port = None
serial_lock = threading.Lock()
serial_error = None

def auth(authorization):
    if not TOKEN:
        raise HTTPException(status_code=503, detail="OMID_POS_BRIDGE_TOKEN is not configured")
    if authorization != "Bearer " + TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")

@asynccontextmanager
async def lifespan(app):
    global serial_port, serial_error
    try:
        serial_port = serial.Serial(
            PORT, BAUD, bytesize=int(os.getenv("OMID_POS_DATA_BITS", "8")),
            parity=os.getenv("OMID_POS_PARITY", "N").upper(),
            stopbits=int(os.getenv("OMID_POS_STOP_BITS", "1")),
            timeout=0.2, write_timeout=1,
        )
        serial_error = None
    except Exception as exc:
        serial_port = None
        serial_error = type(exc).__name__
    yield
    if serial_port and serial_port.is_open:
        serial_port.close()

app = FastAPI(title="Omid POS RS-232 Bridge", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=ORIGINS, allow_credentials=False,
                   allow_methods=["GET", "POST"], allow_headers=["Authorization", "Content-Type"])

class SerialWrite(BaseModel):
    payload_hex: str = Field(min_length=2, max_length=2048, pattern=r"^(?:[0-9a-fA-F]{2})+$")

@app.get("/health")
def health():
    return {"service": "omid-pos-rs232-bridge", "serial_configured": bool(serial_port and serial_port.is_open),
            "port": PORT, "baud_rate": BAUD, "last_error": serial_error,
            "transaction_protocol": "not-configured"}

@app.get("/v1/serial/status")
def status(authorization: str | None = Header(default=None)):
    auth(authorization)
    return {"connected": bool(serial_port and serial_port.is_open), "port": PORT,
            "baud_rate": BAUD, "last_error": serial_error,
            "note": "Open port does not confirm POS protocol compatibility."}

@app.get("/v1/serial/read")
def read_serial(max_bytes: int = 256, authorization: str | None = Header(default=None)):
    auth(authorization)
    if not serial_port or not serial_port.is_open:
        raise HTTPException(status_code=503, detail="Serial port is not connected")
    if not 1 <= max_bytes <= 1024:
        raise HTTPException(status_code=400, detail="max_bytes must be 1..1024")
    try:
        with serial_lock:
            raw = serial_port.read(max_bytes)
        return {"received_bytes": len(raw), "payload_hex": raw.hex()}
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Serial read failed: " + type(exc).__name__) from exc

@app.post("/v1/serial/write")
def write_serial(data: SerialWrite, authorization: str | None = Header(default=None)):
    auth(authorization)
    if not serial_port or not serial_port.is_open:
        raise HTTPException(status_code=503, detail="Serial port is not connected")
    try:
        with serial_lock:
            count = serial_port.write(bytes.fromhex(data.payload_hex))
            serial_port.flush()
        return {"written_bytes": count, "sent": True}
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Serial write failed: " + type(exc).__name__) from exc
