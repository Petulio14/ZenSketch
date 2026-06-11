@echo off
title ZenSketch - Servidor Local
echo.
echo  =============================================
echo        ZenSketch - Servidor Local
echo  =============================================
echo.

:: Verificar si Node.js esta disponible
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo  [!] Node.js no encontrado.
    echo      Abriendo directamente en el navegador...
    echo.
    start "" "%~dp0index.html"
    echo  [OK] ZenSketch se abrio correctamente.
    timeout /t 4 >nul
    exit /b
)

:: Verificar si npx esta disponible  
where npx >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo  [!] npx no encontrado.
    echo      Abriendo directamente en el navegador...
    echo.
    start "" "%~dp0index.html"
    echo  [OK] ZenSketch se abrio correctamente.
    timeout /t 4 >nul
    exit /b
)

echo  [*] Iniciando servidor local en puerto 3000...
echo  [*] Abriendo ZenSketch en tu navegador...
echo.
echo  -----------------------------------------------
echo   URL: http://localhost:3000
echo   Para detener el servidor presiona Ctrl+C
echo  -----------------------------------------------
echo.

cd /d "%~dp0"
npx -y serve -l 3000 -s --open
