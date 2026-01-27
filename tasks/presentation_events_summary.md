Presentation Events / BoardOps — Short Summary

We consolidated board mutations into `BoardOps` (spawnAt/destroyAt/changeAt/moveAt) to centralize stoneId allocation and emit deterministic `presentationEvents` (SPAWN/DESTROY/CHANGE/MOVE). This fixes duplicated logic (e.g., destroy implementations), enables precise UI replay (stoneId tracking), and simplifies future animation/replayer development.

Current status: PoC implemented for `breeding_01`; BoardOps integrated into core flows; unit tests and smoke tests pass. Next steps: migrate remaining card logic to BoardOps, add Playwright assertions for presentationEvents → DOM, and create CI workflow to run E2E on PRs.