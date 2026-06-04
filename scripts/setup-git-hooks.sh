#!/bin/sh
# Run once after cloning: sh scripts/setup-git-hooks.sh

HOOK=".git/hooks/pre-commit"

cat > "$HOOK" << 'HOOKEOF'
#!/bin/sh
STAGED=$(git diff --cached --name-only)
KEY_HDR="-----BEGIN"
for FILE in $STAGED; do
  [ -f "$FILE" ] || continue
  case "$FILE" in
    *.env|*.pem|*.key) echo "ERROR: Blocked sensitive file: $FILE"; exit 1 ;;
  esac
  DIFF=$(git diff --cached "$FILE" 2>/dev/null)
  if echo "$DIFF" | grep -qE 'AKIA[0-9A-Z]{16}'; then
    echo "ERROR: AWS key detected in $FILE"; exit 1
  fi
  if echo "$DIFF" | grep -q "${KEY_HDR} RSA PRIVATE KEY"; then
    echo "ERROR: Private key detected in $FILE"; exit 1
  fi
done
exit 0
HOOKEOF

chmod +x "$HOOK"
echo "Git hooks installed."
