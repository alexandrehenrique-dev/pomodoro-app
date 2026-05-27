
# Pomodoro App

Aplicação web de Pomodoro com timer robusto, persistência em localStorage, suporte a light/dark mode e responsividade.

> UI original: [Figma – Pomodoro App Interface Design](https://www.figma.com/design/gxl8uFYTnmr8LqCt3yTFXE/Pomodoro-App-Interface-Design)

## Stack

- React 18 + TypeScript
- Tailwind CSS v4
- Radix UI (Dialog, Switch, Progress)
- Sonner (toasts)
- next-themes (dark/light mode automático via sistema operacional)
- Vite

## Como executar localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173` no navegador.

## Deploy via Docker

### Build e execução manual

```bash
npm run build
docker build -t pomodoro-app:latest .
docker run -d --name pomodoro-app --restart unless-stopped -p 8081:80 pomodoro-app:latest
```

Acesse `http://localhost:8081`.

### Parar e remover

```bash
docker stop pomodoro-app && docker rm pomodoro-app
```

### Deploy automatizado (genesis-lab)

O repositório inclui um workflow GitHub Actions em `.github/workflows/deploy-genesis-lab.yml` que roda em self-hosted runner no genesis-lab.  
Toda vez que um commit é feito na `main`, o runner faz build da imagem e sobe o container automaticamente na porta `8081`.

## Estrutura

```
src/
  types/
    pomodoro.ts          # Tipos centralizados (PomodoroPhase, Session, History, Settings)
  services/
    pomodoroStorage.ts   # Camada de persistência no localStorage
    soundService.ts      # Serviço de áudio com desbloqueio de autoplay
  hooks/
    usePomodoroTimer.ts  # Hook principal (timestamps + Page Visibility API)
  utils/
    time.ts              # Formatação de tempo
  app/
    App.tsx              # Orquestração principal
    components/
      NewPomodoroModal.tsx  # Modal de criação/configuração
      PomodoroTimer.tsx     # Timer + controles
      SessionHistory.tsx    # Histórico de sessões
      EmptyState.tsx        # Tela inicial
```

## Regras de negócio

### Timer com timestamps

O timer **não depende exclusivamente de `setInterval`**. Usa:
- `currentPhaseStartedAt` — timestamp (ms) de início da fase atual (ou da retomada)
- `remainingMs` calculado em tempo real: `phaseDuration - (now - currentPhaseStartedAt)`
- `pausedAt` — timestamp do momento da pausa
- Ao retomar, `currentPhaseStartedAt` é recalculado para que o tempo restante seja exato

### Page Visibility API

Ao voltar para a aba:
1. Recalcula `elapsed = now - currentPhaseStartedAt`
2. Se o ciclo expirou enquanto a aba estava oculta, avança para a próxima fase
3. Toast e som são disparados mesmo com atraso

### Som

Browsers modernos bloqueiam autoplay antes de interação do usuário. Por isso:
- O botão **"Testar som"** no modal chama `unlockAudio()` que prepara o contexto de áudio
- Se o áudio falhar no fim do ciclo → alerta visual no topo da tela
- Fallback visual sempre presente

### Persistência (localStorage)

```
pomodoro:activeSession  — sessão ativa (restaurada ao recarregar)
pomodoro:history        — histórico (últimas 100 sessões)
pomodoro:settings       — última configuração usada
```

> **TODO:** substituir esta camada por integração com backend/API no futuro.
> Ver `src/services/pomodoroStorage.ts`

### Notificações

A Notifications API é opcional — se negada, o app funciona normalmente via toasts.

## Testes manuais esperados

| Cenário | Resultado esperado |
|---|---|
| Desktop, aba ativa | Alarme toca ao fim de cada ciclo |
| Desktop, aba em segundo plano | Alarme toca; ao voltar, UI já mostra a fase correta |
| Mobile, tela ativa (após clicar "Iniciar") | Alarme toca — áudio desbloqueado pelo gesto inicial |
| Mobile, app em background por mais tempo que o ciclo | Timer corrige o tempo ao retornar; áudio pode ser bloqueado → fallback visual e vibração |
| Reload durante ciclo ativo | Timer restaura da sessão salva e retoma a contagem correta |
| iOS/Safari, aba minimizada | Timer avança corretamente ao retornar; som não garantido por política do sistema — aviso exibido |

> **Nota iOS/Safari:** o sistema operacional suspende timers e contextos de áudio de abas em background. O app detecta o retorno via `visibilitychange`, `focus` e `pageshow` (bfcache), corrige o timer pelo relógio real e exibe fallback visual. Som em background bloqueado é comportamento intencional do sistema, não um bug.

## Limitações conhecidas

- Áudio pode falhar em browsers com autoplay restrito (ex: Safari iOS) — fallback visual e vibração são exibidos
- Sem PWA/Service Worker: se o app for **fechado** (não só minimizado), o timer não continua em background
