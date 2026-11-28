#!/bin/bash
# auto_backup.sh - Respaldo automático (Linux / Cloud Shell / Git Bash)
cd "$(dirname "$0")" || exit 1
echo "Iniciando respaldo automatizado: $(date)"
python3 scripts/datos.py respaldar || python scripts/datos.py respaldar
echo "Respaldo finalizado."
