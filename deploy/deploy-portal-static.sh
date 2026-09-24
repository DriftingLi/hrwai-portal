#!/usr/bin/env bash
# ======================================================================
# deploy-portal-static.sh — 服务器端官网静态站部署脚本（PVE 宿主机 Docker 直连）
# 由 GitHub Actions CD 通过 SSH 上传并执行；也可手动执行：
#   bash deploy-portal-static.sh
# 前置：站点 HTML 已上传至 ${SITE_DIR}/index.html
# ======================================================================
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/opt/hrwai-portal}"
SITE_DIR="${SITE_DIR:-${DEPLOY_PATH}/site}"
PORTAL_STATIC_IMAGE="${PORTAL_STATIC_IMAGE:-nginx:1.27-alpine}"

log_info()  { echo "[PORTAL-DEPLOY] $(date '+%H:%M:%S') $1"; }
log_ok()    { echo "[PORTAL-DEPLOY] $(date '+%H:%M:%S') OK $1"; }
log_error() { echo "[PORTAL-DEPLOY] $(date '+%H:%M:%S') FAIL $1"; exit 1; }

command -v docker >/dev/null 2>&1 || log_error "未找到 docker"
[ -f "${SITE_DIR}/index.html" ] || log_error "站点文件缺失: ${SITE_DIR}/index.html"

log_info "部署静态站点: ${SITE_DIR} (镜像: ${PORTAL_STATIC_IMAGE})"

# ---- 生成 .env（compose 变量来源） ----
cat > "${DEPLOY_PATH}/.env" << EOF
DEPLOY_PATH=${DEPLOY_PATH}
SITE_DIR=${SITE_DIR}
PORTAL_STATIC_IMAGE=${PORTAL_STATIC_IMAGE}
EOF
log_ok "已生成 ${DEPLOY_PATH}/.env"

# ---- 拉取 nginx 镜像（跨境/镜像源抖动：失败重试一次） ----
if docker image inspect "${PORTAL_STATIC_IMAGE}" >/dev/null 2>&1; then
    log_ok "镜像已缓存，跳过拉取: ${PORTAL_STATIC_IMAGE}"
else
    timeout 300 docker pull "${PORTAL_STATIC_IMAGE}" \
        || timeout 300 docker pull "${PORTAL_STATIC_IMAGE}" \
        || log_error "镜像拉取失败: ${PORTAL_STATIC_IMAGE}"
    log_ok "镜像拉取完成: ${PORTAL_STATIC_IMAGE}"
fi

cd "${DEPLOY_PATH}"

# ---- 移除同名旧容器（可能是上一版 Nuxt 镜像实例），避免占用 127.0.0.1:3000 ----
if docker ps -a --format '{{.Names}}' | grep -qx 'hrwai-portal'; then
    log_info "移除旧容器 hrwai-portal"
    docker rm -f hrwai-portal >/dev/null 2>&1 || true
fi

docker compose -f deploy/docker-compose.portal-static.yml up -d portal \
    || log_error "容器启动失败"

# ---- 健康检查 ----
for i in $(seq 1 15); do
    if curl -sf -o /dev/null "http://127.0.0.1:3000/healthz"; then
        log_ok "门户健康检查通过 (127.0.0.1:3000)"
        exit 0
    fi
    sleep 2
done

docker logs --tail 50 hrwai-portal 2>/dev/null || true
log_error "门户健康检查失败（http://127.0.0.1:3000/healthz）"
