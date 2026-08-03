@echo off
cd /d "%~dp0.."
node dev/bin/i18n-fill-ru.js
node dev/bin/i18n-dump-overrides.js
node dev/bin/i18n-check.js
exit /b %ERRORLEVEL%
