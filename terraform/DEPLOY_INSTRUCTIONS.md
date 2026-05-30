# Instruções de Deploy - AWS Staging Terraform

## Pré-requisitos

### Ambiente
- [ ] Máquina com acesso à internet (AWS EC2, local, etc)
- [ ] Terraform >= 1.9.0 instalado
- [ ] AWS CLI v2 configurado com credenciais
- [ ] Git com acesso ao repositório imobi

### Credenciais AWS
```bash
# Configurar credenciais (escolha um método):

# Método 1: AWS CLI Profile
aws configure --profile imobi-staging

# Método 2: Variáveis de ambiente
export AWS_ACCESS_KEY_ID="xxxxx"
export AWS_SECRET_ACCESS_KEY="xxxxx"
export AWS_DEFAULT_REGION="us-east-1"

# Testar acesso
aws sts get-caller-identity
```

---

## Passo 1: Preparar Ambiente

```bash
# Clonar repositório (se necessário)
git clone <repo-url> imobi
cd imobi/terraform

# Verificar arquivos estão presentes
ls -la *.tf *.tfvars
# Esperado: main.tf, variables.tf, staging.tfvars
```

---

## Passo 2: Inicializar Terraform

```bash
# Dentro do diretório terraform/
cd /home/user/imobi/terraform

# Inicializar (baixa providers)
terraform init

# Esperado output:
# Initializing the backend...
# Initializing provider plugins...
# Terraform has been successfully configured!
```

### Troubleshooting Init
```bash
# Se falhar, limpar cache e tentar novamente
rm -rf .terraform .terraform.lock.hcl
terraform init

# Se ainda falhar, verificar conectividade
curl -I https://registry.terraform.io
```

---

## Passo 3: Validar Configuração

```bash
# Validar sintaxe HCL
terraform validate

# Esperado output:
# Success! The configuration is valid.
```

### Verificar Formatação
```bash
# Verificar se está bem formatado
terraform fmt -check

# Se tiver erros, aplicar formatação
terraform fmt -recursive
```

---

## Passo 4: Planejar Deployment

```bash
# Gerar plano de deployment (SEM aplicar)
terraform plan -var-file=staging.tfvars -out=tfplan

# Este comando:
# 1. Lê a configuração (main.tf)
# 2. Lê as variáveis (variables.tf)
# 3. Lê os valores (staging.tfvars)
# 4. Calcula o estado desejado vs atual
# 5. Salva em arquivo tfplan
```

### Revisar Plano
```bash
# Ver resumo do plano
terraform show tfplan | head -100

# Ou em formato legível
terraform plan -var-file=staging.tfvars -no-color | tee tfplan.txt

# Procurar por:
# - "Plan: 18 to add, 0 to change, 0 to destroy"
# - Nenhuma destruição (importante!)
# - Nomes dos recursos aparecerem corretos
```

### Exemplo de Saída Esperada
```
Plan: 18 to add, 0 to change, 0 to destroy.

Changes to Outputs:
  + vpc_id
  + rds_endpoint
  + rds_host
  + elasticache_endpoint
  + s3_bucket_name
  + db_password_secret_arn
```

---

## Passo 5: Revisar Checklist Pré-Deploy

- [ ] Plano mostra 18 recursos sendo criados
- [ ] Nenhuma destruição (0 to destroy)
- [ ] Variáveis staging.tfvars estão corretas
- [ ] Email de certificado é correto (contato.vinicaetano93@gmail.com)
- [ ] Region é us-east-1
- [ ] VPC CIDR é 10.0.0.0/16
- [ ] RDS instance é db.t3.micro
- [ ] Redis node type é cache.t3.micro

---

## Passo 6: Aplicar Configuração (DEPLOY REAL)

### AVISO: Esta ação criará recursos na AWS

```bash
# Aplicar o plano salvo
terraform apply tfplan

# Este comando:
# 1. Lê o arquivo tfplan
# 2. Cria todos os 18 recursos
# 3. Exibe os outputs
# 4. Atualiza terraform.tfstate

# Tempo estimado: 15-30 minutos
# (RDS leva mais tempo que outros recursos)
```

### Durante o Deploy
```bash
# Em outro terminal, monitorar logs
tail -f /var/log/syslog | grep terraform

# Ou via AWS Console
aws rds describe-db-instances --region us-east-1
aws elasticache describe-cache-clusters --region us-east-1
```

---

## Passo 7: Capturar Outputs

```bash
# Após apply bem-sucedido, extrair os endpoints
terraform output -raw rds_host > /tmp/rds_host.txt
terraform output -raw elasticache_endpoint > /tmp/redis_endpoint.txt
terraform output -raw s3_bucket_name > /tmp/s3_bucket.txt

# Ver todos os outputs
terraform output

# Salvar em um arquivo seguro
terraform output > /tmp/terraform_outputs.json
```

### Exemplo de Outputs
```
vpc_id = "vpc-0a1b2c3d4e5f6g7h8"
rds_endpoint = "imobi-staging-postgres.xxxxx.us-east-1.rds.amazonaws.com:5432"
rds_host = "imobi-staging-postgres.xxxxx.us-east-1.rds.amazonaws.com"
elasticache_endpoint = "imobi-staging-redis.xxxxx.cache.amazonaws.com"
s3_bucket_name = "imobi-staging-files-123456789012"
db_password_secret_arn = "arn:aws:secretsmanager:us-east-1:123456789012:secret:imobi/staging/db-password-xxxxx"
```

---

## Passo 8: Configurar Aplicação

### Recuperar Senha do Banco
```bash
# Via AWS Secrets Manager
aws secretsmanager get-secret-value \
  --secret-id imobi/staging/db-password \
  --region us-east-1 \
  --query SecretString \
  --output text
```

### Criar arquivo .env.local (para Web e API)
```bash
cat > .env.local << EOF
# Database
DATABASE_URL="postgresql://imobi:PASSWORD@RDS_HOST:5432/imobi_staging"

# Redis
REDIS_URL="redis://REDIS_ENDPOINT:6379"

# S3
AWS_S3_BUCKET="imobi-staging-files-ACCOUNT_ID"
AWS_REGION="us-east-1"

# API
API_URL="https://api.staging.imobi.com"
API_PORT=3000

# Web
NEXT_PUBLIC_API_URL="https://api.staging.imobi.com"
