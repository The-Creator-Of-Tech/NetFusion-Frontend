# NetFusion PCAP Service

A FastAPI microservice that parses `.pcap` / `.pcapng` files using pyshark and returns structured network analysis JSON.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/parse` | Upload a pcap file, receive analysis JSON |
| `GET`  | `/health` | Liveness check |

## Running locally

Requires Python 3.10+ and **tshark** installed (`sudo apt install tshark` on Debian/Ubuntu, `brew install wireshark` on macOS).

```bash
cd pcap-service
pip install -r requirements.txt
python main.py
# Service starts on http://localhost:8001
```

## Running with Docker

```bash
cd pcap-service
docker build -t netfusion-pcap .
docker run -p 8001:8001 netfusion-pcap
```

## Test it

```bash
curl -X POST http://localhost:8001/parse \
  -F "file=@/path/to/capture.pcap" \
  | python -m json.tool
```

## Response shape

```json
{
  "totalPackets": 1234,
  "captureStart": "2024-01-15T10:00:00+00:00",
  "captureEnd":   "2024-01-15T10:05:32+00:00",
  "durationSeconds": 332.1,
  "protocols": [
    { "name": "TCP", "count": 900, "percentage": 72.9 }
  ],
  "topTalkers": [
    { "ip": "192.168.1.10", "packetsSent": 400, "packetsReceived": 200, "bytesSent": 512000 }
  ],
  "conversations": [
    { "src": "192.168.1.10", "dst": "8.8.8.8", "srcPort": 54321, "dstPort": 53,
      "protocol": "DNS", "packets": 10, "bytes": 1200 }
  ],
  "timeline": [
    { "second": 0, "packetsPerSecond": 45, "bytesPerSecond": 32000 }
  ],
  "anomalies": [
    { "type": "PORT_SCAN", "description": "192.168.1.5 contacted 15 distinct ports...", "timestamp": "..." }
  ]
}
```

## Anomaly detection

| Type | Trigger |
|------|---------|
| `PORT_SCAN` | One source IP hits ≥ 10 distinct destination ports |
| `LARGE_FLOW` | A single conversation transfers > 10 MB |
| `UNCOMMON_PROTOCOL` | Any protocol outside TCP/UDP/ICMP/DNS/HTTP/HTTPS/TLS/ARP |

## Limits

- Max file size: **100 MB** (returns HTTP 400 if exceeded)
- Invalid magic bytes → HTTP 400
- Files < 24 bytes → HTTP 400
