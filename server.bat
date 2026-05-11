@echo off
setlocal

if defined COMFYUI_DIR (
	set "TARGET_DIR=%COMFYUI_DIR%"
) else (
	set "TARGET_DIR=C:\ComfyUI"
)

if exist "%TARGET_DIR%\run_cpu.bat" (
	set "LAUNCHER=%TARGET_DIR%\run_cpu.bat"
	set "LAUNCHER_DIR=%TARGET_DIR%"
) else if exist "%TARGET_DIR%\main.py" (
	set "LAUNCHER=python main.py --listen --port 8188 --enable-cors --cpu"
	set "LAUNCHER_DIR=%TARGET_DIR%"
) else if exist "%TARGET_DIR%\ComfyUI\main.py" (
	set "LAUNCHER=python main.py --listen --port 8188 --enable-cors --cpu"
	set "LAUNCHER_DIR=%TARGET_DIR%\ComfyUI"
) else (
	echo [ERROR] Could not find ComfyUI launcher under "%TARGET_DIR%"
	echo [HINT] Expected one of:
	echo        %TARGET_DIR%\run_cpu.bat
	echo        %TARGET_DIR%\main.py
	echo        %TARGET_DIR%\ComfyUI\main.py
	exit /b 1
)

pushd "%LAUNCHER_DIR%"
set COMFYUI_HOST=%COMFYUI_HOST%
set COMFYUI_WS=%COMFYUI_WS%
set COMFYUI_MOCK=%COMFYUI_MOCK%

if exist "%TARGET_DIR%\run_cpu.bat" (
	call "%TARGET_DIR%\run_cpu.bat"
) else (
	%LAUNCHER%
)
set "EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %EXIT_CODE%
