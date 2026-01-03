const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { calculateExchange, validateAmount } = require('./utils');

const app = express();
app.use(express.json());
app.use(cors());

const SECRET_KEY = 'tajny-klucz-kantoru';

// BAZA DANYCH
const db = new sqlite3.Database('./kantor.db', (err) => {
    if (err) console.error(err.message);
    console.log('Połączono z bazą SQLite.');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, password TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS wallets (user_id INTEGER, currency TEXT, amount REAL, FOREIGN KEY(user_id) REFERENCES users(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS history (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, date TEXT, type TEXT, details TEXT)`);
});

// --- ENDPOINTY ---

// Rejestracja
app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    db.run(`INSERT INTO users (email, password) VALUES (?, ?)`, [email, hash], function(err) {
        if (err) return res.status(400).json({ error: 'Email zajęty' });
        const userId = this.lastID;
        // Tworzymy portfele dla wszystkich walut (domyślnie 0)
        ['PLN', 'USD', 'EUR', 'JPY', 'CNY', 'CHF', 'GBP'].forEach(cur => {
            db.run(`INSERT INTO wallets (user_id, currency, amount) VALUES (?, ?, ?)`, [userId, cur, 0]);
        });
        res.json({ message: 'Zarejestrowano' });
    });
});

// Logowanie
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Błędne dane' });
        const token = jwt.sign({ id: user.id }, SECRET_KEY);
        res.json({ token });
    });
});

// Middleware uwierzytelniający
const authenticate = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Pobieranie danych (Dashboard)
app.get('/dashboard', authenticate, (req, res) => {
    db.all(`SELECT currency, amount FROM wallets WHERE user_id = ?`, [req.user.id], (err, wallets) => {
        db.all(`SELECT date, type, details FROM history WHERE user_id = ? ORDER BY id DESC`, [req.user.id], (err, history) => {
            res.json({ wallets, history });
        });
    });
});

// Wymiana walut
app.post('/exchange', authenticate, async (req, res) => {
    const { from, to, amount } = req.body;
    const userId = req.user.id;
    try {
        const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${from}`);
        const rates = response.data.rates;
        const rate = rates[to]; // Pobieramy kurs docelowy dla wybranej bazy
        
        if (!rate) return res.status(400).json({error: "Brak kursu"});

        const resultAmount = calculateExchange(amount, rate);

        db.get(`SELECT amount FROM wallets WHERE user_id = ? AND currency = ?`, [userId, from], (err, row) => {
            if (!row || row.amount < amount) return res.status(400).json({ error: 'Za mało środków' });
            
            db.serialize(() => {
                db.run(`UPDATE wallets SET amount = amount - ? WHERE user_id = ? AND currency = ?`, [amount, userId, from]);
                db.run(`UPDATE wallets SET amount = amount + ? WHERE user_id = ? AND currency = ?`, [resultAmount, userId, to]);
                db.run(`INSERT INTO history (user_id, date, type, details) VALUES (?, ?, ?, ?)`, 
                    [userId, new Date().toLocaleString(), 'WYMIANA', `-${amount} ${from} -> +${resultAmount.toFixed(2)} ${to}`]);
                res.json({ success: true });
            });
        });
    } catch (e) { res.status(500).json({ error: 'Błąd API' }); }
});

// NOWOŚĆ: Doładowanie konta (Top-up)
app.post('/topup', authenticate, (req, res) => {
    const { currency, amount } = req.body;
    const userId = req.user.id;
    
    if (!validateAmount(amount)) return res.status(400).json({ error: 'Kwota musi być dodatnia' });

    db.serialize(() => {
        // Dodajemy środki
        db.run(`UPDATE wallets SET amount = amount + ? WHERE user_id = ? AND currency = ?`, 
            [amount, userId, currency], 
            function(err) {
                if (err) return res.status(500).json({ error: 'Błąd bazy' });
                
                // Dodajemy wpis do historii
                db.run(`INSERT INTO history (user_id, date, type, details) VALUES (?, ?, ?, ?)`, 
                    [userId, new Date().toLocaleString(), 'WPŁATA', `+${amount} ${currency}`]);
                
                res.json({ success: true });
            }
        );
        });
    });
    
    if (require.main === module) {
        app.listen(3001, () => console.log('Serwer działa na porcie 3001'));
    }
    
    module.exports = app;
    