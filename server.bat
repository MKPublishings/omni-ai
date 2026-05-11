@echo off
setlocal

if defined COMFYUI_DIR (
	set "TARGET_DIR=%COMFYUI_DIR%"
) else (
	set "TARGET_DIR=%~dp0ComfyUI"
)

if not exist "%TARGET_DIR%\main.py" (
	echo [ERROR] Could not find ComfyUI main.py at "%TARGET_DIR%\main.py"
	echo [HINT] Set COMFYUI_DIR in .env to your ComfyUI folder, for example:
	echo        COMFYUI_DIR=C:\path\to\ComfyUI
	exit /b 1
)

pushd "%TARGET_DIR%"
set COMFYUI_HOST=%COMFYUI_HOST%
set COMFYUI_WS=%COMFYUI_WS%
set COMFYUI_MOCK=%COMFYUI_MOCK%

python main.py --listen --port 8188 --enable-cors --cpu
set "EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %EXIT_CODE%
