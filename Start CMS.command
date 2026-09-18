#!/bin/zsh
cd "${0:A:h}"
PORT=8041

# köhnə server hələ portu tutubsa, əvvəlcə onu dayandır
OLD=$(lsof -ti tcp:$PORT 2>/dev/null)
if [ -n "$OLD" ]; then
  echo "Köhnə CMS serveri dayandırılır (PID $OLD)..."
  kill $OLD 2>/dev/null
  sleep 1
  STILL=$(lsof -ti tcp:$PORT 2>/dev/null)
  [ -n "$STILL" ] && kill -9 $STILL 2>/dev/null && sleep 1
fi

python3 _cms/scripts/cms-server.py --port $PORT --open
