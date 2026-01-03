function calculateExchange(amount, rate) {
    if (amount < 0) return 0;
    return Number((amount * rate).toFixed(2));
}

function validateAmount(amount) {
    return typeof amount === 'number' && amount > 0;
}

module.exports = { calculateExchange, validateAmount };
