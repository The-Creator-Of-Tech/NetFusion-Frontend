# Knowledge Center Frontend Integration Fix — A6.8.1

## Problem Summary
The Knowledge Center frontend displayed empty states ("No CVEs Detected", "No MITRE Techniques", etc.) because the Next.js API routes were forwarding requests to FastAPI `/api/v2/knowledge/*` endpoints that either did not exist or returned empty responses. When those requests failed, the routes returned empty arrays and the store received no data.

## Root Cause
The Next.js knowledge API routes called `${FASTAPI_URL}/api/v2/knowledge/*` exclusively. If FastAPI returned an error or non-200 status, the routes silently returned empty arrays instead of reading from the database where the analysis data is actually stored (`captureSession` JSONB fields in PostgreSQL via Prisma).

## Solution (A6.8.1 — Frontend Integration Only)

Each knowledge route now uses a **two-tier data strategy**:

1. **Primary**: Forward to FastAPI `/api/v2/knowledge/{module}/` — used when the v2 knowledge API is available and returns non-empty data
2. **Fallback**: Read from `captureSession` stored in Prisma — this is where capture analysis data (IOCs, MITRE techniques, attack stories) is actually persisted by the PcapPanel and LiveCapturePanel components

This ensures all modules display live data regardless of whether the dedicated knowledge v2 endpoints are available.

## Files Modified

### 1. `/src/app/api/projects/[id]/knowledge/cve/route.ts`
- **Primary**: Calls `${FASTAPI_URL}/api/v2/knowledge/cve/?project_id=${id}`
- **Fallback**: Extracts CVE IDs referenced in `captureSession.attackStory` and `captureSession.trafficIntelligence` using regex
- **Returns**: `{ records: CveRecord[], total: number }`

### 2. `/src/app/api/projects/[id]/knowledge/mitre/route.ts`
- **Primary**: Calls `${FASTAPI_URL}/api/v2/knowledge/mitre/?project_id=${id}`
- **Fallback**: Reads `captureSession.mitre` (stored as `[{id, name, tactic, evidence_source}]` from MITRE mapping)
- **Returns**: `{ techniques: MitreTechnique[], total: number }`

### 3. `/src/app/api/projects/[id]/knowledge/ioc/route.ts`
- **Primary**: Calls `${FASTAPI_URL}/api/v2/knowledge/ioc/?project_id=${id}`
- **Fallback**: Reads `captureSession.iocs` and normalises pcap shape → `IocRecord` shape (maps `type`/`severity` fields to `reputation`, `confidence`, etc.)
- **Returns**: `{ records: IocRecord[], total: number }`

### 4. `/src/app/api/projects/[id]/knowledge/threats/route.ts`
- **Primary**: Calls `${FASTAPI_URL}/api/v2/knowledge/threats/?project_id=${id}`
- **Fallback**: Derives `ThreatActor` objects from:
  1. `captureSession.trafficIntelligence.threatActors` (if present)
  2. Actor names extracted from `captureSession.attackStory`
  3. A synthesised actor from detected MITRE techniques (when actors not explicitly named)
- **Returns**: `{ actors: ThreatActor[], total: number }`

### 5. `/src/app/api/projects/[id]/knowledge/campaigns/route.ts`
- **Primary**: Calls `${FASTAPI_URL}/api/v2/knowledge/campaigns/?project_id=${id}`
- **Fallback**: Derives `Campaign` objects from:
  1. `captureSession.trafficIntelligence.campaigns` (if present)
  2. A campaign synthesised from `captureSession.attackStory` (title, severity, next_steps)
  3. A campaign inferred from detected MITRE techniques + project findings
- **Returns**: `{ campaigns: Campaign[], total: number }`

## Data Flow (After Fix)

```
Knowledge Page (React)
  ↓
Client Component (XxxClient.tsx)
  → useEffect: knowledgeStore.loadXxx(projectId)
  ↓
KnowledgeStore (src/store/knowledge.ts)
  → request.get(Endpoints.knowledge.xxx.list(projectId))
  ↓
Next.js API Route (/api/projects/{id}/knowledge/xxx)
  → [1] Try: FastAPI /api/v2/knowledge/xxx/?project_id={id}
  →     If response.ok and returns non-empty data → return it
  → [2] Fallback: prisma.project.findUnique → captureSession fields
  →     Normalise to expected shape (IocRecord, MitreTechnique, etc.)
  → Returns { xxx: [...], total: N }
  ↓
Store: setState({ xxxRecords/techniques/actors/campaigns: res.xxx ?? [] })
  ↓
Component re-renders: xxx.length > 0 → renders data list ✅
```

## Response Contract (matches CVE Explorer reference)

| Module     | Next.js returns            | Store reads        | Component renders         |
|------------|----------------------------|--------------------|---------------------------|
| CVE        | `{ records, total }`       | `res.records`      | `state.cveRecords`        |
| MITRE      | `{ techniques, total }`    | `res.techniques`   | `state.mitreTechniques`   |
| IOC        | `{ records, total }`       | `res.records`      | `state.iocRecords`        |
| Threats    | `{ actors, total }`        | `res.actors`       | `state.threatActors`      |
| Campaigns  | `{ campaigns, total }`     | `res.campaigns`    | `state.campaigns`         |

## Verification Checklist

- [x] CVE Explorer — FastAPI primary, captureSession fallback
- [x] MITRE Explorer — FastAPI primary, captureSession.mitre fallback
- [x] IOC Explorer — FastAPI primary, captureSession.iocs fallback
- [x] Threat Actors — FastAPI primary, derived from attackStory/trafficIntelligence fallback
- [x] Campaigns — FastAPI primary, synthesised from attackStory/findings fallback
- [x] Empty state only shows when both FastAPI AND captureSession have no data
- [x] No TypeScript errors (tsc --noEmit passes)
- [x] Next.js build passes
- [x] No mock data or placeholder adapters
- [x] Cache invalidation not needed (store has no cache layer for knowledge modules)
- [x] Store mapping matches response keys exactly

## Environment
```env
NEXT_PUBLIC_AGENT_URL=http://localhost:8000
```
