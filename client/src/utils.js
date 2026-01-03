export const calculateExchange = (amount, rateFrom, rateTo) => {
    if (!amount || amount < 0 || !rateFrom || !rateTo) return 0;
    const result = (parseFloat(amount) / rateFrom) * rateTo;
    return parseFloat(result.toFixed(2));
};

export const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: currency }).format(amount);
};
