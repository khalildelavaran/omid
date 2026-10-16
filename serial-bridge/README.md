# Omid local serial bridge (starter)

This is a generic RS-232/RS-485 transport layer for a computer that is physically connected to a device. It does **not** implement a specific payment terminal protocol and does not initiate payments safely until the vendor's protocol is integrated.

## Install

Python 3.10+ is recommended. On the machine connected to the device:

```bash
cd serial-bridge
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
```

Set environment variables from `.env.example` in your shell. Example for Windows PowerShell:

```powershell
$env:OMID_SERIAL_PORT="COM3"
$env:OMID_SERIAL_BAUD="9600"
$env:OMID_SERIAL_API_KEY="use-a-long-random-secret"
uvicorn app:app --host 127.0.0.1 --port 8765
```

Linux example port is often `/dev/ttyUSB0` or `/dev/ttyS0`; actual settings must match the device manual. RS-485 may need a USB-RS485 adapter and correct 2-wire/4-wire and termination/bias configuration.

## Endpoints

- `GET http://127.0.0.1:8765/health` — local service status only.
- `POST /serial/read?max_bytes=256` with header `X-Omid-Key: <secret>` — read raw bytes.
- `POST /serial/send` with header `X-Omid-Key: <secret>` and JSON body, e.g. `{"data_hex":"02 30 31 03"}` is **not** accepted with spaces; use contiguous hex such as `{"data_hex":"02303103","read_timeout_ms":500}`. This example is illustrative only, not a real device command.

## Important integration/security notes

1. Obtain the exact protocol manual and approved commands from the manufacturer/acquirer. Baud rate, parity, framing, checksum, STX/ETX, address, CRC and response timeout are device-specific.
2. Do not guess commands against a live payment terminal. Start with vendor-approved status/read-only commands and test hardware.
3. Do not log or store card numbers, PINs, track data, or other sensitive payment credentials. Use the terminal/acquirer-approved payment flow and treat only authenticated protocol responses as payment results.
4. The API key is a basic local guard, not a complete production security model. Keep the service bound to `127.0.0.1`; do not expose it to the public internet. A browser integration needs a narrowly scoped local UI bridge and explicit CORS/origin protection before use.
5. This is a transport scaffold. No payment processing, device certification, or protocol conformance is claimed.
