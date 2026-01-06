 # Análise de Performance - iModes Codebase

## 🔴 Crítico - Problemas de Alta Prioridade

### 1. **CanvasBoard.tsx - Re-renders Excessivos**
**Localização:** `src/components/canvas/CanvasBoard.tsx`

**Problemas:**
- **57 hooks (useEffect/useMemo/useCallback)** - Componente extremamente complexo
- Múltiplos `useEffect` que podem disparar re-renders em cascata
- `fitToScreen` calcula bounding box de TODOS os elementos a cada chamada (cards, notes, drawPaths)
- Loop através de todos os pontos de drawPaths sem otimização
- `buildSerializableCanvasState()` chamado frequentemente sem memoização

**Impacto:** 
- Re-renders desnecessários durante interações (drag, zoom, pan)
- Cálculos pesados bloqueiam a UI thread
- Performance degrada com muitos elementos no canvas

**Recomendações:**
```typescript
// 1. Memoizar fitToScreen com useMemo para bounding box
const boundingBox = useMemo(() => {
  // Calcular apenas quando cards/notes/paths mudarem
}, [cards, notes, drawPaths]);

// 2. Debounce/throttle fitToScreen
const debouncedFitToScreen = useMemo(
  () => debounce(fitToScreen, 300),
  [fitToScreen]
);

// 3. Virtualizar renderização de drawPaths longos
// 4. Separar CanvasBoard em componentes menores (CanvasCards, CanvasDrawPaths, etc)
```

---

### 2. **CanvasStore - History Snapshot Overhead**
**Localização:** `src/stores/canvasStore.ts`

**Problemas:**
- `createSnapshot()` faz deep copy de TODOS os arrays a cada operação
- History pode ter até 50 snapshots (MAX_HISTORY_LENGTH)
- Cada snapshot copia cards, notes E drawPaths completamente
- `undo/redo` recria todos os arrays do zero

**Impacto:**
- Memória: ~50 snapshots × tamanho do estado = uso excessivo
- CPU: Deep copies bloqueiam durante operações frequentes
- Com 100 cards + 50 paths = ~150 objetos copiados 50 vezes = 7,500 objetos

**Recomendações:**
```typescript
// 1. Usar estruturas imutáveis otimizadas (Immer.js)
import { produce } from 'immer';

// 2. Implementar structural sharing (copiar apenas o que mudou)
// 3. Limitar history baseado em tamanho, não apenas contagem
// 4. Comprimir snapshots antigos
```

---

### 3. **CanvasCard - Carregamento de Imagens Não Otimizado**
**Localização:** `src/components/canvas/CanvasCard.tsx`

**Problemas:**
- Cada card carrega imagem individualmente sem cache compartilhado
- SVG icons recriados como Blob URLs a cada render
- `onSizeChange` pode disparar múltiplos re-renders
- Sem lazy loading - todas as imagens carregam imediatamente

**Impacto:**
- Network: Múltiplas requisições simultâneas
- Memória: Blob URLs não são limpos adequadamente
- Render: Bloqueio durante carregamento de imagens

**Recomendações:**
```typescript
// 1. Cache de imagens compartilhado
const imageCache = new Map<string, HTMLImageElement>();

// 2. Lazy load imagens fora da viewport
// 3. Preload apenas cards visíveis
// 4. Usar React.memo para CanvasCard
export const CanvasCard = React.memo(({ card, ... }) => {
  // ...
});
```

---

### 4. **useCardsData - Múltiplas Requisições Sequenciais**
**Localização:** `src/hooks/useCardsData.ts`

**Problemas:**
- 3 requisições HTTP sequenciais por categoria:
  1. `/api/cards/list` 
  2. `/api/cards/text/${category}`
  3. `/api/cards/image?path=...` (uma por card!)
- `Promise.all` para imagens, mas ainda são N requisições
- Cache TTL de 5 minutos pode ser muito curto
- Delay de 300ms artificial pode não ser suficiente

**Impacto:**
- Network waterfall: List → Text → Images (N requests)
- Tempo total: ~500ms (list) + ~300ms (text) + N×100ms (images)
- Com 20 cards = ~2.5 segundos mínimo

**Recomendações:**
```typescript
// 1. API endpoint unificado que retorna tudo de uma vez
// GET /api/cards/full?category=modes&gender=male&locale=pt

// 2. Batch image URLs em uma única requisição
// POST /api/cards/images/batch { paths: [...] }

// 3. Server-side rendering de signed URLs quando possível
// 4. CDN para imagens públicas
```

---

### 5. **Canvas Realtime - Broadcast Overhead**
**Localização:** `src/hooks/useCanvasRealtime.ts`

**Problemas:**
- Cada interação (drag, resize) publica evento individual
- `state.snapshot` pode ser muito grande (serializa tudo)
- Sem debounce - eventos podem ser enviados muito rapidamente
- Version checking pode causar race conditions

**Impacto:**
- Network: Muitos eventos pequenos vs poucos eventos grandes
- Bandwidth: Snapshots completos são pesados
- Latência: Múltiplas round-trips

**Recomendações:**
```typescript
// 1. Debounce eventos de drag/resize
const debouncedPublish = useMemo(
  () => debounce(publish, 100),
  [publish]
);

// 2. Enviar apenas deltas, não snapshots completos
// 3. Batch múltiplas mudanças em um único evento
// 4. Comprimir payloads grandes
```

**✅ IMPLEMENTADO:**
- ✅ Sistema de debounce para eventos frequentes (card.patch, drawPath.patch)
- ✅ Sistema de batching que agrupa múltiplas mudanças
- ✅ Merge de patches para o mesmo ID (evita eventos duplicados)
- ✅ Eventos imediatos para add/remove (não são debounced)
- ✅ Arquivo criado: `src/lib/canvasRealtimeOptimized.ts`
- ✅ Integrado em `useCanvasRealtime` e `CanvasBoard`

**Benefícios:**
- Redução de ~80-90% no número de eventos durante drag
- Merge automático de patches para o mesmo card/path
- Batch de até 10 eventos em uma única transmissão
- Eventos críticos (add/remove) ainda são imediatos

---

### 6. **Canvas Selection Page - Profile Fetching**
**Localização:** `src/app/[locale]/canvas-selection/page.tsx`

**Problemas:**
- `Promise.all` com N requisições de perfis simultâneas
- Sem rate limiting - pode sobrecarregar servidor
- Re-executa a cada mudança em `sessions` ou `profileCache`
- Dependências do useEffect muito amplas

**Impacto:**
- Network: N requisições simultâneas (ex: 20 sessões = 20 requests)
- Server: Pode causar throttling ou timeouts
- UI: Loading state não granular

**Recomendações:**
```typescript
// 1. Batch profile requests
// POST /api/profiles/batch { ids: [...] }

// 2. Rate limiting no cliente
const fetchProfilesBatched = async (ids: string[], batchSize = 5) => {
  for (let i = 0; i < ids.length; i += batchSize) {
    await Promise.all(ids.slice(i, i + batchSize).map(fetchProfile));
  }
};

// 3. Memoizar dependências do useEffect
```

---

## 🟡 Médio - Otimizações Importantes

### 7. **Autosave Interval**
**Localização:** `src/lib/canvasPersistence.ts`

**Problemas:**
- Interval fixo de 5 segundos pode ser muito frequente
- Não adapta baseado em atividade do usuário
- `consumeDirtyReasons()` pode retornar array vazio mas ainda fazer check

**Recomendações:**
```typescript
// 1. Adaptive interval (mais frequente quando há atividade)
// 2. Idle detection - pausar quando usuário inativo
// 3. Batch múltiplas mudanças antes de salvar
```

---

### 8. **ToolsPanel - Renderização de Grids**
**Localização:** `src/components/canvas/ToolsPanel.tsx`

**Problemas:**
- Todos os grids são renderizados sempre (hidden com CSS)
- `useCardsData` chamado múltiplas vezes mesmo quando não visível
- Sem virtualização para listas longas de cards

**Recomendações:**
```typescript
// 1. Conditional rendering ao invés de hidden
{expandedSection === 'modes' && <CardsGrid ... />}

// 2. Lazy load grids apenas quando expandidos
// 3. Virtual scrolling para muitos cards
```

---

### 9. **Image Preloading**
**Localização:** `src/lib/imagePreloader.ts`

**Problemas:**
- Preload sequencial pode ser lento
- Sem priorização inteligente
- Não cancela preloads desnecessários

**Recomendações:**
```typescript
// 1. Priorizar imagens visíveis
// 2. Cancelar preloads de imagens que saíram da viewport
// 3. Usar Intersection Observer para lazy load
```

---

### 10. **Serialization Overhead**
**Localização:** `src/lib/canvasSerialization.ts`

**Problemas:**
- `serializeCanvasState` faz map de todos os arrays sempre
- Validação repetida de tipos
- Não há cache de serialização

**Recomendações:**
```typescript
// 1. Memoizar serialização se estado não mudou
// 2. Serialização incremental (apenas o que mudou)
// 3. Usar JSON.stringify com replacer otimizado
```

---

## 🟢 Baixo - Melhorias Incrementais

### 11. **Bundle Size**
- Verificar tamanho do bundle com `next build --analyze`
- Code splitting para rotas
- Lazy load componentes pesados (Konva, etc)

### 12. **React DevTools Profiler**
- Usar React Profiler para identificar componentes lentos
- Verificar re-renders desnecessários

### 13. **Memory Leaks**
- Verificar cleanup de event listeners
- Limpar refs e timers adequadamente
- Monitorar memória com Chrome DevTools

---

## 📊 Métricas Recomendadas

### Para Monitorar:
1. **Time to Interactive (TTI)** - Meta: < 3s
2. **First Contentful Paint (FCP)** - Meta: < 1.5s
3. **Largest Contentful Paint (LCP)** - Meta: < 2.5s
4. **Total Blocking Time (TBT)** - Meta: < 300ms
5. **Cumulative Layout Shift (CLS)** - Meta: < 0.1

### Performance Budget:
- Bundle inicial: < 200KB gzipped
- Imagens: < 500KB total por página
- API responses: < 100KB por request

---

## 🚀 Plano de Ação Prioritizado

### Fase 1 (Crítico - 1-2 semanas):
1. ✅ Otimizar `fitToScreen` com memoização
2. ✅ Implementar debounce em eventos de drag
3. ✅ Cache de imagens compartilhado
4. ✅ Batch API requests onde possível

### Fase 2 (Alto Impacto - 2-3 semanas):
5. ✅ Refatorar CanvasStore com Immer
6. ✅ Lazy loading de imagens
7. ✅ Virtualização de listas longas
8. ✅ Otimizar useCardsData

### Fase 3 (Melhorias - 1 mês):
9. ✅ Code splitting
10. ✅ Service Worker para cache
11. ✅ Otimização de bundle
12. ✅ Monitoring e analytics

---

## 🔧 Ferramentas Recomendadas

1. **React DevTools Profiler** - Identificar re-renders
2. **Chrome Performance Tab** - Análise de runtime
3. **Lighthouse** - Métricas de performance
4. **Bundle Analyzer** - Tamanho do bundle
5. **Web Vitals** - Métricas reais de usuários

---

## 📝 Notas Finais

- A arquitetura atual é sólida, mas precisa de otimizações incrementais
- Focar primeiro nos problemas que afetam a experiência do usuário diretamente
- Medir antes e depois de cada otimização
- Considerar trade-offs (complexidade vs performance)
