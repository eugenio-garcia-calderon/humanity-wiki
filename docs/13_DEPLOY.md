# 13 — Despliegue de humanity.wiki en producción

> Runbook de la Fase B del plan de lanzamiento (2026-08-05). Estado: Docker,
> Caddy y CI/CD listos en el repositorio; a la espera del servidor Hetzner y
> de que los nameservers del dominio apunten a Cloudflare.

## Arquitectura

```
Usuario → Cloudflare (DNS+CDN+WAF, SSL Full strict) → Hetzner CPX42
            └─ Caddy (HTTPS, HTTP/3, cabeceras) → app (Node, dist/server.cjs)
                                                    └─ db (Postgres 17 + PostGIS)
```

**La máquina, medida por SSH el 2026-08-23**: Hetzner **CPX42** — 8 núcleos AMD
EPYC, 16 GB de memoria (15 utilizables) y 301 GB de disco, 69,49 €/mes.

Hasta hoy este fichero decía `CCX33` en cinco sitios, que es otro modelo con
otras características. No es una errata inofensiva: quien planifica leyendo esto
planifica sobre una máquina que no existe, y esta misma noche pasó — se estimó el
reparto de la plataforma entre los ocho núcleos creyendo que había el doble de
memoria de la que hay.

- `Dockerfile` — imagen multi-stage: `npm run build` (Vite + esbuild) y una
  imagen final mínima con `dist/` y dependencias de producción.
- `docker-compose.prod.yml` — db + app + caddy, volúmenes persistentes y
  healthchecks.
- `deploy/Caddyfile` — HTTPS automático, www→apex, HSTS, caché de assets.
- `.github/workflows/deploy.yml` — cada merge a `main` despliega por SSH
  (cuando existan los secretos `DEPLOY_HOST`/`DEPLOY_USER`/`DEPLOY_SSH_KEY`).

## Bootstrap del servidor (una sola vez)

Como root en el CPX42 recién creado (Ubuntu 24.04):

```bash
# 1. Usuario de despliegue y Docker
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy 2>/dev/null || true
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy

# 2. Clave SSH exclusiva para GitHub Actions (la privada va al secreto DEPLOY_SSH_KEY)
su - deploy -c "ssh-keygen -t ed25519 -N '' -f ~/.ssh/deploy_ci && cat ~/.ssh/deploy_ci.pub >> ~/.ssh/authorized_keys && cat ~/.ssh/deploy_ci"

# 3. Código
mkdir -p /opt/humanity-wiki && chown deploy:deploy /opt/humanity-wiki
su - deploy -c "git clone https://github.com/eugeniogarcia30-cmd/humanity-wiki.git /opt/humanity-wiki"

# 4. Variables reales (ver .env.production.example) — SOLO claves de test de Stripe
cp /opt/humanity-wiki/.env.production.example /opt/humanity-wiki/.env.production
nano /opt/humanity-wiki/.env.production

# 5. Primer arranque
cd /opt/humanity-wiki && docker compose -f docker-compose.prod.yml up -d --build
```

## Datos iniciales

La forma más simple y fiel: volcar la base de datos de desarrollo (lleva
territorios, objetivos, indicadores, el grafo de Ceuta, usuarios demo) y
restaurarla en el contenedor:

```bash
# En el Mac de desarrollo:
pg_dump -Fc "host=localhost dbname=redhumana" > humanity.dump
scp humanity.dump deploy@IP:/opt/humanity-wiki/

# En el servidor:
docker compose -f docker-compose.prod.yml cp humanity.dump db:/tmp/
docker compose -f docker-compose.prod.yml exec db pg_restore -U humanity -d humanity --no-owner /tmp/humanity.dump
```

(Alternativa limpia: aplicar `drizzle/*.sql` en orden y correr los seeds.)

## DNS (cuando la zona de Cloudflare esté activa)

Registros a crear (proxy naranja activado en ambos):

| Tipo | Nombre | Contenido |
|---|---|---|
| A | humanity.wiki | IP del CPX42 |
| A | www | IP del CPX42 |

SSL de Cloudflare en **Full (strict)** — Caddy presenta certificado válido.

## Checklist previo a abrir la beta

- [ ] Nameservers en atom.com → amanda/damiete.ns.cloudflare.com (TÚ)
- [ ] Servidor Hetzner CPX42 creado con firewall (80/443/SSH) y backups (TÚ)
- [ ] Secretos DEPLOY_* en GitHub → primer despliegue automático
- [ ] Verificación de email en el registro (necesita cuenta de Resend) (TÚ+YO)
- [ ] Rate limiting + páginas legales (YO)
- [ ] Backups de BD a R2 con pgBackRest (YO, necesita token R2)
- [ ] Prueba de humo completa en https://humanity.wiki
