## Visual Diff Verification

この PR に関連するビジュアル回帰チェックを実行しましたか？以下を PR 説明に明記してください。

- 実行コマンド: `npm run test:visual:flip-css-removal`  
  （ベースラインキャプチャ時は `node scripts/playwright_capture_flip_baseline.js`）
- Artifact path: `artifacts/visual_flip_removal/` (baseline / current / diff)  
- Visual-diff result: `total mismatched pixels = <数値>`  

チェックリスト:
- [ ] Visual diff を実行し、Artifact を添付した
- [ ] `total mismatched pixels` を PR 説明に記載した（例: `0`）
- [ ] ベースラインを更新した場合は、その理由と変更ファイルを記載した
