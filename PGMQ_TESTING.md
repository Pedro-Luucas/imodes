# Guia de Testes - PGMQ Integration

Este guia explica como testar a implementação do PGMQ no projeto.

## Pré-requisitos

### 1. Instalar PGMQ no Supabase

1. No Supabase Dashboard, vá para **Database** > **Extensions**
2. Procure por `pgmq` e instale a extensão
3. Ou execute a migração SQL diretamente:

```sql
CREATE EXTENSION IF NOT EXISTS pgmq;
```

### 2. Criar as Filas

Execute a migração `supabase/migrations/001_enable_pgmq.sql` ou execute manualmente:

```sql
SELECT pgmq.create('canvas-autosave');
SELECT pgmq.create('notifications');
SELECT pgmq.create('canvas-checkpoints');
```

### 3. Expor Funções via PostgREST

As funções do PGMQ precisam estar acessíveis via RPC do Supabase. Você tem duas opções:

#### Opção A: Criar Schema Público (Recomendado)

Crie funções wrapper no schema público que chamam as funções do PGMQ:

```sql
-- Criar schema para funções públicas do PGMQ
CREATE SCHEMA IF NOT EXISTS pgmq_public;

-- Função wrapper para send
CREATE OR REPLACE FUNCTION pgmq_public.send(
  queue_name text,
  msg jsonb,
  delay integer DEFAULT 0
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN pgmq.send(queue_name, msg, delay);
END;
$$;

-- Função wrapper para read
CREATE OR REPLACE FUNCTION pgmq_public.read(
  queue_name text,
  vt integer DEFAULT 30,
  qty integer DEFAULT 1
)
RETURNS TABLE (
  msg_id bigint,
  read_ct integer,
  enqueued_at timestamptz,
  vt timestamptz,
  message jsonb,
  headers jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM pgmq.read(queue_name, vt, qty);
END;
$$;

-- Função wrapper para archive
CREATE OR REPLACE FUNCTION pgmq_public.archive(
  queue_name text,
  msg_id bigint
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN pgmq.archive(queue_name, msg_id);
END;
$$;

-- Função wrapper para delete
CREATE OR REPLACE FUNCTION pgmq_public.delete(
  queue_name text,
  msg_id bigint
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN pgmq.delete(queue_name, msg_id);
END;
$$;

-- Função wrapper para pop
CREATE OR REPLACE FUNCTION pgmq_public.pop(
  queue_name text
)
RETURNS TABLE (
  msg_id bigint,
  read_ct integer,
  enqueued_at timestamptz,
  vt timestamptz,
  message jsonb,
  headers jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM pgmq.pop(queue_name);
END;
$$;

-- Função wrapper para send_batch
CREATE OR REPLACE FUNCTION pgmq_public.send_batch(
  queue_name text,
  msgs jsonb[]
)
RETURNS bigint[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN pgmq.send_batch(queue_name, msgs);
END;
$$;

-- Grant permissions
GRANT USAGE ON SCHEMA pgmq_public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgmq_public TO authenticated;
```

#### Opção B: Ajustar Cliente para Usar Schema Corrigido

Se preferir usar as funções diretamente do schema `pgmq`, ajuste o cliente em `src/lib/pgmq.ts` para usar `pgmq.send` ao invés de apenas `send`.

### 4. Configurar RLS (Row Level Security)

Para as filas do PGMQ, você precisa configurar RLS para prevenir acesso anônimo. As filas ficam em tabelas com prefixo `q_` no schema `pgmq`:

```sql
-- Habilitar RLS nas tabelas das filas
ALTER TABLE pgmq.q_canvas_autosave ENABLE ROW LEVEL SECURITY;
ALTER TABLE pgmq.q_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE pgmq.q_canvas_checkpoints ENABLE ROW LEVEL SECURITY;

-- Criar políticas (ajuste conforme necessário)
-- Nota: PGMQ já gerencia acesso às mensagens via suas funções
-- RLS aqui é principalmente para proteção extra
```

## Testes

### 1. Teste Básico de PGMQ

Use o endpoint de teste para verificar se o PGMQ está configurado corretamente:

```bash
# Teste a fila canvas-autosave
curl -X POST http://localhost:3000/api/workers/test?queue=canvas-autosave

# Teste a fila notifications
curl -X POST http://localhost:3000/api/workers/test?queue=notifications

# Teste a fila canvas-checkpoints
curl -X POST http://localhost:3000/api/workers/test?queue=canvas-checkpoints
```

Ou via navegador, acesse:
- `GET http://localhost:3000/api/workers/test` - Ver instruções
- `POST http://localhost:3000/api/workers/test?queue=canvas-autosave` - Testar fila

### 2. Teste do Endpoint de Canvas (Autosave)

1. Faça login na aplicação
2. Abra uma sessão do canvas
3. Faça alterações no canvas (desenhe, adicione cards, etc.)
4. O autosave deve enfileirar a mensagem
5. Verifique o console do navegador - deve mostrar sucesso (202 Accepted)

Para verificar se a mensagem foi enfileirada:

```sql
-- No Supabase SQL Editor
SELECT * FROM pgmq.q_canvas_autosave ORDER BY msg_id DESC LIMIT 5;
```

### 3. Teste do Worker de Canvas

Chame o worker para processar mensagens:

```bash
curl -X POST http://localhost:3000/api/workers/canvas?maxMessages=10
```

Ou via navegador:
- `GET http://localhost:3000/api/workers/canvas` - Health check
- `POST http://localhost:3000/api/workers/canvas?maxMessages=10` - Processar mensagens

O worker deve:
1. Ler mensagens da fila
2. Atualizar as sessões no banco de dados
3. Arquivar mensagens processadas com sucesso

### 4. Teste do Endpoint de Notificações

```bash
# Criar notificação (deve retornar 202 Accepted)
curl -X POST http://localhost:3000/api/notifications \
  -H "Content-Type: application/json" \
  -H "Cookie: <seu-cookie-de-autenticacao>" \
  -d '{
    "user_id": "<user-id>",
    "type": "test",
    "title": "Test Notification",
    "message": "This is a test"
  }'
```

### 5. Teste do Worker de Notificações

```bash
curl -X POST http://localhost:3000/api/workers/notifications?maxMessages=10
```

### 6. Teste do Endpoint de Checkpoints

1. No canvas, crie um checkpoint
2. Deve retornar 202 Accepted
3. Verifique a fila:

```sql
SELECT * FROM pgmq.q_canvas_checkpoints ORDER BY msg_id DESC LIMIT 5;
```

### 7. Teste do Worker de Checkpoints

```bash
curl -X POST http://localhost:3000/api/workers/checkpoints?maxMessages=10
```

## Verificações no Banco de Dados

### Ver Mensagens nas Filas

```sql
-- Ver mensagens pendentes em canvas-autosave
SELECT msg_id, read_ct, enqueued_at, message 
FROM pgmq.q_canvas_autosave 
ORDER BY msg_id DESC 
LIMIT 10;

-- Ver mensagens arquivadas
SELECT msg_id, read_ct, enqueued_at, archived_at, message 
FROM pgmq.a_canvas_autosave 
ORDER BY archived_at DESC 
LIMIT 10;

-- Ver estatísticas das filas
SELECT 
  'canvas-autosave' as queue,
  COUNT(*) FILTER (WHERE vt > NOW()) as visible,
  COUNT(*) FILTER (WHERE vt <= NOW()) as invisible
FROM pgmq.q_canvas_autosave;
```

### Verificar Processamento

```sql
-- Verificar se sessões foram atualizadas
SELECT id, updated_at, data 
FROM imodes_session 
ORDER BY updated_at DESC 
LIMIT 10;

-- Verificar se notificações foram criadas
SELECT id, user_id, type, title, created_at 
FROM notifications 
ORDER BY created_at DESC 
LIMIT 10;

-- Verificar checkpoints criados
SELECT id, session_id, name, created_at 
FROM session_checkpoints 
ORDER BY created_at DESC 
LIMIT 10;
```

## Configurar Workers Automáticos

### Vercel Cron (se usando Vercel)

Adicione ao `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/workers/canvas",
      "schedule": "*/30 * * * * *"
    },
    {
      "path": "/api/workers/notifications",
      "schedule": "*/30 * * * * *"
    },
    {
      "path": "/api/workers/checkpoints",
      "schedule": "*/30 * * * * *"
    }
  ]
}
```

### Supabase Edge Functions

Crie funções Edge que chamam os workers periodicamente.

### Alternativa: Long-polling

Os workers podem ser chamados continuamente em um loop:

```typescript
// Exemplo de long-polling (não implementado, mas possível)
while (true) {
  await fetch('/api/workers/canvas', { method: 'POST' });
  await sleep(5000); // Espera 5 segundos
}
```

## Troubleshooting

### Erro: "function pgmq_public.send does not exist"

- Verifique se as funções wrapper foram criadas
- Verifique se o schema `pgmq_public` está acessível
- Ajuste o cliente PGMQ para usar o schema correto

### Erro: "permission denied"

- Verifique as permissões do RLS
- Verifique se o usuário autenticado tem acesso às funções

### Mensagens não estão sendo processadas

- Verifique se os workers estão sendo chamados
- Verifique os logs do worker
- Verifique o visibility timeout (mensagens ficam invisíveis durante o timeout)

### Mensagens duplicadas

- Isso pode acontecer se o worker falhar e a mensagem voltar à fila
- Verifique se o worker está arquivando mensagens corretamente
- Verifique o `read_ct` - se for muito alto, a mensagem está sendo lida múltiplas vezes
