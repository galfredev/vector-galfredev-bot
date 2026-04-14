# Diseño 24/7 para OpenClaw + WhatsApp en VPS

Fecha: 2026-04-13

## Objetivo

Dejar `OpenClaw` corriendo 24/7 en un VPS `Ubuntu 24.04`, usando el VPS como instancia unica y oficial para:

- `gateway`
- canal `whatsapp`
- workspace y hooks de `Vector`

El sistema debe:

- arrancar automaticamente al reiniciar el VPS
- reiniciarse solo si el proceso principal cae
- detectar estados zombie donde el puerto queda tomado pero el RPC no responde
- detectar cuando WhatsApp queda `stopped` o `disconnected`
- intentar recuperacion automatica segura
- dejar logs claros para diagnostico

## Alcance

Se implementa una base operativa productiva para un solo bot.

Incluye:

- servicio principal `systemd`
- watchdog de salud
- timer periodico para health checks
- script de restart controlado
- documentacion operativa

No incluye en esta etapa:

- panel de observabilidad externo
- alertas por Telegram, Gmail o Slack
- alta disponibilidad multi-VPS
- relink automatico de WhatsApp sin intervencion humana si la sesion expira

## Problemas observados que este diseño corrige

1. El proceso del gateway puede quedar vivo pero roto, ocupando el puerto y devolviendo `1006 abnormal closure`.
2. `systemd` o el scheduler pueden reportar el servicio como `running` aunque el RPC no este sano.
3. WhatsApp puede quedar `linked` pero no `running` ni `connected`.
4. Archivos persistidos como `whatsapp-default-allowFrom.json` pueden quedar desalineados con la configuracion principal.
5. La recuperacion manual actual depende de comandos interactivos y no de una estrategia operativa estable.

## Arquitectura recomendada

### Runtime

- usuario dedicado: `galfrebot`
- root de trabajo: `/opt/galfre-bot`
- estado OpenClaw: `/opt/galfre-bot/.openclaw`
- binarios: `/opt/galfre-bot/.local/bin`

### Procesos

- `openclaw-galfre.service`
  - proceso principal del gateway
  - corre en foreground bajo `systemd`
  - `Restart=always`
  - `RestartSec=5`

- `openclaw-healthcheck.service`
  - ejecuta un script de verificacion
  - no queda residente

- `openclaw-healthcheck.timer`
  - corre cada 2 minutos
  - dispara el health check periodico

### Scripts operativos

- `scripts/openclaw-healthcheck.sh`
  - valida `openclaw gateway status`
  - valida `openclaw channels status --probe`
  - detecta estados invalidos
  - escribe log estructurado
  - devuelve exit code distinto de cero ante falla

- `scripts/openclaw-recover.sh`
  - mata listeners stale del puerto configurado
  - reinicia `openclaw-galfre.service`
  - revalida salud basica del gateway

- `scripts/openclaw-runtime-audit.sh`
  - revisa config critica
  - alerta si `allowFrom` persistido contradice la config
  - revisa rutas, permisos y binarios

## Flujo de recuperacion

### Caso 1: el proceso cae

`systemd` lo reinicia automaticamente.

### Caso 2: el proceso queda zombie

El health check detecta que:

- el puerto responde mal, o
- el RPC no responde, o
- el canal no esta `running/connected`

Entonces ejecuta `openclaw-recover.sh`, que:

1. detecta el PID que escucha el puerto
2. lo mata si no responde como gateway sano
3. reinicia el servicio principal
4. espera unos segundos
5. vuelve a verificar el estado

### Caso 3: WhatsApp queda desconectado

El health check:

- intenta un restart controlado del gateway una vez
- si tras el restart el estado sigue `disconnected`, deja log de incidente

Nota:

si la sesion de WhatsApp realmente expiro o fue invalidada por Meta, el sistema no debe intentar un relink ciego. Debe dejar evidencia clara para que el operador ejecute `openclaw channels login --channel whatsapp`.

## Decisiones importantes

### 1. `systemd` como base

Se usa `systemd` porque en Ubuntu es el camino mas estable para 24/7 real:

- arranque al boot
- restart automatico
- integracion con `journalctl`
- limites y politicas de proceso

### 2. Watchdog externo al proceso

No alcanza con `Restart=always`.

El problema ya observado demuestra que un proceso puede quedar vivo y roto. Por eso el watchdog valida salud real, no solo existencia del PID.

### 3. VPS como instancia unica

Todo el estado de WhatsApp y OpenClaw vive en el VPS. La PC local no debe compartir el runtime ni iniciar sesiones con ese mismo numero.

### 4. Recuperacion conservadora

Se automatiza:

- restart del gateway
- limpieza de listeners stale

No se automatiza:

- relink completo de WhatsApp
- cambios destructivos sobre credenciales

Eso evita romper una sesion valida por una falsa alarma.

## Configuracion recomendada del servicio principal

El unit file debe incorporar al menos:

- `After=network-online.target`
- `Wants=network-online.target`
- `User=galfrebot`
- `WorkingDirectory=/opt/galfre-bot`
- `Environment=HOME=/opt/galfre-bot`
- `ExecStart=/opt/galfre-bot/.local/bin/openclaw gateway --port 18789`
- `Restart=always`
- `RestartSec=5`
- `TimeoutStartSec=60`
- `TimeoutStopSec=30`
- `KillMode=mixed`

Opcional recomendable:

- `StartLimitIntervalSec`
- `StartLimitBurst`
- `StandardOutput=journal`
- `StandardError=journal`

## Health checks recomendados

El script debe considerar sano solo este escenario:

- `openclaw gateway status` con RPC exitoso
- `openclaw channels status --probe` con WhatsApp:
  - `enabled`
  - `configured`
  - `linked`
  - `running`
  - `connected`

Tambien debe validar:

- que no haya `401 Unauthorized`
- que no haya `1006 abnormal closure`
- que el `allowFrom` persistido no contradiga `allow:*`

## Logging

Se deben dejar dos capas de logs:

1. `journalctl -u openclaw-galfre.service`
2. archivo de health checks, por ejemplo:
   - `/var/log/openclaw-healthcheck.log`

Cada incidente debe registrar:

- timestamp
- tipo de falla
- salida resumida de gateway status
- salida resumida de channel probe
- accion tomada
- resultado de la recuperacion

## Testing

Antes de darlo por listo en VPS, validar:

1. reboot completo del servidor
2. servicio arriba tras boot
3. `gateway status` sano
4. `channels status --probe` sano
5. envio y recepcion real por WhatsApp
6. simulacion de proceso zombie
7. restart automatico del servicio
8. log claro del incidente

## Riesgos y trade-offs

- Un restart automatico puede recuperar muchos fallos, pero no corrige una sesion de WhatsApp expirada.
- Un watchdog demasiado agresivo puede reiniciar de mas si los timeouts son cortos.
- Si se usa `root` en vez de un usuario dedicado, baja la seguridad operativa.
- Si el runtime vive fuera de una ruta estable, aumentan los errores de permisos y paths.

## Recomendacion final

Implementar en este orden:

1. endurecer el servicio `systemd`
2. agregar `openclaw-healthcheck.sh`
3. agregar `openclaw-recover.sh`
4. agregar timer de watchdog
5. documentar instalacion y operacion

Con eso queda una base 24/7 razonablemente robusta, simple de mantener y lista para produccion en un VPS unico.
