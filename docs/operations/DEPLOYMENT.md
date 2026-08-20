# DEPLOYMENT.md — Production Hosting & Deployment Strategy

> **Document Status:** `DECIDED` (Strategy Defined; Deployment Execution Not Yet Performed)
> **Target Architecture:** Static HTTPS Web Application & Client-Side Edge Distribution

---

## 1. Deployment Philosophy & Target Environment

GearCube Lab is architected as a **100% static, client-side web application** for all initial simulation, classical solving, and research benchmarking phases (Phases 0 through 5).

### Key Deployment Characteristics:
- **Zero Server Infrastructure:** The core application requires no backend API server, database, or server-side compute. All state mutations, 3D rendering, and graph searches execute within the user's browser.
- **Static HTTPS Hosting:** Can be deployed to any static CDN host supporting modern web standards (e.g., GitHub Pages, Cloudflare Pages, Vercel Static, Netlify, AWS S3 + CloudFront).
- **Web Worker Support:** The hosting environment and bundling configuration must deliver Web Worker scripts as standard ES modules with appropriate MIME types (`application/javascript`).

> [!NOTE]
> Hosting providers are not yet permanently selected. Any modern static HTTPS provider meeting the requirements below is compatible.

---

## 2. Browser & Security Requirements

### 2.1. HTTPS Enforcement
- **Mandatory HTTPS:** Secure context (`https://`) is strictly required in production to support:
  - Web Workers and modern WebGL2 rendering contexts.
  - WebRTC `navigator.mediaDevices.getUserMedia` for the future Phase 7 webcam state scanner.

### 2.2. Cross-Origin & Isolation Headers
If high-resolution timers (`performance.now()`) or shared memory (`SharedArrayBuffer`) are evaluated for advanced parallel solvers in future phases, the hosting server should configure the following response headers:
```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

### 2.3. Zero-Secret Posture
- Under no circumstances will private API keys, proprietary tokens, or backend credentials be bundled into client-side production JavaScript.
- All puzzle solving, state manipulation, and heuristic evaluations are open and local-first.

---

## 3. Camera & Vision Security Posture (Future Phase 7)

When camera-based cube reconstruction is introduced in Phase 7:
1. **Explicit User Consent:** The browser's native permission modal must be triggered only when the user explicitly clicks "Scan Physical Cube".
2. **Local-First Processing:** Image frames from the camera feed are processed strictly in-memory via HTML5 canvas/WebGL and discarded immediately.
3. **No Automatic Persistence:** Captured images must never be transmitted to external servers or persisted to permanent cloud storage by default.

---

## 4. Build & Distribution Artifacts (Future Phase 8)

*(The following output layout represents the target build structure once Vite bundling is configured.)*

```text
dist/
├── index.html                  # Main entry point HTML
├── favicon.ico
├── assets/
│   ├── index-[hash].js         # Main application bundle (React / Three.js / Zustand)
│   ├── index-[hash].css        # Core application styles
│   ├── solver-worker-[hash].js # Dedicated Web Worker bundle
│   └── models/                 # Optimized 3D GLTF / GLB assets
```

---

## 5. Deployment Validation Checklist (Pre-Release Gate)

Before declaring production deployment complete in Phase 8:
- [ ] Static bundle builds successfully with zero TypeScript compiler errors (`npm run build`).
- [ ] Application loads and renders 3D viewport on desktop Chrome, Firefox, Safari, and Edge.
- [ ] Solver Web Worker spawns and communicates over HTTPS without CORS or MIME type violations.
- [ ] Zero network requests to third-party tracking or telemetry services without opt-in.
- [ ] Lighthouse audit scores: Performance $\ge 90$, Accessibility $\ge 95$, Best Practices $\ge 95$.
