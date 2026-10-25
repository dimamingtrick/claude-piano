#!/usr/bin/env bash
# Installs the piano mod for Claude Code, or updates it to the latest
# version when it is already installed. Run it again any time to update.
set -euo pipefail

MARKETPLACE_REPO="dimamingtrick/claude-piano"
MARKETPLACE="dimamingtrick-piano"
PLUGIN="piano@${MARKETPLACE}"

if ! command -v claude >/dev/null 2>&1; then
  echo "Claude Code CLI not found. Install it first: https://claude.com/claude-code" >&2
  exit 1
fi

# Adding a marketplace that is already there fails harmlessly; the update
# then fetches its latest version either way.
claude plugin marketplace add "$MARKETPLACE_REPO" >/dev/null 2>&1 || true
claude plugin marketplace update "$MARKETPLACE"

# Same for the plugin: install it if new, then bring it up to date.
claude plugin install "$PLUGIN" >/dev/null 2>&1 || true
claude plugin update "$PLUGIN"

echo
echo "piano is ready. Start a new Claude Code session and type /piano."
