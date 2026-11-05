@echo off
title SaigonDrain AI - Backend Server
cd /d "%~dp0\be"
echo ========================================================
echo   Dang khoi dong SaigonDrain AI - Backend (NestJS API)
echo   Ket noi PostgreSQL tai: localhost:5432 / saigondrain
echo   Swagger API Docs: http://localhost:3000/api/docs
echo ========================================================
npm run start:dev
pause
