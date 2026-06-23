#!/bin/bash
# One-time archiver — move legacy noise to docs/legacy/
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ARCHIVE_ROOT="docs/legacy/archive/root"
ARCHIVE_DOCS="docs/legacy/archive/docs"
LEGACY_SCRIPTS="docs/legacy/scripts"
LEGACY_INFRA="docs/legacy/infrastructure-aws"

mkdir -p "$ARCHIVE_ROOT" "$ARCHIVE_DOCS" "$LEGACY_SCRIPTS" "$LEGACY_INFRA"

KEEP_ROOT=(
  START_HERE.md
  CLAUDE.md
  ARCHITECTURE_RESILIENCE_API_FIRST.md
  CODE_REVIEW_AUDIT.md
  README.md
)

KEEP_DOCS=(
  DEPLOY_STACK.md
  CLAUDE_SYNC.md
  API_ENDPOINTS.md
  BACKEND_STATUS.md
  FRONTEND_IMPLEMENTATION_STATUS.md
  BETA_USER_ONBOARDING.md
  SOFT_LAUNCH_GUIDE.md
  SECURITY_HARDENING.md
  OBSERVABILITY_IMPLEMENTATION.md
  CURSOR_PROMPT.md
)

is_kept() {
  local file="$1"
  shift
  for k in "$@"; do
    [[ "$file" == "$k" ]] && return 0
  done
  return 1
}

echo "→ Archiving root *.md (except canonical)…"
for f in *.md; do
  [[ -f "$f" ]] || continue
  if is_kept "$f" "${KEEP_ROOT[@]}"; then
    echo "  keep $f"
  else
    git mv "$f" "$ARCHIVE_ROOT/" 2>/dev/null || mv "$f" "$ARCHIVE_ROOT/"
    echo "  archive $f"
  fi
done

echo "→ Archiving docs/*.md (except canonical)…"
for f in docs/*.md; do
  [[ -f "$f" ]] || continue
  base=$(basename "$f")
  if is_kept "$base" "${KEEP_DOCS[@]}"; then
    echo "  keep docs/$base"
  else
    git mv "$f" "$ARCHIVE_DOCS/" 2>/dev/null || mv "$f" "$ARCHIVE_DOCS/"
    echo "  archive docs/$base"
  fi
done

echo "→ Archiving docs subfolders (phase/cutover/runbooks)…"
for dir in docs/PHASE* docs/RUNBOOKS docs/runbooks; do
  [[ -e "$dir" ]] || continue
  name=$(basename "$dir")
  if [[ -d "$dir" ]]; then
    target="docs/legacy/archive/docs-subdirs/$name"
    mkdir -p "$(dirname "$target")"
    git mv "$dir" "$target" 2>/dev/null || mv "$dir" "$target"
    echo "  archive $dir"
  fi
done

echo "→ Archiving AWS EC2 deploy scripts…"
for s in deploy-api.sh deploy-web.sh deploy-aws-infrastructure.sh post-deployment-setup.sh aws-setup-helper.sh execute-production-setup.sh; do
  if [[ -f "scripts/$s" ]]; then
    git mv "scripts/$s" "$LEGACY_SCRIPTS/" 2>/dev/null || mv "scripts/$s" "$LEGACY_SCRIPTS/"
    echo "  archive scripts/$s"
  fi
done

if [[ -d infrastructure ]]; then
  echo "→ Archiving infrastructure/ (AWS legado)…"
  git mv infrastructure "$LEGACY_INFRA" 2>/dev/null || mv infrastructure "$LEGACY_INFRA"
fi

if [[ -d terraform ]]; then
  echo "→ Archiving terraform/ (AWS EC2 legado)…"
  mkdir -p "$LEGACY_INFRA"
  git mv terraform "$LEGACY_INFRA/" 2>/dev/null || mv terraform "$LEGACY_INFRA/"
fi

if [[ -d api ]]; then
  echo "→ Archiving api/ (handler Vercel legado — API no Render)…"
  git mv api docs/legacy/api-vercel-handler 2>/dev/null || mv api docs/legacy/api-vercel-handler
fi

echo "→ Archiving root *.txt (relatórios pontuais)…"
for f in *.txt; do
  [[ -f "$f" ]] || continue
  git mv "$f" "$ARCHIVE_ROOT/" 2>/dev/null || mv "$f" "$ARCHIVE_ROOT/"
  echo "  archive $f"
done

echo "→ Archiving root *.sh (scripts soltos — usar scripts/)…"
for f in *.sh; do
  [[ -f "$f" ]] || continue
  git mv "$f" "$LEGACY_SCRIPTS/" 2>/dev/null || mv "$f" "$LEGACY_SCRIPTS/"
  echo "  archive $f"
done

for f in load-test.js load-test-summary.json; do
  if [[ -f "$f" ]]; then
    git mv "$f" "$ARCHIVE_ROOT/" 2>/dev/null || mv "$f" "$ARCHIVE_ROOT/"
    echo "  archive $f"
  fi
done

if [[ -d graphify-out ]]; then
  echo "→ Removing graphify-out/ (cache gerado)…"
  git rm -rf graphify-out 2>/dev/null || rm -rf graphify-out
fi

echo "✅ Archive complete"
