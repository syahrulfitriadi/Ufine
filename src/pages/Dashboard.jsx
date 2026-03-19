import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';
import { getTransactions } from '../utils/storage';
import { calculateSummary, getChartData, formatCurrency, formatDate } from '../utils/helpers';
import { isSameMonth, parseISO } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

const COLORS = ['#86a788', '#f43f5e', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ec4899', '#6366f1', '#64748b'];

const Dashboard = () => {
    const { session } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [rawTransactions, setRawTransactions] = useState([]);
    const [summary, setSummary] = useState({ totalBalance: 0, totalIncome: 0, totalExpense: 0 });
    const [chartData, setChartData] = useState({ income: [], expense: [] });
    const [activeSlide, setActiveSlide] = useState(0); // 0 = Pemasukan, 1 = Pengeluaran
    const [userFilter, setUserFilter] = useState('me'); // 'all', 'me', 'partner'

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                const rawData = await getTransactions();
                setRawTransactions(rawData);
            } catch (error) {
                console.error("Failed to load transactions", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [session]);

    useEffect(() => {
        const filteredData = rawTransactions.filter(t => {
            if (userFilter === 'all') return true;
            if (userFilter === 'me') return t.user_id === session?.user?.id;
            if (userFilter === 'partner') return t.user_id !== session?.user?.id;
            return true;
        });

        setTransactions(filteredData);
        setSummary(calculateSummary(filteredData));

        const now = new Date();
        const thisMonthData = filteredData.filter(t => isSameMonth(parseISO(t.date), now));

        const groupByCategory = (arr) => {
            const grouped = arr.reduce((acc, curr) => {
                acc[curr.category] = (acc[curr.category] || 0) + Number(curr.amount);
                return acc;
            }, {});
            return Object.keys(grouped)
                .map(key => ({ name: key, value: grouped[key] }))
                .sort((a, b) => b.value - a.value);
        };

        setChartData({
            income: groupByCategory(thisMonthData.filter(t => t.type === 'income')),
            expense: groupByCategory(thisMonthData.filter(t => t.type === 'expense'))
        });

    }, [rawTransactions, userFilter, session]);

    const latestTransactions = transactions.slice(0, 5);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Selamat Pagi';
        if (hour < 15) return 'Selamat Siang';
        if (hour < 18) return 'Selamat Sore';
        return 'Selamat Malam';
    };

    const username = session?.user?.user_metadata?.username || session?.user?.email?.split('@')[0] || 'Pengguna';

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Greeting Header */}
            <div className="mb-6 flex justify-between items-center text-white">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{getGreeting()}, {username}</h1>
                    <p className="text-white/80 text-sm font-medium mt-1">Siap mencatat keuanganmu hari ini?</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-bold text-xl shadow-sm border border-white/30 uppercase">
                    {username.charAt(0)}
                </div>
            </div>

            {/* Total Saldo Card */}
            <div className="flex justify-between items-center mb-4">
                <select
                    value={userFilter}
                    onChange={(e) => setUserFilter(e.target.value)}
                    className="p-2 bg-white/50 backdrop-blur-md rounded-xl text-xs font-bold text-slate-700 outline-none border border-slate-100 shadow-sm"
                >
                    <option value="all">Data Keluarga (Semua)</option>
                    <option value="me">Data Saya</option>
                    <option value="partner">Data Pasangan</option>
                </select>
            </div>

            <div className="glass-card mb-6 p-5 flex justify-between items-center bg-gradient-to-br from-slate-800 to-slate-900 border-none shadow-xl shadow-slate-900/20 text-white rounded-[2rem]">
                <div>
                    <p className="text-white/70 text-sm font-medium mb-1">Total Saldo Aktif</p>
                    <h2 className="text-3xl font-bold tracking-tight">{formatCurrency(summary.totalBalance)}</h2>
                </div>
                <div className="p-3 bg-white/10 rounded-2xl border border-white/10">
                    <Wallet size={28} className="text-mint-400" />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="glass-card p-4">
                    <div className="flex items-center space-x-2 text-sage-600 mb-2">
                        <div className="p-1.5 bg-sage-100 rounded-full">
                            <ArrowDownRight size={16} />
                        </div>
                        <span className="text-xs font-semibold">Pemasukan</span>
                    </div>
                    <p className="text-lg font-bold text-slate-800">{formatCurrency(summary.totalIncome)}</p>
                </div>

                <div className="glass-card p-4">
                    <div className="flex items-center space-x-2 text-rose-500 mb-2">
                        <div className="p-1.5 bg-rose-50 rounded-full">
                            <ArrowUpRight size={16} />
                        </div>
                        <span className="text-xs font-semibold">Pengeluaran</span>
                    </div>
                    <p className="text-lg font-bold text-slate-800">{formatCurrency(summary.totalExpense)}</p>
                </div>
            </div>

            {/* Carousel Chart Section */}
            <div className="glass-card p-5 mb-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-sm font-semibold text-slate-800">Analisa Kategori Bulan Ini</h2>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button onClick={() => setActiveSlide(0)} className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${activeSlide === 0 ? 'bg-white text-sage-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Pemasukan</button>
                        <button onClick={() => setActiveSlide(1)} className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${activeSlide === 1 ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Pengeluaran</button>
                    </div>
                </div>

                <div className="h-[250px] w-full relative">
                    {/* Income Chart Display */}
                    <div className={`absolute inset-0 transition-opacity duration-300 ${activeSlide === 0 ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                        <p className="text-[10px] font-semibold text-sage-600 mb-2 uppercase tracking-wider text-center">Pemasukan</p>
                        {chartData?.income?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="85%">
                                <BarChart data={chartData.income} margin={{ top: 20, right: 0, left: 15, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} angle={-45} textAnchor="end" height={50} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `Rp${new Intl.NumberFormat('id-ID', { notation: 'compact', compactDisplay: 'short' }).format(val)}`} />
                                    <Tooltip cursor={{ fill: 'transparent' }} formatter={(value) => [new Intl.NumberFormat('id-ID').format(value), '']} labelStyle={{ display: 'none' }} contentStyle={{ borderRadius: '12px', fontSize: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50}>
                                        {chartData.income.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                        <LabelList dataKey="value" position="top" formatter={(val) => `Rp${new Intl.NumberFormat('id-ID').format(val)}`} style={{ fontSize: '9px', fill: '#64748b', fontWeight: 600 }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center -mt-6"><p className="text-xs text-slate-400">Belum ada data</p></div>
                        )}
                    </div>

                    {/* Expense Chart Display */}
                    <div className={`absolute inset-0 transition-opacity duration-300 ${activeSlide === 1 ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                        <p className="text-[10px] font-semibold text-rose-500 mb-2 uppercase tracking-wider text-center">Pengeluaran</p>
                        {chartData?.expense?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="85%">
                                <BarChart data={chartData.expense} margin={{ top: 20, right: 0, left: 15, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} angle={-45} textAnchor="end" height={50} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `Rp${new Intl.NumberFormat('id-ID', { notation: 'compact', compactDisplay: 'short' }).format(val)}`} />
                                    <Tooltip cursor={{ fill: 'transparent' }} formatter={(value) => [new Intl.NumberFormat('id-ID').format(value), '']} labelStyle={{ display: 'none' }} contentStyle={{ borderRadius: '12px', fontSize: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50}>
                                        {chartData.expense.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
                                        ))}
                                        <LabelList dataKey="value" position="top" formatter={(val) => `Rp${new Intl.NumberFormat('id-ID').format(val)}`} style={{ fontSize: '9px', fill: '#64748b', fontWeight: 600 }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center -mt-6"><p className="text-xs text-slate-400">Belum ada data</p></div>
                        )}
                    </div>
                </div>
            </div>

            {/* Latest Transactions */}
            <div>
                <div className="flex justify-between items-end mb-4 pr-1">
                    <h2 className="text-lg font-bold text-slate-800">Transaksi Terbaru</h2>
                </div>

                <div className="space-y-3">
                    {isLoading ? (
                        <div className="flex justify-center py-6">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage-500"></div>
                        </div>
                    ) : latestTransactions.length > 0 ? (
                        latestTransactions.map((t) => (
                            <div key={t.id} className="glass-card p-4 flex items-center justify-between transition-transform hover:scale-[1.02]">
                                <div className="flex items-center space-x-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-sage-100 text-sage-600' : 'bg-rose-50 text-rose-500'
                                        }`}>
                                        {t.type === 'income' ? <ArrowDownRight size={24} /> : <ArrowUpRight size={24} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <h3 className="font-semibold text-slate-800">{t.category}</h3>
                                            {t.creator_name && t.creator_name !== 'Tidak Diketahui' && (
                                                <span className="bg-slate-100 text-slate-500 text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                                    {t.creator_name.substring(0, 5)}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500">{formatDate(t.date)}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-bold ${t.type === 'income' ? 'text-sage-600' : 'text-slate-800'}`}>
                                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center p-6 text-slate-400 text-sm">
                            Belum ada transaksi.
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default Dashboard;
