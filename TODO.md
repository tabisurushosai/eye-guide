# eye-guide TODO
- [ ] T001: src/content.ts にカーソル縦位置追従の読書ラインオーバーレイ(横帯/下線/集中窓)を実装、show/hide関数
- [ ] T002: src/popup.ts に設定UI(ON/OFF・色・太さ・不透明度・モード)を実装しstorage.local保存
- [ ] T003: popupのONで scripting.executeScript により現在タブへ注入、OFFで解除
- [ ] T004: 起動時にstorage.localから設定復元しpopupに反映
- [ ] T005: _locales ja/en を chrome.i18n で全UIに適用
- [ ] T006: Premiumゲート(trial_start_ts+Stripe Checkout URL)。無料は基本動作、Premiumで色プリセット追加・サイト別自動ON
- [ ] T007: npm run build を通しts/lint解消
- [ ] T008: release/eye-guide.zip 生成(node_modules除外)
- [ ] T009: legal/PRIVACY.md と TERMS.md(外部通信なし・データ収集なし明記)
