"""Local serial bridge for Omid. Generic transport only; device protocol must be supplied by vendor."""
from __future__ import annotations

import os
import threading
import time
from contextlib import asynccontextmanager
from typing import Optional

import serial
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel, Field

PORT = os.getenv("OMID_SERIAL_PORT", "COM3" if os.name == "nt" else "/dev/ttyUSB0")
BAUD = int(os.getenv("OMID_SERIAL_BAUD", "9600"))
BYTESIZE = int(os.getenv("OMID_SERIAL_BYTESIZE", "8"))
PARITY = os.getenv("OMID_SERIAL_PARITY", "N").upper()
STOPBITS = float(os.getenv("OMID_SERIAL_STOPBITS", "1"))
TIMEOUT = float(os.getenv("OMID_SERIAL_TIMEOUT", "1.0"))
API_KEY = os.getenv("OMID_SERIAL_API_KEY", "")
MAX_TX_BYTES = 256

_lock = threading.Lock()
_ser: Optional[serial.Serial] = None
_last_error: Optional[str] = None


def get_serial() -> serial.Serial:
    global _ser, _last_error
    if _ser and _ser.is_open:
        return _ser
    try:
        _ser = serial.Serial(
            port=PORT, baudrate=BAUD, bytesize=BYTESIZE,
            parity=PARITY, stopbits=STOPBITS,
            timeout=TIMEOUT, write_timeout=TIMEOUT,
        )
        _last_error = None
        return _ser
    except (serial.SerialException, ValueError) as exc:
        _last_error = str(exc)
        raise HTTPException(status_code=503, detail=f"Serial port unavailable: {_last_error}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    global _ser
    if _ser and _ser.is_open:
        _ser.close()

app = FastAPI(title="Omid Local Serial Bridge", version="0.1.0", lifespan=lifespan)


class SendRequest(BaseModel):
    # Hex only avoids encoding ambiguity. Only send commands documented by the device vendor.
    data_hex: str = Field(min_length=2, max_length=MAX_TX_BYTES * 2, pattern=r"^(?:[0-9a-fA-F]{2})+$")
    read_timeout_ms: int = Field(default=500, ge=0, le=5000)
    max_response_bytes: int = Field(default=256, ge=1, le=1024)


def authorize(x_omid_key: Optional[str]) -> None:
    # Require a configured secret. Do not expose this API to the public internet.
    if not API_KEY or x_omid_key != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/health")
def health():
    return {
        "service": "omid-serial-bridge",
        "port_configured": bool(PORT),
        "serial_open": bool(_ser and _ser.is_open),
        "baudrate": BAUD,
        "last_error": _last_error,
        "note": "Transport status only; not a payment approval status.",
    }


@app.post("/serial/read")
def read_serial(max_bytes: int = 256, x_omid_key: Optional[str] = Header(default=None)):
    authorize(x_omid_key)
    if not 1 <= max_bytes <= 1024:
        raise HTTPException(status_code=400, detail="max_bytes must be between 1 and 1024")
    with _lock:
        ser = get_serial()
        try:
            data = ser.read(max_bytes)
            return {"data_hex": data.hex().upper(), "bytes_read": len(data), "timestamp": time.time()}
        except serial.SerialException as exc:
            raise HTTPException(status_code=502, detail=f"Serial read failed: {exc}")


@app.post("/serial/send")
def send_serial(req: SendRequest, x_omid_key: Optional[str] = Header(default=None)):
    authorize(x_omid_key)
    payload = bytes.fromhex(req.data_hex)
    with _lock:
        ser = get_serial()
        try:
            ser.reset_input_buffer()
            written = ser.write(payload)
            ser.flush()
            if req.read_timeout_ms:
                old_timeout = ser.timeout
                ser.timeout = req.read_timeout_ms / 1000
                try:
                    response = ser.read(req.max_response_bytes)
                finally:
                    ser.timeout = old_timeout
            else:
                response = b""
            return {
                "bytes_written": written,
                "response_hex": response.hex().upper(),
                "bytes_read": len(response),
                "timestamp": time.time(),
                "note": "Raw transport response only; parse it using the device's official protocol.",
            }
        except (serial.SerialException, serial.SerialTimeoutException) as exc:
            raise HTTPException(status_code=502, detail=f"Serial communication failed: {exc}")
