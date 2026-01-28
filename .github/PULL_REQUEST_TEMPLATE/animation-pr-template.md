## PR for Animation: [Flip]

**What**
- Implement flip animation (UI) and ensure pipeline maps `CHANGE`->`flip`.

**Checklist**
- [ ] Unit tests added/updated and pass (`npm run test:jest`)
- [ ] `check:game-purity` passes
- [ ] Visual baseline added or visual check passes (`npm run test:e2e:present-visual`)
- [ ] NOANIM behavior verified
- [ ] Accessibility: `prefers-reduced-motion` considered
- [ ] Reviewer approval

**Notes**
- Keep PR small: only flip-related files and tests
- Add visual baseline to `visual-baselines/` when ready
