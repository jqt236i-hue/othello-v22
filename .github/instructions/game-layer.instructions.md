---
applyTo: "game/**"
---
- ブラウザAPI（`window`, `document`, DOM）に触れない。
- 時間API（`setTimeout`, `setInterval`, `requestAnimationFrame`, `Date.now`, `performance.now`）を使わない。
- `Math.random()` を使わない（乱数は `prng` で注入する）。
- `ui/**` を import/require しない。
- UI/演出に関する副作用は `events[]` / `presentationEvents[]` で表現する（直接UIを触らない）。
- Flip（反転）と Destroy（破壊）は別物：Destroy は EMPTY 化（Flip ではない）／チャージは Flip のみで加算する（Destroy では加算しない）。
