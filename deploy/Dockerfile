# Static FleetGuardian demo: measured ASR + revision scenario UI.
# Semgrep source API and live ASR worker stay local; not included here.
FROM nginx:1.25.3-alpine

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY web/dist/ /usr/share/nginx/html/

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
