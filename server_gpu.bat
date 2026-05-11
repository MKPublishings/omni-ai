@echo off
setlocal

if defined ION_DIR (
	set "TARGET_DIR=%ION_DIR%"
) else (
	set "TARGET_DIR=C:\ion\ion"
)

if exist "%TARGET_DIR%\ion\start-ion.bat" (
	set "LAUNCHER=%TARGET_DIR%\ion\start-ion.bat"
	set "LAUNCHER_DIR=%TARGET_DIR%\ion"
) else if exist "%TARGET_DIR%\run_nvidia_gpu.bat" (
	set "LAUNCHER=%TARGET_DIR%\run_nvidia_gpu.bat"
	set "LAUNCHER_DIR=%TARGET_DIR%"
) else if exist "%TARGET_DIR%\main.py" (
	set "LAUNCHER=python main.py --listen --port 8188 --enable-cors"
	set "LAUNCHER_DIR=%TARGET_DIR%"
) else if exist "%TARGET_DIR%\ion\main.py" (
	set "LAUNCHER=python main.py --listen --port 8188 --enable-cors"
	set "LAUNCHER_DIR=%TARGET_DIR%\ion"
) else (
	echo [ERROR] Could not find ion launcher under "%TARGET_DIR%"
	echo [HINT] Expected one of:
	echo        %TARGET_DIR%\ion\start-ion.bat
	echo        %TARGET_DIR%\run_nvidia_gpu.bat
	echo        %TARGET_DIR%\main.py
	echo        %TARGET_DIR%\ion\main.py
	exit /b 1
)

pushd "%LAUNCHER_DIR%"
set ION_HOST=%ION_HOST%
set ION_WS=%ION_WS%
set ION_MOCK=%ION_MOCK%

if exist "%TARGET_DIR%\ion\start-ion.bat" (
	call "%TARGET_DIR%\ion\start-ion.bat"
) else if exist "%TARGET_DIR%\run_nvidia_gpu.bat" (
	call "%TARGET_DIR%\run_nvidia_gpu.bat"
) else (
	%LAUNCHER%
)
set "EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %EXIT_CODE%
