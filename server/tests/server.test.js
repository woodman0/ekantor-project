const request = require('supertest');
const app = require('../server');
const { calculateExchange, validateAmount } = require('../utils');

// 1. TEST JEDNOSTKOWY: Przeliczanie walut
describe('Unit Tests - utils.js', () => {
    test('calculateExchange should correctly multiply amount and rate', () => {
        expect(calculateExchange(100, 4.0)).toBe(400);
        expect(calculateExchange(10, 3.14159)).toBe(31.42); // Zaokrąglenie do 2 miejsc
    });

    // 2. TEST JEDNOSTKOWY: Walidacja kwoty
    test('validateAmount should return true for positive numbers', () => {
        expect(validateAmount(100)).toBe(true);
        expect(validateAmount(-5)).toBe(false);
        expect(validateAmount("100")).toBe(false);
    });
});

// 3. TEST INTEGRACYJNY: Rejestracja użytkownika
describe('Integration Test - API', () => {
    test('POST /register should return success for new user', async () => {
        const randomEmail = `test${Math.random()}@example.com`;
        const response = await request(app)
            .post('/register')
            .send({
                email: randomEmail,
                password: 'password123'
            });
        
        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe('Zarejestrowano');
    });
});
