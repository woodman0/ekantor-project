\## 💰 E-Kantor - Aplikacja Walutowa MVP



!\[Project Status](https://img.shields.io/badge/status-completed-success)

!\[License](https://img.shields.io/badge/license-MIT-blue)



Nowoczesna, minimalistyczna aplikacja internetowa do symulacji wymiany walut w czasie rzeczywistym. Projekt zrealizowany w architekturze Klient-Serwer, kładący nacisk na przejrzystość interfejsu (UI) oraz poprawność operacji finansowych (UX).



\## 🚀 Technologie



\*\*Frontend:\*\*

!\[React](https://img.shields.io/badge/React-20232A?style=for-the-badge\&logo=react\&logoColor=61DAFB)

!\[Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge\&logo=vite\&logoColor=white)

!\[Tailwind CSS](https://img.shields.io/badge/Tailwind\_CSS-38B2AC?style=for-the-badge\&logo=tailwind-css\&logoColor=white)

!\[Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge\&logo=chartdotjs\&logoColor=white)



\*\*Backend:\*\*

!\[Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge\&logo=node.js\&logoColor=white)

!\[Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)

!\[SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge\&logo=sqlite\&logoColor=white)



---



\## ✨ Główne Funkcjonalności



\* \*\*📈 Analiza Rynku Live:\*\* Wykresy walutowe aktualizowane co 60 sekund w oparciu o realne dane z zewnętrznego API.

\* \*\*💱 Kantor Wymiany:\*\*

&nbsp;   \* Obsługa walut: PLN, USD, EUR, GBP, CHF, JPY, CNY.

&nbsp;   \* Przeliczanie kursów krzyżowych w czasie rzeczywistym.

&nbsp;   \* Blokada wymiany tej samej waluty.

&nbsp;   \* Podgląd kwoty "Otrzymasz" przed transakcją.

\* \*\*💼 Portfel Użytkownika:\*\*

&nbsp;   \* Bezpieczny system logowania i rejestracji (JWT + bcrypt).

&nbsp;   \* Bonus na start: 1000 PLN przy rejestracji.

&nbsp;   \* Możliwość doładowania dowolnej waluty (Top-up).

\* \*\*📜 Historia:\*\* Pełny rejestr operacji (wpłaty, wymiany) z datami i szczegółami.

\* \*\*🎨 Design:\*\* Styl "Minimalist Monochrome" (Biel-Szarość-Czerń) zapewniający maksymalną czytelność.



---



\## ⚙️ Instalacja i Uruchomienie



\### Wymagania

\* Zainstalowane środowisko \[Node.js](https://nodejs.org/) (wersja LTS).



\### Metoda 1: Szybki Start (Windows)

W folderze głównym znajdują się skrypty automatyzujące:

1\.  Uruchom \*\*`instaluj.bat`\*\* (tylko za pierwszym razem) – zainstaluje biblioteki.

2\.  Uruchom \*\*`start.bat`\*\* – włączy serwer i aplikację jednocześnie.



\### Metoda 2: Ręczna (Terminal)



\*\*1. Backend (Serwer):\*\*

```bash

cd server

npm install

node server.js



\*\*2. Frontend (Klient):\*\*

cd client

npm install

npm run dev



\## 📂 Struktura Projektu



ekantor-project/

├── client/                 # Frontend (React + Vite)

│   ├── src/

│   │   ├── App.jsx         # Główna logika aplikacji

│   │   └── index.css       # Style Tailwind

│   └── package.json

├── server/                 # Backend (Node.js)

│   ├── server.js           # API i logika bazy danych

│   ├── kantor.db           # Plik bazy danych SQLite (tworzony automatycznie)

│   └── package.json

├── instaluj.bat            # Skrypt instalacyjny

├── start.bat               # Skrypt uruchomieniowy

└── README.md               # Dokumentacja



\## 🔌 API

Projekt korzysta z darmowego API do pobierania kursów walut:



ExchangeRate-API



\## 👤 Autor



Marek Kubiak

wrx81862@student.wroclaw.merito.pl lub marek.kubiak12345@gmail.com

