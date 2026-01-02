import { useState, useEffect } from 'react';
import axios from 'axios';
import { Line, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

const API_URL = 'http://localhost:3001';
const CURRENCIES = ['PLN', 'USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CNY'];
const PIE_COLORS = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF'];

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [view, setView] = useState('login'); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [wallets, setWallets] = useState([]);
  const [history, setHistory] = useState([]);
  const [rates, setRates] = useState({});
  
  // --- KONFIGURACJA WYKRESU LINIOWEGO ---
  const [chartBase, setChartBase] = useState('PLN');
  const [chartTarget, setChartTarget] = useState('USD');
  const [timeRange, setTimeRange] = useState('1D');
  const [historicalData, setHistoricalData] = useState({ labels: [], data: [] });

  const [activeTab, setActiveTab] = useState('exchange'); 
  const [exchangeFrom, setExchangeFrom] = useState('PLN');
  const [exchangeTo, setExchangeTo] = useState('USD');
  const [amount, setAmount] = useState(''); 
  const [topupCurrency, setTopupCurrency] = useState('PLN');
  const [topupAmount, setTopupAmount] = useState('');

  // --- LOGOWANIE ---
  const handleAuth = async (isRegister) => {
    try {
      const endpoint = isRegister ? '/register' : '/login';
      const res = await axios.post(`${API_URL}${endpoint}`, { email, password });
      if (!isRegister) {
        setToken(res.data.token);
        localStorage.setItem('token', res.data.token);
        setView('app');
      } else {
        alert('Konto założone! Zaloguj się.');
        setView('login');
      }
    } catch (err) { alert('Błąd: ' + (err.response?.data?.error || 'Problem z siecią')); }
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('token');
    setView('login');
  };

  // --- DANE PORTFELA ---
  const fetchData = async () => {
    if (!token) return;
    try {
      const resUser = await axios.get(`${API_URL}/dashboard`, { headers: { Authorization: token } });
      setWallets(resUser.data.wallets);
      setHistory(resUser.data.history);
    } catch (err) { if (err.response?.status === 401) logout(); }
  };

  // --- POBIERANIE AKTUALNEGO KURSU ---
  const fetchRates = async () => {
    try {
        const resRates = await axios.get(`https://api.exchangerate-api.com/v4/latest/${chartBase}`);
        setRates(resRates.data.rates);
    } catch (error) {}
  };

  // --- POBIERANIE HISTORII Z API ---
  const fetchHistory = async () => {
    if (timeRange === '1D') return;

    const endDate = new Date().toISOString().split('T')[0];
    const startDateObj = new Date();
    
    if (timeRange === '1W') startDateObj.setDate(startDateObj.getDate() - 7);
    if (timeRange === '1M') startDateObj.setMonth(startDateObj.getMonth() - 1);
    if (timeRange === '1Y') startDateObj.setFullYear(startDateObj.getFullYear() - 1);
    
    const startDate = startDateObj.toISOString().split('T')[0];

    try {
        const res = await axios.get(`https://api.frankfurter.app/${startDate}..${endDate}?from=${chartBase}&to=${chartTarget}`);
        if (res.data && res.data.rates) {
            const labels = Object.keys(res.data.rates);
            const data = Object.values(res.data.rates).map(val => val[chartTarget]);
            setHistoricalData({ labels, data });
        }
    } catch (error) {
        console.error("Błąd historii:", error);
        setHistoricalData({ labels: ['Błąd danych'], data: [] }); 
    }
  };

  useEffect(() => {
    if (token) {
      setView('app');
      fetchData();
      const i1 = setInterval(fetchData, 60000);
      return () => clearInterval(i1);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
        fetchRates(); 
        if (timeRange === '1D') {
            const i2 = setInterval(fetchRates, 60000);
            return () => clearInterval(i2);
        } else {
            fetchHistory(); 
        }
    }
  }, [token, chartBase, chartTarget, timeRange]);

  // --- NOWOŚĆ: FUNKCJA ZAMIANY WALUT ---
  const swapChartCurrencies = () => {
    const tempBase = chartBase;
    setChartBase(chartTarget);
    setChartTarget(tempBase);
  };

  // --- AKCJE ---
  const handleExchange = async () => {
    if (exchangeFrom === exchangeTo) { alert("BŁĄD: Wybrałeś te same waluty!"); return; }
    if (!amount || amount <= 0) { alert("Wpisz poprawną kwotę!"); return; }

    try {
      await axios.post(`${API_URL}/exchange`, 
        { from: exchangeFrom, to: exchangeTo, amount: parseFloat(amount) },
        { headers: { Authorization: token } }
      );
      alert('Wymiana zrealizowana!');
      setAmount(''); 
      fetchData(); 
    } catch (err) { alert('Błąd: ' + (err.response?.data?.error || 'Sprawdź saldo')); }
  };

  const handleTopUp = async () => {
    if (!topupAmount || topupAmount <= 0) return alert("Wpisz kwotę!");
    try {
      await axios.post(`${API_URL}/topup`, 
        { currency: topupCurrency, amount: parseFloat(topupAmount) },
        { headers: { Authorization: token } }
      );
      alert('Wpłacono środki!');
      setTopupAmount('');
      fetchData();
    } catch (err) { alert('Błąd serwera'); }
  };

  // --- PRZELICZNIKI ---
  const isSameCurrency = exchangeFrom === exchangeTo;
  const calculatePreview = () => {
    if (isSameCurrency) return "---";
    if (!amount || isNaN(amount) || !rates[exchangeFrom] || !rates[exchangeTo]) return "0.00";
    const rateFrom = rates[exchangeFrom];
    const rateTo = rates[exchangeTo];
    const result = (parseFloat(amount) / rateFrom) * rateTo;
    return result.toFixed(2);
  };
  const getExchangeRateDisplay = () => {
     if (isSameCurrency) return <span className="text-red-600 font-bold uppercase">Błąd: Te same waluty</span>;
     if (!rates[exchangeFrom] || !rates[exchangeTo]) return "...";
     const rate = (1 / rates[exchangeFrom]) * rates[exchangeTo];
     return `1 ${exchangeFrom} ≈ ${rate.toFixed(4)} ${exchangeTo}`;
  }

  // --- WYKRES LINIOWY ---
  const getLineChartData = () => {
    if (timeRange === '1D') {
        const rate = rates[chartTarget] || 1;
        const points = [rate * 0.998, rate * 1.002, rate * 0.999, rate * 1.001, rate];
        return {
            labels: ['-4 min', '-3 min', '-2 min', '-1 min', 'Teraz'],
            datasets: [{
                label: `Kurs ${chartBase}/${chartTarget} (Live)`,
                data: points,
                borderColor: '#000', backgroundColor: 'rgba(0,0,0,0.05)', borderWidth: 2, tension: 0.3, pointRadius: 3
            }]
        };
    }
    return {
        labels: historicalData.labels,
        datasets: [{
            label: `Kurs ${chartBase}/${chartTarget} (Historia)`,
            data: historicalData.data,
            borderColor: '#000', backgroundColor: 'rgba(0,0,0,0.05)', borderWidth: 2, tension: 0.1, pointRadius: 1 
        }]
    };
  };

  const getPieChartData = () => {
    const activeWallets = wallets.filter(w => w.amount > 0);
    if (activeWallets.length === 0) return { labels: ['Pusty'], datasets: [{ data: [1], backgroundColor: ['#eee'], borderWidth: 0 }] };
    return {
      labels: activeWallets.map(w => w.currency),
      datasets: [{
        data: activeWallets.map(w => w.amount),
        backgroundColor: PIE_COLORS.slice(0, activeWallets.length),
        borderWidth: 2, borderColor: '#ffffff'
      }]
    };
  };

  if (view !== 'app') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
      <div className="bg-white p-10 border border-gray-200 shadow-xl w-full max-w-sm">
        <h1 className="text-3xl font-bold mb-8 text-center tracking-widest uppercase">E-Kantor</h1>
        <div className="space-y-4">
            <input className="w-full p-3 border border-gray-300 focus:border-black outline-none" placeholder="Email" onChange={e => setEmail(e.target.value)} />
            <input className="w-full p-3 border border-gray-300 focus:border-black outline-none" type="password" placeholder="Hasło" onChange={e => setPassword(e.target.value)} />
        </div>
        <div className="mt-8 flex flex-col gap-3">
            <button onClick={() => handleAuth(false)} className="w-full bg-black text-white py-3 font-bold hover:bg-gray-800 transition">ZALOGUJ</button>
            <button onClick={() => handleAuth(true)} className="w-full bg-white text-black border border-black py-3 font-bold hover:bg-gray-50 transition">ZAŁÓŻ KONTO</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans pb-10">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-black rounded-full"></div>
          <span className="font-bold text-xl tracking-widest">E-KANTOR</span>
        </div>
        <button onClick={logout} className="text-sm border px-4 py-1 border-gray-200 hover:bg-gray-100">Wyloguj</button>
      </nav>

      <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        
        {/* PORTFEL */}
        <div className="lg:col-span-3">
            <h2 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wide">Twój Portfel</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {wallets.map((w) => (
                <div key={w.currency} className={`p-4 border shadow-sm flex flex-col justify-between h-24 ${w.amount > 0 ? 'bg-white border-gray-300' : 'bg-gray-50 border-gray-100'}`}>
                  <p className="text-xs text-gray-400 font-bold">{w.currency}</p>
                  <p className={`text-lg font-medium ${w.amount > 0 ? 'text-black' : 'text-gray-400'}`}>{w.amount.toFixed(2)}</p>
                </div>
            ))}
            </div>
        </div>

        {/* ŚRODKOWA KOLUMNA - WYKRESY */}
        <div className="lg:col-span-2 bg-white p-6 border border-gray-200 shadow-sm">
          
          <div className="mb-10"> 
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b border-gray-100 pb-4 gap-4">
                <div><h2 className="font-bold text-lg">Analiza Rynku</h2><p className="text-xs text-gray-400">Historia kursów</p></div>
                
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex bg-gray-100 p-1 rounded">
                        {['1D', '1W', '1M', '1Y'].map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`text-xs px-3 py-1 font-bold rounded transition ${timeRange === range ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-black'}`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 border-l border-gray-200 pl-2">
                        <select className="border border-gray-300 p-1 text-sm font-bold cursor-pointer" value={chartBase} onChange={(e) => setChartBase(e.target.value)}>
                            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        
                        {/* --- NOWOŚĆ: PRZYCISK ZAMIANY --- */}
                        <button onClick={swapChartCurrencies} className="p-2 rounded-full hover:bg-gray-100 transition" title="Odwróć pary">
                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-600">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                           </svg>
                        </button>
                        
                        <select className="border border-gray-300 p-1 text-sm font-bold cursor-pointer" value={chartTarget} onChange={(e) => setChartTarget(e.target.value)}>
                            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>
            </div>
            
            <div className="h-64 w-full">
                {(timeRange === '1D' || historicalData.data.length > 0) ? (
                    <Line 
                        data={getLineChartData()} 
                        options={{
                            maintainAspectRatio:false, 
                            plugins:{legend:{display:false}}, 
                            scales:{x:{grid:{display:false}},y:{grid:{color:'#f3f4f6'}}}
                        }} 
                    />
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                        {chartBase === 'CNY' || chartTarget === 'CNY' ? 'Brak danych historycznych dla CNY' : 'Ładowanie danych...'}
                    </div>
                )}
            </div>
          </div>

          <div>
            <div className="mb-6 border-b border-gray-100 pb-4">
                <h2 className="font-bold text-lg">Struktura Portfela</h2>
            </div>
            <div className="h-64 w-full flex justify-center items-center">
                 {wallets.length > 0 ? (
                    <Pie 
                        data={getPieChartData()} 
                        options={{
                            maintainAspectRatio: false,
                            plugins: { legend: { position: 'right' } }
                        }} 
                    />
                 ) : (
                    <p className="text-gray-400">Brak danych portfela</p>
                 )}
            </div>
          </div>

        </div>

        {/* PANEL OPERACJI */}
        <div className="space-y-6">
          <div className="bg-white p-0 border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex border-b border-gray-200">
                <button onClick={() => setActiveTab('exchange')} className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition ${activeTab === 'exchange' ? 'bg-black text-white' : 'bg-white text-gray-400 hover:text-black'}`}>Wymiana</button>
                <button onClick={() => setActiveTab('topup')} className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition ${activeTab === 'topup' ? 'bg-black text-white' : 'bg-white text-gray-400 hover:text-black'}`}>Doładowanie</button>
            </div>

            <div className="p-6">
                {activeTab === 'exchange' ? (
                    <>
                        <div className="flex gap-2 mb-4 items-center">
                            <div className="w-1/2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Sprzedaję</label>
                                <select className="w-full p-2 border border-gray-300 bg-gray-50 font-medium" value={exchangeFrom} onChange={e => setExchangeFrom(e.target.value)}>
                                    {wallets.map(w => <option key={w.currency} value={w.currency}>{w.currency}</option>)}
                                </select>
                            </div>
                            <span className="text-gray-400 mt-4">→</span>
                            <div className="w-1/2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Kupuję</label>
                                <select className="w-full p-2 border border-gray-300 bg-gray-50 font-medium" value={exchangeTo} onChange={e => setExchangeTo(e.target.value)}>
                                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Kwota ({exchangeFrom})</label>
                            <input type="number" placeholder="0.00" value={amount} className="w-full p-3 border border-gray-300 focus:border-black outline-none font-mono text-lg" onChange={e => setAmount(e.target.value)}/>
                        </div>
                        <div className={`p-3 mb-4 border text-sm transition ${isSameCurrency ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex justify-between text-gray-500 mb-1"><span>Kurs:</span><span>{getExchangeRateDisplay()}</span></div>
                            <div className="flex justify-between font-bold text-black text-lg"><span>Otrzymasz:</span><span>{calculatePreview()} {exchangeTo}</span></div>
                        </div>
                        <button onClick={handleExchange} disabled={isSameCurrency} className={`w-full py-4 uppercase text-sm tracking-widest font-bold transition ${isSameCurrency ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-black text-white hover:bg-gray-800'}`}>{isSameCurrency ? 'Zmień walutę' : 'Zatwierdź'}</button>
                    </>
                ) : (
                    <>
                         <div className="mb-4">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Wybierz walutę</label>
                            <select className="w-full p-3 border border-gray-300 bg-gray-50 font-medium" value={topupCurrency} onChange={e => setTopupCurrency(e.target.value)}>
                                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="mb-6">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Kwota wpłaty ({topupCurrency})</label>
                            <input type="number" placeholder="0.00" value={topupAmount} className="w-full p-3 border border-gray-300 focus:border-black outline-none font-mono text-lg" onChange={e => setTopupAmount(e.target.value)}/>
                        </div>
                        <button onClick={handleTopUp} className="w-full bg-white text-black border border-black py-4 hover:bg-gray-50 transition uppercase text-sm tracking-widest font-bold">Wpłać środki</button>
                    </>
                )}
            </div>
          </div>

          <div className="bg-white p-6 border border-gray-200 shadow-sm h-80 flex flex-col">
            <h2 className="font-bold mb-4 text-sm uppercase text-gray-500">Historia</h2>
            <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
              {history.map((h, i) => (
                <div key={i} className="text-xs mb-3 border-b border-gray-50 pb-2 last:border-0 hover:bg-gray-50 p-2 transition">
                  <div className="flex justify-between text-gray-400 mb-1">
                    <span>{h.date.split(',')[0]}</span>
                    <span className={`font-bold ${h.type === 'WPŁATA' ? 'text-green-600' : (h.type === 'WYMIANA' ? 'text-blue-600' : 'text-black')}`}>{h.type}</span>
                  </div>
                  <div className="font-mono text-gray-700 break-words">{h.details}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;