#!/bin/bash
cd "$(dirname "$0")" || exit 1
MAX=40; i=0
count_remaining(){ local n; n=$(grep -cE '^[[:space:]]*-[[:space:]]*\[ \]' TODO.md 2>/dev/null || true); n=${n:-0}; printf '%s' "$n" | tr -dc '0-9'; }
while :; do
  i=$((i+1)); [ "$i" -gt "$MAX" ] && { echo "上限$MAX到達。停止"; break; }
  R=$(count_remaining); R=${R:-0}
  [ "$R" -eq 0 ] && { echo "✅ 全タスク完了。停止。"; break; }
  echo "[$i] 残 $R 件 → Gemini $(date +%H:%M:%S)"
  gtimeout 3600 gemini --yolo -p "$(cat GEMINI.md)" 2>&1 | tail -15 || echo "(timeout/err, 次へ)"
done
