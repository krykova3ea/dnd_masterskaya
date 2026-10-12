#!/bin/bash
set -e

# ============================================================================
# D&D Мастерская — Скрипт развёртывания (Ubuntu/Debian)
# Устанавливает Docker, собирает и запускает приложение
# ============================================================================

APP_PORT=3001
HEALTH_TIMEOUT=120

print_ok()   { echo -e "\033[32m✓\033[0m $1"; }
print_info() { echo -e "\033[34mℹ\033[0m $1"; }
print_err()  { echo -e "\033[31m✗\033[0m $1"; }
print_step() { echo -e "\n\033[1m── $1 ──\033[0m\n"; }

# --------------------------------------------------------------------------
# 0. Проверка ОС
# --------------------------------------------------------------------------
print_step "Проверка операционной системы"

if [ ! -f /etc/os-release ]; then
    print_err "Файл /etc/os-release не найден. Скрипт поддерживает только Ubuntu/Debian."
    exit 1
fi

. /etc/os-release
print_ok "ОС: $PRETTY_NAME"

if [ "$ID" != "ubuntu" ] && [ "$ID" != "debian" ] && \
   [ "$ID_LIKE" != "debian" ] && [ "$ID_LIKE" != "ubuntu debian" ]; then
    print_err "Скрипт поддерживает только Ubuntu/Debian. Текущая ОС: $ID"
    exit 1
fi

# Проверка архитектуры
ARCH=$(dpkg --print-architecture 2>/dev/null || echo "amd64")
print_ok "Архитектура: $ARCH"

# --------------------------------------------------------------------------
# 1. Проверка sudo
# --------------------------------------------------------------------------
print_step "Проверка прав"

if [ "$EUID" -eq 0 ]; then
    print_info "Запущено от root"
    SUDO=""
else
    if ! command -v sudo &> /dev/null; then
        print_err "sudo не установлен. Запустите от root или установите sudo."
        exit 1
    fi
    SUDO="sudo"
    print_ok "Доступ к sudo подтверждён"
fi

# --------------------------------------------------------------------------
# 2. Установка Docker
# --------------------------------------------------------------------------
print_step "Установка Docker"

if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | grep -oP 'Docker version \K[0-9.]+')
    print_ok "Docker уже установлен (версия $DOCKER_VERSION)"
else
    print_info "Docker не найден. Устанавливаю..."

    # Prerequisites
    $SUDO apt-get update -y
    $SUDO apt-get install -y ca-certificates curl gnupg lsb-release

    # GPG ключ
    $SUDO install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/${ID}/gpg | \
        $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    $SUDO chmod a+r /etc/apt/keyrings/docker.gpg

    # Репозиторий
    echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/${ID} ${VERSION_CODENAME} stable" | \
        $SUDO tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Установка
    $SUDO apt-get update -y
    $SUDO apt-get install -y \
        docker-ce \
        docker-ce-cli \
        containerd.io \
        docker-buildx-plugin \
        docker-compose-plugin

    print_ok "Docker установлен"
fi

# --------------------------------------------------------------------------
# 3. Запуск Docker-сервиса
# --------------------------------------------------------------------------
print_step "Запуск Docker-демона"

if ! $SUDO systemctl is-active --quiet docker; then
    $SUDO systemctl start docker
    print_ok "Docker-демон запущен"
else
    print_ok "Docker-демон уже работает"
fi

$SUDO systemctl enable docker 2>/dev/null || true

# --------------------------------------------------------------------------
# 4. Добавление пользователя в группу docker
# --------------------------------------------------------------------------
print_step "Настройка прав Docker"

CURRENT_USER=$(whoami)
if groups "$CURRENT_USER" | grep -qw docker; then
    print_ok "Пользователь '$CURRENT_USER' уже в группе docker"
else
    $SUDO usermod -aG docker "$CURRENT_USER"
    print_ok "Пользователь '$CURRENT_USER' добавлен в группу docker"
    print_info "Применяю группу для текущей сессии..."
    # Используем sg для активации группы без перелогина
    DOCKER_CMD="sg docker -c"
    # Проверяем, что docker compose работает без sudo
    if sg docker -c "docker compose version" &> /dev/null; then
        print_ok "docker compose доступен без sudo"
    else
        print_info "docker compose требует sudo — буду использовать sudo"
        DOCKER_CMD="$SUDO"
    fi
fi

# Если пользователь уже в группе — работаем напрямую
if [ -z "$DOCKER_CMD" ]; then
    DOCKER_CMD=""
fi

# --------------------------------------------------------------------------
# 5. Проверка порта
# --------------------------------------------------------------------------
print_step "Проверка порта $APP_PORT"

if command -v ss &> /dev/null; then
    if ss -tlnp | grep -q ":${APP_PORT} " ; then
        print_err "Порт $APP_PORT занят. Освободите порт или измените APP_PORT в скрипте."
        ss -tlnp | grep ":${APP_PORT} "
        exit 1
    fi
elif command -v netstat &> /dev/null; then
    if netstat -tlnp 2>/dev/null | grep -q ":${APP_PORT} "; then
        print_err "Порт $APP_PORT занят. Освободите порт или измените APP_PORT в скрипте."
        netstat -tlnp | grep ":${APP_PORT} "
        exit 1
    fi
fi

print_ok "Порт $APP_PORT свободен"

# --------------------------------------------------------------------------
# 6. Сборка и запуск
# --------------------------------------------------------------------------
print_step "Сборка и запуск контейнеров"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f docker-compose.yml ]; then
    print_err "docker-compose.yml не найден в текущей директории ($SCRIPT_DIR)"
    print_err "Убедитесь, что скрипт запущен из корневой директории проекта."
    exit 1
fi

print_info "Сборка образов (это может занять несколько минут при первом запуске)..."

if [ -n "$DOCKER_CMD" ]; then
    $DOCKER_CMD "docker compose up --build -d"
else
    docker compose up --build -d
fi

print_ok "Контейнеры запущены"

# --------------------------------------------------------------------------
# 7. Ожидание готовности приложения
# --------------------------------------------------------------------------
print_step "Ожидание готовности приложения"

print_info "Ожидание health check (таймаут: ${HEALTH_TIMEOUT}с)..."

ELAPSED=0
while [ $ELAPSED -lt $HEALTH_TIMEOUT ]; do
    if curl -sf "http://localhost:${APP_PORT}/api/health" &> /dev/null; then
        print_ok "Приложение готово! (через ${ELAPSED}с)"
        break
    fi

    # Проверяем, не упал ли контейнер
    if [ -n "$DOCKER_CMD" ]; then
        CONTAINER_STATUS=$($DOCKER_CMD "docker compose ps app --format json" 2>/dev/null | grep -o '"State":"[^"]*"' | head -1)
    else
        CONTAINER_STATUS=$(docker compose ps app --format json 2>/dev/null | grep -o '"State":"[^"]*"' | head -1)
    fi

    if echo "$CONTAINER_STATUS" | grep -q "exited"; then
        print_err "Контейнер приложения завершился аварийно!"
        print_info "Логи:"
        if [ -n "$DOCKER_CMD" ]; then
            $DOCKER_CMD "docker compose logs app --tail 30"
        else
            docker compose logs app --tail 30
        fi
        exit 1
    fi

    sleep 2
    ELAPSED=$((ELAPSED + 2))
    echo -ne "\r  Ожидание... ${ELAPSED}с"
done

echo ""

if [ $ELAPSED -ge $HEALTH_TIMEOUT ]; then
    print_err "Превышен таймаут ожидания (${HEALTH_TIMEOUT}с)"
    print_info "Проверьте логи:"
    if [ -n "$DOCKER_CMD" ]; then
        $DOCKER_CMD "docker compose logs --tail 30"
    else
        docker compose logs --tail 30
    fi
    exit 1
fi

# --------------------------------------------------------------------------
# 8. Финальный вывод
# --------------------------------------------------------------------------
print_step "Готово!"

HOST_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

echo ""
echo -e "\033[1mПриложение доступно:\033[0m"
echo -e "  Локально:    \033[4mhttp://localhost:${APP_PORT}\033[0m"
if [ -n "$HOST_IP" ] && [ "$HOST_IP" != "localhost" ]; then
    echo -e "  По сети:     \033[4mhttp://${HOST_IP}:${APP_PORT}\033[0m"
fi
echo ""
echo -e "\033[1mКоманды управления:\033[0m"
echo -e "  Остановка:       docker compose down"
echo -e "  Перезапуск:      docker compose restart"
echo -e "  Логи:            docker compose logs -f"
echo -e "  Статус:          docker compose ps"
echo -e "  Удалить всё:     docker compose down -v"
echo ""
echo -e "\033[1mУчётные данные БД:\033[0m"
echo -e "  База:      dnd_workshop"
echo -e "  Пользователь: postgres"
echo -e "  Пароль:    postgres"
echo ""
