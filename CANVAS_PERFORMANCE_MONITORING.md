# Canvas Performance Monitoring

Sistema de monitoramento de performance do canvas que rastreia FPS, lag, uso de memória e gera alertas quando há problemas de performance.

## 📊 Métricas Coletadas

- **FPS (Frames Per Second)**: Taxa de quadros por segundo
- **Frame Time**: Tempo de renderização de cada frame (ms)
- **Lag**: Diferença entre frame time esperado e real (ms)
- **Memory Usage**: Uso de memória JavaScript (Chrome apenas)
  - Used JS Heap Size
  - Total JS Heap Size
  - JS Heap Size Limit

## 🚀 Como Usar

### 1. Configuração Básica

O monitoramento é ativado automaticamente no `CanvasBoard`. Para configurar, use variáveis de ambiente:

```env
# Backend de observabilidade (console, posthog, sentry, custom)
NEXT_PUBLIC_PERFORMANCE_BACKEND=console

# Para backend 'custom'
NEXT_PUBLIC_PERFORMANCE_ENDPOINT=https://api.exemplo.com/performance
NEXT_PUBLIC_PERFORMANCE_API_KEY=seu-api-key
```

### 2. Integração com PostHog

```bash
npm install posthog-js
```

```typescript
// app/layout.tsx ou _app.tsx
import posthog from 'posthog-js';

if (typeof window !== 'undefined') {
  posthog.init('seu-project-key', {
    api_host: 'https://app.posthog.com',
  });
}
```

Configure:
```env
NEXT_PUBLIC_PERFORMANCE_BACKEND=posthog
```

### 3. Integração com Sentry

```bash
npm install @sentry/nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'seu-dsn',
  // ... outras configurações
});
```

Configure:
```env
NEXT_PUBLIC_PERFORMANCE_BACKEND=sentry
```

### 4. Endpoint Customizado

Crie um endpoint que receba os dados de performance:

```typescript
// app/api/performance/route.ts
export async function POST(request: Request) {
  const data = await request.json();
  
  // Salvar no banco de dados, enviar para analytics, etc.
  console.log('Performance data:', data);
  
  return Response.json({ success: true });
}
```

Configure:
```env
NEXT_PUBLIC_PERFORMANCE_BACKEND=custom
NEXT_PUBLIC_PERFORMANCE_ENDPOINT=/api/performance
```

## 🎨 Monitor em Tempo Real (Debug)

Para exibir métricas em tempo real durante desenvolvimento:

```tsx
import { CanvasPerformanceMonitor } from '@/components/canvas/CanvasPerformanceMonitor';

// No componente do canvas
<CanvasPerformanceMonitor 
  enabled={process.env.NODE_ENV === 'development'}
  position="top-right"
  showDetails={true}
/>
```

**Atalho**: Pressione `Ctrl+Shift+P` para mostrar/ocultar o monitor.

## 📈 Relatórios

O sistema gera relatórios automáticos a cada 30 segundos (configurável) com:

- **Estatísticas agregadas**: média, mínimo, máximo de FPS, frame time, memória
- **Performance Score**: Score de 0-100 baseado em FPS e lag events
- **Alertas**: Eventos que excederam os thresholds configurados

### Thresholds Padrão

- **Min FPS**: 30
- **Max Frame Time**: 33.33ms (~30 FPS)
- **Max Memory**: 100 MB

### Tipos de Alertas

- `low_fps`: FPS abaixo do threshold
- `high_frame_time`: Frame time acima do threshold
- `high_memory`: Uso de memória acima do threshold
- `lag_detected`: Lag detectado (> 16.67ms)

## 🔧 Customização

### Ajustar Intervalos

```typescript
const { currentMetrics } = useCanvasPerformance({
  sampleInterval: 2000, // Coleta métricas a cada 2 segundos
  reportInterval: 60000, // Envia relatório a cada 60 segundos
  thresholds: {
    minFPS: 45, // Threshold mais alto
    maxFrameTime: 22.22, // ~45 FPS
    maxMemoryMB: 150,
  },
});
```

### Callbacks Customizados

```typescript
const { currentMetrics } = useCanvasPerformance({
  onMetrics: (metrics) => {
    // Fazer algo com cada métrica coletada
    if (metrics.fps < 30) {
      console.warn('Low FPS detected!', metrics);
    }
  },
  onReport: (report) => {
    // Fazer algo com o relatório completo
    console.log('Performance Report:', report);
    
    // Enviar para seu próprio sistema
    fetch('/api/custom-performance', {
      method: 'POST',
      body: JSON.stringify(report),
    });
  },
});
```

## 📊 Estrutura dos Dados

### CanvasPerformanceMetrics

```typescript
{
  fps: number;
  frameTime: number; // ms
  memoryUsage?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  lag: number; // ms
  timestamp: number;
}
```

### CanvasPerformanceReport

```typescript
{
  sessionId?: string;
  userId?: string;
  startTime: number;
  endTime: number;
  duration: number;
  metrics: CanvasPerformanceMetrics[];
  summary: {
    avgFPS: number;
    minFPS: number;
    maxFPS: number;
    avgFrameTime: number;
    maxFrameTime: number;
    avgMemoryMB?: number;
    maxMemoryMB?: number;
    lagEvents: number;
    performanceScore: number; // 0-100
  };
  alerts: Array<{
    type: 'low_fps' | 'high_frame_time' | 'high_memory' | 'lag_detected';
    timestamp: number;
    value: number;
    threshold: number;
  }>;
}
```

## 🎯 Casos de Uso

### 1. Identificar Problemas de Performance

Monitore quando usuários reportam lentidão no canvas:

```typescript
// Alertas são enviados automaticamente quando thresholds são excedidos
// Configure alertas no seu backend de observabilidade
```

### 2. A/B Testing de Features

Compare performance entre diferentes implementações:

```typescript
// Envie performance score junto com eventos de feature
posthog.capture('canvas_feature_used', {
  feature: 'new_drawing_tool',
  performanceScore: report.summary.performanceScore,
});
```

### 3. Otimização Proativa

Identifique padrões de uso que causam problemas:

```typescript
// Analise relatórios para encontrar:
// - Número de cards que causa degradação
// - Ferramentas que causam mais lag
// - Padrões de memória que indicam leaks
```

## 🔍 Debugging

### Console Logs

Com `backend: 'console'`, todos os relatórios são logados no console:

```
🎨 Canvas Performance Report
Summary: { avgFPS: 58.5, minFPS: 45, ... }
Alerts: [...]
```

### Chrome DevTools

1. Abra DevTools → Performance
2. Grave uma sessão enquanto usa o canvas
3. Compare com métricas do monitor

### Memory Profiling

O monitor mostra uso de memória em tempo real. Para análise detalhada:

1. Chrome DevTools → Memory
2. Take Heap Snapshot
3. Compare snapshots antes/depois de usar o canvas

## ⚠️ Limitações

- **Memory API**: Disponível apenas no Chrome/Edge
- **Precisão**: Métricas podem variar entre navegadores
- **Overhead**: Monitoramento adiciona ~1-2ms por frame (mínimo)

## 🚀 Próximos Passos

- [ ] Dashboard de performance no admin
- [ ] Alertas automáticos por email/Slack
- [ ] Comparação de performance entre versões
- [ ] Integração com CI/CD para detectar regressões
