#!/usr/bin/env bash
# ==============================================================================
# Script de despliegue automático de Mapa de Puestos para Debian / Ubuntu
# ==============================================================================

set -e

echo "🚀 Iniciando despliegue de Mapa de Puestos en Debian..."

# 1. Verificar si Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado. Instalándolo..."
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    echo "✅ Docker instalado exitosamente."
fi

# 2. Levantar el contenedor con Docker Compose
echo "📦 Construyendo y levantando contenedor..."
if docker compose version &> /dev/null; then
    docker compose down --remove-orphans || true
    docker compose up -d --build
else
    docker-compose down --remove-orphans || true
    docker-compose up -d --build
fi

echo "======================================================================"
echo "✅ ¡Mapa de Puestos desplegado con éxito!"
echo "🌐 Podés acceder en: http://localhost:8080 (o la IP de este servidor:8080)"
echo "======================================================================"
