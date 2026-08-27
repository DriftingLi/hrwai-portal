#!/usr/bin/env bash
# ======================================================================
# deploy-portal.sh — 服务器端官网门户部署脚本（PVE 宿主机 Docker 直连）
# 由 GitHub Actions CD 通过 SSH 上传并执行；也可手动执行：
#   bash deploy-portal.sh            # 正常部署
#   bash deploy-portal.sh --rollback # 回滚到上一个版本
# ======================================================================
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/opt/hrwai-portal}"
BACKUP_FILE="${DEPLOY_PATH}/.previous-image"

MODE="${1:-deploy}"  # deploy | rollback

log_info()  { echo "[PORTAL-DEPLOY] $(date '+%H:%M:%S') $1"; }
log_ok()    { echo "[PORTAL-DEPLOY] $(date '+%H:%M:%S') OK $1"; }
log_error() { echo "[PORTAL-DEPLOY] $(date '+%H:%M:%S') FAIL $1"; exit 1; }

# ---- 镜像与注册表 ----
REGISTRY="${REGISTRY:-ghcr.io}"
IMAGE="${IMAGE:-ghcr.io/driftingli/hrwai-portal}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
REGISTRY_PROXY="${REGISTRY_PROXY:-}"
KEEP_IMAGES="${KEEP_IMAGES:-3}"

# ---- 运行期环境 ----
NUXT_API_INTERNAL_BASE="${NUXT_API_INTERNAL_BASE:-http://127.0.0.1:8080}"
PORTAL_SITE_URL="${PORTAL_SITE_URL:-}"
NUXT_PUBLIC_BAIDU_VERIFICATION="${NUXT_PUBLIC_BAIDU_VERIFICATION:-}"

# 镜像加速代理（ghcr pull-through 缓存）
IMAGE_ORIG="${IMAGE}:${IMAGE_TAG}"
if [ -n "$REGISTRY_PROXY" ]; then
    REGISTRY_PROXY="${REGISTRY_PROXY%/}"
    case "$IMAGE" in
        ghcr.io/*) IMAGE="${REGISTRY_PROXY}/${IMAGE#ghcr.io/}" ;;
    esac
fi
PORTAL_IMAGE="${IMAGE}:${IMAGE_TAG}"
PORTAL_IMAGE="${PORTAL_IMAGE,,}"

log_info "部署镜像: ${PORTAL_IMAGE} (原始: ${IMAGE_ORIG})"

# ---- 前置检查 ----
command -v docker >/dev/null 2>&1 || log_error "未找到 docker"

# ---- 登录注册表（拉取私有镜像） ----
if [ -n "$GITHUB_TOKEN" ] && [ "$REGISTRY" = "ghcr.io" ]; then
    echo "$GITHUB_TOKEN" | docker login "$REGISTRY" -u "deploy" --password-stdin >/dev/null 2>&1 || true
    log_ok "已登录 $REGISTRY"
fi

# ---- 镜像加速代理就绪检查 ----
# REGISTRY_PROXY=127.0.0.1:5000 时确保 ghcr pull-through 缓存容器在运行
# （与 FL deploy-remote.sh 管理的 ghcr-proxy 共用同一容器；未运行时自动创建）
ensure_registry_proxy() {
    [ -z "$REGISTRY_PROXY" ] && return 0
    if curl -s -o /dev/null "http://${REGISTRY_PROXY}/v2/"; then
        return 0
    fi
    if [ "$REGISTRY_PROXY" != "127.0.0.1:5000" ]; then
        log_info "镜像加速代理非本机回环地址 (${REGISTRY_PROXY})，不做自动管理"
        return 0
    fi
    log_info "启动 ghcr pull-through 缓存容器 (registry:2)..."
    docker rm -f ghcr-proxy >/dev/null 2>&1 || true
    docker pull registry:2 >/dev/null 2>&1 || true
    local proxy_env=(-e REGISTRY_PROXY_REMOTEURL=https://ghcr.io)
    # 私有镜像经代理拉取需要向上游 ghcr.io 认证（token 为 CI 短期凭据，
    # 后续 FL 部署会重建容器刷新）
    if [ -n "$GITHUB_TOKEN" ]; then
        proxy_env+=(-e REGISTRY_PROXY_USERNAME=oauth2 -e "REGISTRY_PROXY_PASSWORD=$GITHUB_TOKEN")
    fi
    docker run -d --name ghcr-proxy --restart unless-stopped \
        -p 127.0.0.1:5000:5000 \
        "${proxy_env[@]}" \
        -v ghcr-cache:/var/lib/registry \
        registry:2 >/dev/null 2>&1 || true
    local i
    for i in $(seq 1 10); do
        if curl -s -o /dev/null "http://127.0.0.1:5000/v2/"; then
            log_ok "镜像加速代理就绪: 127.0.0.1:5000"
            return 0
        fi
        sleep 1
    done
    log_info "镜像加速代理未就绪，拉取将回退直连 ghcr.io"
}
ensure_registry_proxy

mkdir -p "$DEPLOY_PATH/deploy"
cp "$DEPLOY_PATH/deploy/docker-compose.portal.yml" "$DEPLOY_PATH/docker-compose.portal.yml" 2>/dev/null \
    || cp docker-compose.portal.yml "$DEPLOY_PATH/docker-compose.portal.yml"

# ---- 生成 .env（供 compose 使用） ----
env_val() {
    local val="$1"
    if [ -z "$val" ]; then
        printf '""'
    elif printf '%s' "$val" | grep -q "[[:space:]\$+#{}()&|!<>'\";=]" 2>/dev/null; then
        printf '"%s"' "$(printf '%s' "$val" | sed 's/"/\\"/g')"
    else
        printf '%s' "$val"
    fi
}
{
    printf 'PORTAL_IMAGE=%s\n' "$(env_val "$PORTAL_IMAGE")"
    printf 'NUXT_API_INTERNAL_BASE=%s\n' "$(env_val "$NUXT_API_INTERNAL_BASE")"
    printf 'PORTAL_SITE_URL=%s\n' "$(env_val "$PORTAL_SITE_URL")"
    printf 'NUXT_PUBLIC_BAIDU_VERIFICATION=%s\n' "$(env_val "$NUXT_PUBLIC_BAIDU_VERIFICATION")"
} > "$DEPLOY_PATH/.env"
log_ok "已生成 $DEPLOY_PATH/.env"

if [ "$MODE" = "rollback" ]; then
    if [ ! -f "$BACKUP_FILE" ]; then
        log_error "无回滚记录"
    fi
    OLD_IMAGE=$(cat "$BACKUP_FILE")
    log_info "回滚到: ${OLD_IMAGE}"
    PORTAL_IMAGE="$OLD_IMAGE"
    sed -i "s|^PORTAL_IMAGE=.*|PORTAL_IMAGE=\"$OLD_IMAGE\"|" "$DEPLOY_PATH/.env"
fi

# ---- 拉取并启动（三级回退：ghcr-proxy → NJU 镜像源 → 直连 ghcr.io）----
# ISP 对大文件持续传输断流：代理与直连拉取均可能长期挂起，
# 所有 pull 用 timeout 包装；失败后回退支持续传的国内镜像源
REGISTRY_MIRROR="${REGISTRY_MIRROR:-ghcr.nju.edu.cn}"
if [ -n "$GITHUB_TOKEN" ] && [ "$REGISTRY" = "ghcr.io" ] && [ -n "$REGISTRY_PROXY" ]; then
    # 经本地代理拉取（私有镜像：代理无凭据时回退）
    if ! timeout 600 docker pull "$PORTAL_IMAGE" >/dev/null 2>&1; then
        MIRROR_IMAGE="${REGISTRY_MIRROR}/${IMAGE#ghcr.io/}:${IMAGE_TAG}"
        MIRROR_IMAGE="${MIRROR_IMAGE,,}"
        log_info "代理拉取失败/超时，回退国内镜像源: ${MIRROR_IMAGE}"
        echo "$GITHUB_TOKEN" | docker login "$REGISTRY_MIRROR" -u oauth2 --password-stdin >/dev/null 2>&1 || true
        if timeout 900 docker pull "$MIRROR_IMAGE" >/dev/null 2>&1; then
            docker tag "$MIRROR_IMAGE" "$PORTAL_IMAGE"
            log_ok "国内镜像源拉取成功，已 tag 为 ${PORTAL_IMAGE}"
        else
            log_info "国内镜像源拉取失败，回退直连 ${IMAGE_ORIG}"
            PORTAL_IMAGE="${IMAGE_ORIG,,}"
            sed -i "s|^PORTAL_IMAGE=.*|PORTAL_IMAGE=\"$PORTAL_IMAGE\"|" "$DEPLOY_PATH/.env"
            timeout 600 docker pull "$PORTAL_IMAGE" >/dev/null || log_error "镜像拉取失败: $PORTAL_IMAGE"
        fi
    fi
else
    timeout 600 docker pull "$PORTAL_IMAGE" >/dev/null || log_error "镜像拉取失败: $PORTAL_IMAGE"
fi

# 回滚记录（回滚时还原为新镜像，避免二次回滚又回旧值）
if [ "$MODE" = "rollback" ]; then
    echo "$IMAGE_ORIG" > "$BACKUP_FILE"
else
    echo "$PORTAL_IMAGE" > "$BACKUP_FILE"
fi

cd "$DEPLOY_PATH"
docker compose -f docker-compose.portal.yml up -d portal || log_error "容器启动失败"

# ---- 健康检查 ----
HEALTH_OK=0
for i in $(seq 1 15); do
    if curl -sf -o /dev/null "http://127.0.0.1:3000/"; then
        HEALTH_OK=1
        break
    fi
    sleep 2
done
[ "$HEALTH_OK" = "1" ] || log_error "门户健康检查失败（http://127.0.0.1:3000）"
log_ok "门户健康检查通过"

# ---- 清理旧镜像 ----
if [ "$KEEP_IMAGES" -gt 0 ]; then
    IMAGE_NAME="${PORTAL_IMAGE%:*}"
    docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}' "$IMAGE_NAME" \
        | sort -r | tail -n +$((KEEP_IMAGES + 1)) \
        | awk '{print $2}' | xargs -r -n1 docker rmi >/dev/null 2>&1 || true
    log_ok "已清理 ${KEEP_IMAGES} 个之外的旧镜像"
fi

log_ok "部署完成: ${PORTAL_IMAGE}"
