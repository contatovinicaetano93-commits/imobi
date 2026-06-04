#!/bin/sh
# Run once after cloning: sh scripts/setup-git-hooks.sh

HOOK=".git/hooks/pre-commit"

cat > "$HOOK" << 'EOF'
#!/bin/sh
STAGED=$(git diff --cached --name-only)
for FILE in $STAGED; do
  [ -f "$FILE" ] || continue
  case "$FILE" in
    *.env|*.pem|*.key) echo "ERROR: Blocked file: $FILE"; exit 1 ;;
  esac
  DIFF=$(git diff --cached "$FILE" 2>/dev/null)
  if echo "$DIFF" | grep -qE 'AKIA[0-9A-Z]{16}'; then
    echo "ERROR: AWS key detected in $FILE"; exit 1
  fi
  if echo "$DIFF" | grep -qF '-----BEGIN RSA PRIVATE KEY-----'; then
    echo "ERROR: Private key detected in $FILE"; exit 1
  fi
done
exit 0
EOF

chmod +x "$HOOK"
echo "Git hooks installed."
