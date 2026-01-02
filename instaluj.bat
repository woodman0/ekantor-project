@echo off
echo --- INSTALACJA SERWERA ---
cd server
call npm install
cd ..

echo --- INSTALACJA KLIENTA ---
cd client
call npm install
cd ..

echo.
echo GOTOWE! Wszystko zainstalowane.
echo Teraz uruchom plik "start.bat"
pause