# Analytics API Documentation

Esta documentação descreve os endpoints de analytics da plataforma IMBOBI para consulta de métricas agregadas.

## Visão Geral

A API de Analytics fornece dados agregados e métricas de desempenho da plataforma, com caching automático de 1 hora para otimizar performance.

## Autenticação

Todos os endpoints requerem:

1. **Token JWT válido** no header `Authorization: Bearer {token}`
2. **Roles permitidas:** `ADMIN` ou `GESTOR_OBRA`

---

## Endpoints

### 1. Summary - Resumo Geral
```bash
GET /api/v1/analytics/summary
```

**Query Parameters:**
- `startDate` (opcional): Data inicial (ISO 8601)
- `endDate` (opcional): Data final (ISO 8601)

**Response (200 OK):**
```json
{
  "totalUsuarios": 1250,
  "usuariosAtivos": 1100,
  "kyc": {
    "pendente": 150,
    "aprovado": 1050,
    "rejeitado": 50
  },
  "obras": {
    "total": 320,
    "emExecucao": 85,
    "concluidas": 180
  },
  "creditos": {
    "total": 290,
    "valorTotalAprovado": 2500000,
    "valorTotalLiberado": 2100000,
    "ativos": 240
  },
  "timestamp": "2024-05-28T14:30:00Z"
}
```

**Descrição dos Campos:**
- `totalUsuarios`: Número total de usuários registrados
- `usuariosAtivos`: Usuários não bloqueados
- `kyc.pendente`: Pendentes de análise
- `kyc.aprovado`: Com KYC aprovado
- `kyc.rejeitado`: Rejeitados
- `obras.total`: Total de obras criadas
- `obras.emExecucao`: Obras em andamento
- `obras.concluidas`: Obras finalizadas
- `creditos.total`: Total de créditos registrados
- `creditos.valorTotalAprovado`: Soma de valores aprovados
- `creditos.valorTotalLiberado`: Soma de valores efetivamente liberados
- `creditos.ativos`: Créditos em status ATIVO

---

### 2. Works - Obras por Status
```bash
GET /api/v1/analytics/works
```

**Query Parameters:**
- `startDate` (opcional): Data inicial
- `endDate` (opcional): Data final

**Response (200 OK):**
```json
[
  {
    "status": "PLANEJAMENTO",
    "count": 35,
    "percentual": 10.9
  },
  {
    "status": "EM_EXECUCAO",
    "count": 85,
    "percentual": 26.6
  },
  {
    "status": "CONCLUIDA",
    "count": 180,
    "percentual": 56.3
  },
  {
    "status": "PAUSADA",
    "count": 15,
    "percentual": 4.7
  },
  {
    "status": "CANCELADA",
    "count": 5,
    "percentual": 1.6
  }
]
```

**Usos:**
- Visualizar distribuição de obras
- Identificar gargalos (ex: muitas pausadas)
- Acompanhar taxa de conclusão

---

### 3. Credits - Créditos por Status e Valor
```bash
GET /api/v1/analytics/credits
```

**Query Parameters:**
- `startDate` (opcional): Data inicial
- `endDate` (opcional): Data final

**Response (200 OK):**
```json
[
  {
    "status": "ATIVO",
    "count": 240,
    "valorTotal": 2000000,
    "valorMedio": 8333.33
  },
  {
    "status": "QUITADO",
    "count": 45,
    "valorTotal": 375000,
    "valorMedio": 8333.33
  },
  {
    "status": "SUSPENSO",
    "count": 3,
    "valorTotal": 50000,
    "valorMedio": 16666.67
  },
  {
    "status": "VENCIDO",
    "count": 2,
    "valorTotal": 75000,
    "valorMedio": 37500
  }
]
```

**Métricas Importantes:**
- `valorMedio`: Tamanho médio do crédito por status
- Taxa de quitação: `quitados / total`
- Taxa de atraso: `(suspenso + vencido) / total`

---

### 4. Users - Usuários por Status KYC
```bash
GET /api/v1/analytics/users
```

**Query Parameters:**
- `startDate` (opcional): Data inicial
- `endDate` (opcional): Data final

**Response (200 OK):**
```json
[
  {
    "kycStatus": "PENDENTE",
    "count": 150,
    "percentual": 12
  },
  {
    "kycStatus": "EM_VERIFICACAO",
    "count": 45,
    "percentual": 3.6
  },
  {
    "kycStatus": "APROVADO",
    "count": 1050,
    "percentual": 84
  },
  {
    "kycStatus": "REJEITADO",
    "count": 5,
    "percentual": 0.4
  }
]
```

**KYC Funnel:**
- Taxa de aprovação: `aprovado / (aprovado + rejeitado)`
- Taxa de conversão: `(pendente + em_verificacao) / total`

---

### 5. Performance - Métricas de Desempenho
```bash
GET /api/v1/analytics/performance
```

**Query Parameters:**
- `startDate` (opcional): Data inicial
- `endDate` (opcional): Data final

**Response (200 OK):**
```json
{
  "avgTimeKycDays": 4.5,
  "avgTimeCreditApprovalDays": 2.3,
  "avgTimeWorkCompletionDays": 45.2,
  "avgEvidencesPerStage": 3.8
}
```

**Interpretação:**
- `avgTimeKycDays`: Tempo médio de aprovação KYC desde cadastro
- `avgTimeCreditApprovalDays`: Tempo médio de aprovação de crédito
- `avgTimeWorkCompletionDays`: Tempo médio de conclusão de obra
- `avgEvidencesPerStage`: Qualidade/completude de evidências

---

### 6. Timeline - Dados de Série Temporal
```bash
GET /api/v1/analytics/timeline
```

**Query Parameters:**
- `days` (opcional, default: 30): Número de dias (1-365)
- `metric` (opcional): Filtrar métrica - `usuarios`, `obras`, `creditos` (default: todas)

**Response (200 OK):**
```json
{
  "data": [
    {
      "date": "2024-04-28",
      "usuarios": 12,
      "obras": 3,
      "creditos": 2
    },
    {
      "date": "2024-04-29",
      "usuarios": 8,
      "obras": 1,
      "creditos": 1
    },
    {
      "date": "2024-04-30",
      "usuarios": 15,
      "obras": 4,
      "creditos": 3
    },
    {
      "date": "2024-05-28",
      "usuarios": 10,
      "obras": 2,
      "creditos": 1
    }
  ]
}
```

**Usos:**
- Criar gráficos de tendência
- Identificar padrões de atividade
- Detectar anomalias (picos/quedas anormais)

---

## Caching

O sistema de analytics implementa caching automático:

- **Duração:** 1 hora (3600000 ms)
- **Refresh Automático:** Toda hora via CRON job
- **Cache Invalida:** Quando parâmetros de data são fornecidos

### Headers de Cache:

```
Cache-Control: public, max-age=3600
ETag: {hash}
Last-Modified: {timestamp}
```

---

## Rate Limiting

Endpoints de analytics respeitam o throttler global:
- **Limite:** 100 requisições por 60 segundos
- **Estratégia:** Por IP + por usuário autenticado

---

## Tratamento de Erros

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Datas inválidas",
  "error": "BadRequestException"
}
```

**Causas comuns:**
- Formato de data incorreto
- `days` fora do range 1-365
- Query parameter inválido

---

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "UnauthorizedException"
}
```

**Soluções:**
- Inclua token JWT no header `Authorization`
- Verifique se token não expirou

---

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "ForbiddenException"
}
```

**Soluções:**
- Verifique se usuário tem role `ADMIN` ou `GESTOR_OBRA`

---

## Exemplos de Uso

### cURL

#### Obter resumo com data range:
```bash
curl -X GET "https://api.imbobi.com/api/v1/analytics/summary?startDate=2024-05-01&endDate=2024-05-28" \
  -H "Authorization: Bearer {seu_token_jwt}" \
  -H "Content-Type: application/json"
```

#### Obter timeline dos últimos 7 dias:
```bash
curl -X GET "https://api.imbobi.com/api/v1/analytics/timeline?days=7&metric=creditos" \
  -H "Authorization: Bearer {seu_token_jwt}"
```

---

### JavaScript/Fetch API

```javascript
const fetchAnalytics = async () => {
  const token = localStorage.getItem('jwt_token');
  
  const response = await fetch('https://api.imbobi.com/api/v1/analytics/summary', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data;
};
```

---

### Python

```python
import requests
from datetime import datetime, timedelta

token = "seu_token_jwt"
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# Últimos 30 dias
start_date = (datetime.now() - timedelta(days=30)).isoformat()
end_date = datetime.now().isoformat()

response = requests.get(
    "https://api.imbobi.com/api/v1/analytics/summary",
    headers=headers,
    params={
        "startDate": start_date,
        "endDate": end_date
    }
)

data = response.json()
print(f"Total usuários: {data['totalUsuarios']}")
```

---

## Casos de Uso Comuns

### 1. Dashboard de KPI
```javascript
// Componente React
const AnalyticsDashboard = () => {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const timer = setInterval(async () => {
      const data = await fetch('/api/v1/analytics/summary')
        .then(r => r.json());
      setSummary(data);
    }, 60000); // Refresh a cada minuto

    return () => clearInterval(timer);
  }, []);

  return (
    <div>
      <h2>Total Usuários: {summary?.totalUsuarios}</h2>
      <h2>KYC Aprovado: {summary?.kyc.aprovado}</h2>
    </div>
  );
};
```

### 2. Relatório de Status de Obras
```javascript
const getWorksReport = async () => {
  const works = await fetch('/api/v1/analytics/works')
    .then(r => r.json());
  
  const completionRate = works
    .find(w => w.status === 'CONCLUIDA')
    ?.percentual || 0;
  
  console.log(`Taxa de conclusão: ${completionRate}%`);
};
```

### 3. Análise de Tendência
```javascript
const analyzeTrends = async () => {
  const timeline = await fetch('/api/v1/analytics/timeline?days=30&metric=usuarios')
    .then(r => r.json());
  
  const avgDaily = timeline.data.reduce((sum, d) => sum + d.usuarios, 0) / 30;
  console.log(`Média diária de novos usuários: ${avgDaily}`);
};
```

---

## Performance e Otimização

### Recomendações:

1. **Cache no Frontend:** Armazene dados por 5-10 minutos
2. **Polling Inteligente:** Use WebSocket ou Server-Sent Events para atualizações em tempo real
3. **Agregação:** Combine múltiplos endpoints em uma chamada batch quando possível
4. **Compressão:** Use gzip para responses grandes

---

## Roadmap Futuro

Melhorias planejadas:

- [ ] Endpoint de anomaly detection
- [ ] Comparação período-a-período (MoM, YoY)
- [ ] Métricas de satisfação do usuário
- [ ] Previsões (ML-based forecasting)
- [ ] Alertas automáticos de KPI

---

## Suporte

Para dúvidas ou problemas:

- **Email:** suporte@imbobi.com
- **Slack:** #analytics-support
- **Docs:** https://docs.imbobi.com/analytics
