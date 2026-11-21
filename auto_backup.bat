@echo off
REM auto_backup.bat - Respaldo automatico en Windows (Programador de tareas)
cd /d "%~dp0"
if not exist respaldos mkdir respaldos
echo Iniciando respaldo automatizado: %date% %time% >> respaldos\cron.log
python scripts\datos.py respaldar >> respaldos\cron.log 2>&1
echo Respaldo finalizado. >> respaldos\cron.log
