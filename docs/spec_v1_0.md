# eye-guide (すーっと読める定規) v1_0
## ゴール
読んでいるページで、マウス/カーソルの高さに半透明の読書ライン(定規)を表示し、行を追いやすくする。ディスレクシア・読み飛ばし・疲れ目支援。
## 絶対制約
外部API/通信なし・完全オフライン。storage.localのみ。権限 activeTab/scripting/storage のみ。MV3/TS/Vite。
## 機能
1. popupでON/OFF、ライン色・太さ・不透明度・モード(横帯/下線/集中窓)を設定。
2. ONにすると現在タブにcontentでオーバーレイ注入、カーソル縦位置に追従。
3. 設定はstorage.localに保存し復元。
4. 無料で基本動作。Premium($3,Stripe,7日トライアル)で色プリセット追加・サイト別自動ON。
## 触ってはいけない
permissions を増やさない。外部CDN/フォント読み込み禁止。
## 完了条件
npm run build成功/dist生成、_locales ja/en、icons3種、popupで全設定が効きラインが表示/追従、release/eye-guide.zip生成。
