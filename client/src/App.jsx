import { useState, useEffect } from 'react';
import axios from 'axios';
import { Line, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';

// --- CHART CONFIGURATION FOR DARK/GLASS THEME ---
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);
ChartJS.defaults.color = 'rgba(255, 255, 255, 0.8)';
ChartJS.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';

const API_URL = 'http://localhost:3001';
const CURRENCIES = ['PLN', 'USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CNY'];
const PIE_COLORS = ['#F472B6', '#60A5FA', '#FBBF24', '#34D399', '#A78BFA', '#FB923C', '#9CA3AF'];

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

  // --- FUNKCJA ZAMIANY WALUT ---
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
     if (isSameCurrency) return <span className="text-red-400 font-bold uppercase">Błąd: Te same waluty</span>;
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
                borderColor: '#60A5FA', 
                backgroundColor: 'rgba(96, 165, 250, 0.2)', 
                borderWidth: 2, 
                tension: 0.4, 
                pointRadius: 4,
                pointBackgroundColor: '#fff',
                fill: true
            }]
        };
    }
    return {
        labels: historicalData.labels,
        datasets: [{
            label: `Kurs ${chartBase}/${chartTarget} (Historia)`,
            data: historicalData.data,
            borderColor: '#A78BFA', 
            backgroundColor: 'rgba(167, 139, 250, 0.2)', 
            borderWidth: 2, 
            tension: 0.2, 
            pointRadius: 2,
            pointHoverRadius: 6,
            fill: true
        }]
    };
  };

  const getPieChartData = () => {
    const activeWallets = wallets.filter(w => w.amount > 0);
    if (activeWallets.length === 0) return { labels: ['Pusty'], datasets: [{ data: [1], backgroundColor: ['rgba(255,255,255,0.1)'], borderWidth: 0 }] };
    return {
      labels: activeWallets.map(w => w.currency),
      datasets: [{
        data: activeWallets.map(w => w.amount),
        backgroundColor: PIE_COLORS.slice(0, activeWallets.length),
        borderWidth: 0,
        hoverOffset: 10
      }]
    };
  };

  if (view !== 'app') return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#0f0c29]">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-r from-purple-600 to-pink-600 opacity-40 blur-[100px] animate-pulse"></div>
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-gradient-to-r from-blue-600 to-teal-400 opacity-40 blur-[100px] animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[40%] h-[40%] rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 opacity-40 blur-[100px] animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      {/* Main Glass Card */}
      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] rounded-3xl overflow-hidden">
          
          {/* Header Section */}
          <div className="p-8 pb-0 text-center relative">
            <div className="w-20 h-20 mx-auto bg-gradient-to-tr from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg mb-6 rotate-12 transform hover:rotate-0 transition-all duration-500">
               <span className="text-3xl font-bold text-white">Ek</span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Witaj ponownie</h1>
            <p className="text-blue-200/80 text-sm">Zaloguj się do swojego portfela</p>
          </div>

          {/* Form Section */}
          <div className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="group relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-300 group-focus-within:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input 
                  className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-blue-200/50 outline-none focus:bg-black/30 focus:border-white/30 transition-all duration-300 backdrop-blur-sm" 
                  placeholder="Adres Email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)} 
                />
              </div>

              <div className="group relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-300 group-focus-within:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input 
                  className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-blue-200/50 outline-none focus:bg-black/30 focus:border-white/30 transition-all duration-300 backdrop-blur-sm" 
                  type="password" 
                  placeholder="Hasło" 
                  value={password}
                  onChange={e => setPassword(e.target.value)} 
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-4">
                <button 
                  onClick={() => handleAuth(false)} 
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:shadow-[0_0_30px_rgba(59,130,246,0.7)] hover:scale-[1.02] active:scale-95 transition-all duration-300 border border-white/20"
                >
                  Zaloguj się
                </button>
                
                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-white/10"></div>
                    <span className="flex-shrink-0 mx-4 text-white/30 text-xs uppercase tracking-widest">Lub</span>
                    <div className="flex-grow border-t border-white/10"></div>
                </div>

                <button 
                onClick={() => handleAuth(true)} 
                className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-sm font-bold hover:bg-white/10 hover:border-white/30 transition-all duration-300"
                >
                Załóż konto
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full relative bg-[#0f0c29] text-white overflow-x-hidden font-sans selection:bg-pink-500 selection:text-white">
      
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-purple-600/30 blur-[120px] animate-pulse"></div>
        <div className="absolute top-[20%] right-[-10%] w-[35vw] h-[35vw] rounded-full bg-blue-600/30 blur-[120px] animate-pulse" style={{animationDelay: '3s'}}></div>
        <div className="absolute bottom-[-10%] left-[30%] w-[40vw] h-[40vw] rounded-full bg-pink-600/20 blur-[120px] animate-pulse" style={{animationDelay: '5s'}}></div>
      </div>

      {/* Floating Navigation */}
      <nav className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 w-[90%] max-w-7xl backdrop-blur-xl bg-white/5 border border-white/10 rounded-full px-6 py-3 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] flex justify-between items-center transition-all hover:bg-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-400 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
             <span className="font-bold text-white text-sm">Ek</span>
          </div>
          <span className="font-bold text-lg tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">E-KANTOR</span>
        </div>
        
        <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-1 text-xs font-bold text-white/50 bg-black/20 px-4 py-2 rounded-full border border-white/5">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                System Online
            </div>
            <button onClick={logout} className="group flex items-center gap-2 text-sm font-medium text-white/70 hover:text-white transition-colors">
                <span>Wyloguj</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 group-hover:translate-x-1 transition-transform">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
            </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 pt-32 pb-12 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* WALLET CARDS ROW */}
        <div className="lg:col-span-12">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    <span className="w-1 h-6 bg-gradient-to-b from-blue-400 to-purple-600 rounded-full"></span>
                    Twój Portfel
                </h2>
                <div className="text-xs text-white/40 font-mono">AKTUALIZACJA: LIVE</div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {wallets.map((w) => (
                <div key={w.currency} className={`group relative overflow-hidden p-5 rounded-3xl border transition-all duration-500 hover:-translate-y-2 ${w.amount > 0 ? 'bg-gradient-to-br from-white/10 to-white/5 border-white/20 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]' : 'bg-white/5 border-white/5 opacity-60 hover:opacity-100'}`}>
                  
                  <div className="absolute top-0 right-0 p-8 bg-white/5 blur-2xl rounded-full group-hover:bg-blue-500/20 transition-colors duration-500"></div>
                  
                  <div className="relative z-10 flex flex-col h-24 justify-between">
                      <div className="flex justify-between items-start">
                          <span className="text-xs font-bold tracking-widest text-white/40">{w.currency}</span>
                          {w.amount > 0 && <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]"></div>}
                      </div>
                      <div>
                        <p className={`text-2xl font-bold tracking-tight truncate ${w.amount > 0 ? 'text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200' : 'text-white/30'}`}>
                            {w.amount.toFixed(2)}
                        </p>
                      </div>
                  </div>
                </div>
            ))}
            </div>
        </div>

        {/* LEFT COLUMN - CHARTS & STATS */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* MAIN CHART CARD */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-[2rem] p-8 relative overflow-hidden shadow-2xl">
             {/* Decorative glow */}
             <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-500/20 blur-[80px] rounded-full pointer-events-none"></div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 relative z-10">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Analiza Rynku</h2>
                    <div className="flex items-center gap-2 text-sm text-white/50">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        {chartBase} / {chartTarget}
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 bg-black/20 p-2 rounded-2xl border border-white/5 backdrop-blur-sm">
                    <div className="flex bg-white/5 rounded-xl p-1">
                        {['1D', '1W', '1M', '1Y'].map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`text-xs px-4 py-2 font-bold rounded-lg transition-all duration-300 ${timeRange === range ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>

                    <div className="h-6 w-[1px] bg-white/10 mx-2"></div>

                    <div className="flex items-center gap-2">
                        <div className="relative group">
                            <select className="appearance-none bg-transparent text-white font-bold text-sm cursor-pointer outline-none pl-2 pr-6 py-1 hover:text-blue-300 transition" value={chartBase} onChange={(e) => setChartBase(e.target.value)}>
                                {CURRENCIES.map(c => <option className="text-black" key={c} value={c}>{c}</option>)}
                            </select>
                            <span className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-white/30 text-[10px] group-hover:text-blue-300">▼</span>
                        </div>
                        
                        <button onClick={swapChartCurrencies} className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all text-white/70 hover:text-white hover:rotate-180 duration-500 shadow-lg">
                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                           </svg>
                        </button>
                        
                        <div className="relative group">
                            <select className="appearance-none bg-transparent text-white font-bold text-sm cursor-pointer outline-none pl-2 pr-6 py-1 hover:text-blue-300 transition" value={chartTarget} onChange={(e) => setChartTarget(e.target.value)}>
                                {CURRENCIES.map(c => <option className="text-black" key={c} value={c}>{c}</option>)}
                            </select>
                            <span className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-white/30 text-[10px] group-hover:text-blue-300">▼</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="h-80 w-full relative z-10">
                {(timeRange === '1D' || historicalData.data.length > 0) ? (
                    <Line 
                        data={getLineChartData()} 
                        options={{
                            responsive: true,
                            maintainAspectRatio:false, 
                            plugins:{legend:{display:false}, tooltip: {
                                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                titleColor: '#fff',
                                bodyColor: '#ccc',
                                padding: 12,
                                cornerRadius: 10,
                                displayColors: false
                            }}, 
                            scales:{
                                x:{grid:{display:false}, ticks:{color:'rgba(255,255,255,0.3)', font:{size:10}}},
                                y:{grid:{color:'rgba(255,255,255,0.03)'}, ticks:{color:'rgba(255,255,255,0.3)', font:{size:10}}}
                            },
                            interaction: { mode: 'index', intersect: false },
                            elements: {
                                line: { tension: 0.4 }
                            }
                        }} 
                    />
                ) : (
                    <div className="h-full flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                             <div className="w-8 h-8 border-2 border-white/20 border-t-blue-500 rounded-full animate-spin"></div>
                             <span className="text-sm text-white/30">Pobieranie danych...</span>
                        </div>
                    </div>
                )}
            </div>
          </div>

          {/* ASSETS PIE CHART */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-[2rem] p-8 flex flex-col md:flex-row items-center gap-10 shadow-xl">
             <div className="flex-1">
                 <h2 className="text-xl font-bold text-white mb-2">Struktura Aktywów</h2>
                 <p className="text-sm text-white/40 mb-8 leading-relaxed">
                    Wizualna reprezentacja Twojego portfela. <br/>
                 </p>
                 <div className="grid grid-cols-2 gap-3">
                     {wallets.filter(w => w.amount > 0).map((w, i) => (
                         <div key={w.currency} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                             <div className="w-3 h-3 rounded-full shadow-[0_0_8px_currentColor]" style={{backgroundColor: PIE_COLORS[i % PIE_COLORS.length], color: PIE_COLORS[i % PIE_COLORS.length]}}></div>
                             <span className="text-sm font-medium text-white/80">{w.currency}</span>
                             <span className="text-xs text-white/40 ml-auto font-mono">{w.amount.toFixed(2)}</span>
                         </div>
                     ))}
                 </div>
             </div>
             <div className="h-56 w-56 relative">
                 {/* Center hole text/effect */}
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <div className="w-20 h-20 bg-white/5 rounded-full blur-xl"></div>
                 </div>
                 
                 {wallets.length > 0 ? (
                    <Pie 
                        data={getPieChartData()} 
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            layout: { padding: 10 },
                            elements: { arc: { borderWidth: 0, hoverOffset: 15 } }
                        }} 
                    />
                 ) : (
                    <div className="flex items-center justify-center h-full text-white/20 font-bold">PUSTY PORTFEL</div>
                 )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN - OPERATIONS */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* EXCHANGE / TOPUP CARD */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col min-h-[500px]">
            {/* Tabs */}
            <div className="flex p-2 gap-2 bg-black/20 m-4 rounded-2xl">
                <button onClick={() => setActiveTab('exchange')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 ${activeTab === 'exchange' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>Wymiana</button>
                <button onClick={() => setActiveTab('topup')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 ${activeTab === 'topup' ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>Wpłata</button>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-center relative">
                {activeTab === 'exchange' ? (
                    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
                        
                        {/* FROM */}
                        <div className="bg-black/20 p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors group">
                            <label className="text-[10px] font-bold text-white/30 uppercase mb-2 block tracking-widest">Sprzedajesz</label>
                            <div className="flex justify-between items-center">
                                <input type="number" placeholder="0.00" value={amount} className="bg-transparent w-full text-2xl font-mono outline-none text-white placeholder-white/10 group-focus-within:placeholder-white/5" onChange={e => setAmount(e.target.value)}/>
                                <select className="bg-white/10 text-white font-bold p-2 rounded-lg cursor-pointer outline-none hover:bg-white/20 transition-colors border border-white/5" value={exchangeFrom} onChange={e => setExchangeFrom(e.target.value)}>
                                    {wallets.map(w => <option className="text-black" key={w.currency} value={w.currency}>{w.currency}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* SWAP ICON */}
                        <div className="flex justify-center -my-6 relative z-10">
                            <div className="bg-[#0f0c29] border border-white/10 rounded-full p-2 shadow-xl">
                                <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-full p-2 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-white animate-pulse">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* TO */}
                        <div className="bg-black/20 p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                            <label className="text-[10px] font-bold text-white/30 uppercase mb-2 block tracking-widest">Otrzymujesz</label>
                            <div className="flex justify-between items-center">
                                <div className="text-2xl font-mono text-blue-300 truncate max-w-[150px]">{calculatePreview()}</div>
                                <select className="bg-white/10 text-white font-bold p-2 rounded-lg cursor-pointer outline-none hover:bg-white/20 transition-colors border border-white/5" value={exchangeTo} onChange={e => setExchangeTo(e.target.value)}>
                                    {CURRENCIES.map(c => <option className="text-black" key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* RATE INFO */}
                        <div className={`p-4 rounded-xl border flex justify-between items-center transition-all duration-300 ${isSameCurrency ? 'bg-red-500/10 border-red-500/20' : 'bg-blue-500/5 border-blue-500/10'}`}>
                            <span className="text-xs text-white/40 font-bold uppercase">Kurs</span>
                            <span className="font-mono text-sm text-white/80">{getExchangeRateDisplay()}</span>
                        </div>

                        {/* ACTION BUTTON */}
                        <button onClick={handleExchange} disabled={isSameCurrency} className={`w-full py-5 rounded-2xl uppercase text-sm tracking-widest font-bold shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${isSameCurrency ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5' : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-[0_0_30px_rgba(79,70,229,0.4)] border border-white/20'}`}>
                            {isSameCurrency ? 'Wybierz różne waluty' : 'Potwierdź Wymianę'}
                        </button>
                    </div>
                ) : (
                    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6 -mt-12">
                         <div className="text-center mb-2">
                            <h3 className="text-white font-bold text-2xl">Doładuj Konto</h3>
                            <p className="text-white/40 text-sm">Bezpieczne płatności błyskawiczne</p>
                         </div>

                         <div className="bg-black/20 p-5 rounded-2xl border border-white/5">
                            <label className="text-[10px] font-bold text-white/30 uppercase mb-2 block tracking-widest">Kwota Doładowania</label>
                            <div className="flex gap-4">
                                <input type="number" placeholder="0.00" value={topupAmount} className="bg-transparent w-full text-2xl font-mono outline-none text-white placeholder-white/10" onChange={e => setTopupAmount(e.target.value)}/>
                                <select className="bg-white/10 text-white font-bold p-2 rounded-lg cursor-pointer outline-none hover:bg-white/20 transition-colors border border-white/5" value={topupCurrency} onChange={e => setTopupCurrency(e.target.value)}>
                                    {CURRENCIES.map(c => <option className="text-black" key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                         </div>
                        
                        <button onClick={handleTopUp} className="w-full py-5 rounded-2xl uppercase text-sm tracking-widest font-bold shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] border border-white/20">
                            Wpłać Środki
                        </button>
                    </div>
                )}
            </div>
          </div>

          {/* HISTORY LIST */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-[2rem] p-6 h-96 flex flex-col shadow-xl">
            <h2 className="text-sm font-bold text-white/50 uppercase tracking-widest mb-6 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Ostatnie Operacje
            </h2>
            <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar space-y-3">
              {history.map((h, i) => (
                <div key={i} className="group p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all duration-300 cursor-default">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-white/30 tracking-wider">{h.date.split(',')[0]}</span>
                    <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full border ${h.type === 'WPŁATA' ? 'bg-green-500/10 text-green-400 border-green-500/20' : (h.type === 'WYMIANA' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-white/10 text-white border-white/20')}`}>
                        {h.type}
                    </span>
                  </div>
                  <div className="font-mono text-xs text-white/80 break-words leading-relaxed opacity-70 group-hover:opacity-100 transition-opacity">{h.details}</div>
                </div>
              ))}
              {history.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-white/20 gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 opacity-50">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      <span className="text-xs">Brak historii</span>
                  </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;