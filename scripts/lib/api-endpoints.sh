#!/bin/bash
# Rotas canônicas da API (API-first, prefixo global api/v1).
# Fonte: services/api/src/main.ts + render.yaml healthCheckPath

api_base() {
  echo "${1%/}"
}

api_health_url() {
  echo "$(api_base "$1")/api/v1/health"
}

api_metrics_url() {
  echo "$(api_base "$1")/api/v1/metrics"
}

api_docs_url() {
  echo "$(api_base "$1")/docs"
}

api_credito_simular_url() {
  echo "$(api_base "$1")/api/v1/credito/simular"
}
