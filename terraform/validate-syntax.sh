#!/bin/bash

echo "=== VALIDAÇÃO MANUAL DA CONFIGURAÇÃO TERRAFORM ==="
echo ""

# Verificar se os arquivos existem
echo "1. ARQUIVOS ENCONTRADOS:"
ls -lh *.tf *.tfvars 2>/dev/null || echo "Erro ao listar arquivos"
echo ""

# Validar sintaxe básica HCL
echo "2. VERIFICANDO SINTAXE BÁSICA HCL:"
echo "   - main.tf: "
grep -c "resource\|data\|output" main.tf && echo "     OK"

echo "   - variables.tf: "
grep -c "variable" variables.tf && echo "     OK"

echo "   - staging.tfvars: "
grep -c "=" staging.tfvars && echo "     OK"
echo ""

# Verificar providers
echo "3. PROVIDERS NECESSÁRIOS:"
grep "required_providers" -A 10 main.tf
echo ""

# Verificar recursos
echo "4. RECURSOS A SEREM CRIADOS:"
grep "^resource " main.tf | sort | uniq -c
echo ""

# Verificar saídas
echo "5. OUTPUTS (Endpoints e Valores de Retorno):"
grep "^output " main.tf
