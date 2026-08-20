#!/bin/bash
# Run a command under Node 22+, whatever the shell happens to default to.
#
# Next 15 needs 18.18+, and @supabase/supabase-js needs the global fetch
# and Headers that only exist from 18 on (and it warns below 20). Rather
# than expect a `nvm use` before every command, the npm scripts route
# through here. Vercel already runs 22, so this only affects local dev.
set -e

node_major() { node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0; }

if [ "$(node_major)" -lt 22 ] && [ -s "$HOME/.nvm/nvm.sh" ]; then
  # nvm is a shell function, so it has to be sourced, not called.
  . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1
  nvm use 22 >/dev/null 2>&1 || nvm install 22 >/dev/null 2>&1 || true
fi

if [ "$(node_major)" -lt 22 ]; then
  echo ""
  echo "  Node 22+ is required — found $(node -v 2>/dev/null || echo 'no node')."
  echo ""
  echo "  Install it once with:"
  echo "      nvm install 22"
  echo ""
  exit 1
fi

exec "$@"
