---
applyTo: "game/**"
---
- ブラウザAPI（`window`, `document`, DOM）に触れない。
- 時間API（`setTimeout`, `setInterval`, `requestAnimationFrame`, `Date.now`, `performance.now`）を使わない。
- `Math.random()` を使わない（乱数は `prng` で注入する）。
- `ui/**` を import/require しない。
- UI/演出に関する副作用は `events[]` / `presentationEvents[]` で表現する（直接UIを触らない）。
