@echo off
echo Uruchamianie E-Kantoru...

:: Uruchom serwer w nowym oknie
start "Serwer Backend" cmd /k "cd server && node server.js"

:: Uruchom klienta w nowym oknie
start "Aplikacja Frontend" cmd /k "cd client && npm run dev"

echo Aplikacja startuje...