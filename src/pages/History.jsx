import React, { useState, useEffect } from 'react';
import { getTransactions, deleteTransaction } from '../utils/storage';
import { formatCurrency, formatDate } from '../utils/helpers';
import { isSameMonth, parseISO, format } from 'date-fns';
import { id } from 'date-fns/locale';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CalendarDays, Filter, Trash2, ArrowDownRight, ArrowUpRight, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const History = () => {
    const { session } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [filterType, setFilterType] = useState('all'); // 'all', 'income', 'expense'
    const [userFilter, setUserFilter] = useState('me'); // 'all', 'me', 'partner'

    const [isLoading, setIsLoading] = useState(true);

    // Pagination state: map of monthYear -> currentPage
    const [pageConfig, setPageConfig] = useState({});
    const itemsPerPage = 5;

    const fetchTransactions = async () => {
        try {
            setIsLoading(true);
            const data = await getTransactions();
            setTransactions(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('Hapus transaksi ini?')) {
            const success = await deleteTransaction(id);
            if (success) {
                // optimistically remove
                setTransactions(transactions.filter(t => t.id !== id));
            } else {
                alert("Gagal menghapus data.");
            }
        }
    };

    // Compute global running balances on ALL transactions
    const allSorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    let globalBalance = 0;
    const allWithBalance = allSorted.map(t => {
        globalBalance += t.type === 'income' ? Number(t.amount) : -Number(t.amount);
        return { ...t, runningBalance: globalBalance };
    });

    // Re-sort to newest first for UI
    const allNewestFirst = [...allWithBalance].reverse();

    const filteredTransactions = allNewestFirst.filter(t => {
        // Pre-filter Type
        if (filterType !== 'all' && t.type !== filterType) return false;

        // Filter By User Authority (Family logic)
        if (userFilter === 'me') {
            if (t.user_id !== session?.user?.id) return false;
        } else if (userFilter === 'partner') {
            if (t.user_id === session?.user?.id) return false;
        }

        return true;
    });

    // Group by month
    const groupedTransactions = filteredTransactions.reduce((acc, obj) => {
        const dateStr = format(parseISO(obj.date), 'MMMM yyyy', { locale: id });
        if (!acc[dateStr]) acc[dateStr] = [];
        acc[dateStr].push(obj);
        return acc;
    }, {});

    const COLORS = ['#86a788', '#f43f5e']; // Income, Expense

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white">Riwayat Transaksi</h1>
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md cursor-pointer hover:bg-white/30 transition-colors">
                    <Filter size={20} className="text-white" />
                </div>
            </div>

            <div className="glass-card min-h-[60vh] overflow-hidden flex flex-col">

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-2 border-b border-slate-100 p-2 bg-slate-50/30">
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="flex-1 py-2 px-3 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 outline-none focus:border-sage-400"
                    >
                        <option value="all">📝 Semua Tipe</option>
                        <option value="income">↘️ Pemasukan</option>
                        <option value="expense">↗️ Pengeluaran</option>
                    </select>

                    <select
                        value={userFilter}
                        onChange={(e) => setUserFilter(e.target.value)}
                        className="flex-1 py-2 px-3 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 outline-none focus:border-sage-400"
                    >
                        <option value="all">💳 Semua Data</option>
                        <option value="me">👤 Data Saya</option>
                        <option value="partner">👥 Data Pasangan</option>
                    </select>
                </div>

                {/* List Grouped by Month */}
                <div className="flex-1 overflow-y-auto p-4 space-y-8 pb-24">
                    {isLoading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage-500"></div>
                        </div>
                    ) : Object.keys(groupedTransactions).length > 0 ? (
                        Object.keys(groupedTransactions).map((monthYear, idx) => {
                            const monthData = groupedTransactions[monthYear];

                            // Calculate Month Totals for Chart
                            const monthIncome = monthData.filter(t => t.type === 'income').reduce((acc, curr) => acc + Number(curr.amount), 0);
                            const monthExpense = monthData.filter(t => t.type === 'expense').reduce((acc, curr) => acc + Number(curr.amount), 0);
                            const chartData = [
                                { name: 'Pemasukan', value: monthIncome },
                                { name: 'Pengeluaran', value: monthExpense }
                            ].filter(d => d.value > 0); // Hide empty slices

                            // Use the pre-calculated global running balances
                            const transactionsWithBalance = monthData;

                            return (
                                <div key={idx} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                                    <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
                                        <div className="flex items-center space-x-2 text-sage-700">
                                            <CalendarDays size={20} />
                                            <h2 className="text-lg font-bold">{monthYear}</h2>
                                        </div>
                                    </div>

                                    {/* Monthly Summary & Chart */}
                                    <div className="flex flex-col lg:flex-row items-center gap-6 mb-6 bg-slate-50/50 rounded-2xl p-4">
                                        {chartData.length > 0 && (
                                            <div className="w-24 h-24 lg:w-32 lg:h-32 flex-shrink-0">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={chartData}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={30}
                                                            outerRadius={45}
                                                            paddingAngle={2}
                                                            dataKey="value"
                                                            stroke="none"
                                                        >
                                                            {chartData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.name === 'Pemasukan' ? COLORS[0] : COLORS[1]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip formatter={(value) => formatCurrency(value)} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        )}
                                        <div className="flex-1 w-full flex flex-col gap-3 text-left">
                                            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-center">
                                                <p className="text-[10px] md:text-xs text-slate-500 font-medium mb-1">Pemasukan</p>
                                                <p className="text-sm md:text-base font-bold text-sage-600 border-l-2 border-sage-500 pl-2">
                                                    {formatCurrency(monthIncome)}
                                                </p>
                                            </div>
                                            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-center">
                                                <p className="text-[10px] md:text-xs text-slate-500 font-medium mb-1">Pengeluaran</p>
                                                <p className="text-sm md:text-base font-bold text-rose-500 border-l-2 border-rose-400 pl-2">
                                                    {formatCurrency(monthExpense)}
                                                </p>
                                            </div>
                                            <div className="pt-2 border-t border-slate-100 mt-2">
                                                <p className="text-[10px] md:text-xs text-slate-500 font-medium mb-1">Sisa Saldo Bulan Ini</p>
                                                <p className="font-bold flex items-center bg-slate-800 text-white rounded-lg px-4 py-2 text-sm md:text-base w-fit shadow-sm">
                                                    {formatCurrency(monthIncome - monthExpense)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Monthly Table Details */}
                                    <div className="overflow-x-auto -mx-2 px-2 md:mx-0 md:px-0">
                                        <div className="min-w-[450px]">
                                            <table className="w-full text-left text-xs md:text-sm border-collapse">
                                                <thead>
                                                    <tr className="border-b-2 border-sage-100 text-slate-500">
                                                        <th className="pb-3 pt-2 font-semibold px-2 w-8">No</th>
                                                        <th className="pb-3 pt-2 font-semibold px-2">Tanggal</th>
                                                        <th className="pb-3 pt-2 font-semibold px-2">Pemasukan</th>
                                                        <th className="pb-3 pt-2 font-semibold px-2">Pengeluaran</th>
                                                        <th className="pb-3 pt-2 font-semibold px-2">Kategori</th>
                                                        <th className="pb-3 pt-2 font-semibold px-2 text-right">Saldo</th>
                                                        <th className="pb-3 pt-2 font-semibold px-2 text-right w-10"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {transactionsWithBalance.slice((pageConfig[monthYear] || 0) * itemsPerPage, ((pageConfig[monthYear] || 0) + 1) * itemsPerPage).map((t, tIdx) => {
                                                        const overallIndex = (pageConfig[monthYear] || 0) * itemsPerPage + tIdx + 1;
                                                        return (
                                                            <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                                                                <td className="py-3 px-2 text-slate-400 font-medium align-top">{overallIndex}</td>
                                                                <td className="py-3 px-2 text-slate-600 align-top whitespace-nowrap">
                                                                    {formatDate(t.date, 'dd/MM')}
                                                                </td>
                                                                <td className="py-3 px-2 text-sage-600 font-medium align-top whitespace-nowrap">
                                                                    {t.type === 'income' ? formatCurrency(t.amount) : '-'}
                                                                </td>
                                                                <td className="py-3 px-2 text-rose-500 font-medium align-top whitespace-nowrap">
                                                                    {t.type === 'expense' ? formatCurrency(t.amount) : '-'}
                                                                </td>
                                                                <td className="py-3 px-2 text-slate-700 font-medium align-top whitespace-nowrap">
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <span>{t.category}</span>
                                                                        {t.creator_name && t.creator_name !== 'Tidak Diketahui' && (
                                                                            <span className="bg-slate-100 text-slate-400 text-[9px] px-1 py-0.5 rounded uppercase tracking-wide font-bold w-fit">
                                                                                {t.creator_name.substring(0, 5)}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className={`py-3 px-2 text-right font-bold align-top text-slate-800 whitespace-nowrap`}>
                                                                    {formatCurrency(t.runningBalance)}
                                                                </td>
                                                                <td className="py-3 px-2 text-right align-top">
                                                                    <button
                                                                        onClick={() => handleDelete(t.id)}
                                                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                                                        title="Hapus Transaksi"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Pagination Controls for this Month */}
                                    {transactionsWithBalance.length > itemsPerPage && (
                                        <div className="flex justify-center items-center space-x-2 mt-4">
                                            <button
                                                onClick={() => setPageConfig(prev => ({ ...prev, [monthYear]: Math.max(0, (prev[monthYear] || 0) - 1) }))}
                                                disabled={(pageConfig[monthYear] || 0) === 0}
                                                className="p-1 rounded bg-slate-50 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
                                            >
                                                <ChevronLeft size={16} />
                                            </button>

                                            {Array.from({ length: Math.ceil(transactionsWithBalance.length / itemsPerPage) }).map((_, idx) => {
                                                const currentMonthlyPage = pageConfig[monthYear] || 0;
                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setPageConfig(prev => ({ ...prev, [monthYear]: idx }))}
                                                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-all ${currentMonthlyPage === idx ? 'bg-sage-500 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-sage-50 border border-slate-200'}`}
                                                    >
                                                        {idx + 1}
                                                    </button>
                                                )
                                            })}
                                            <button
                                                onClick={() => setPageConfig(prev => ({ ...prev, [monthYear]: Math.min(Math.ceil(transactionsWithBalance.length / itemsPerPage) - 1, (prev[monthYear] || 0) + 1) }))}
                                                disabled={(pageConfig[monthYear] || 0) >= Math.ceil(transactionsWithBalance.length / itemsPerPage) - 1}
                                                className="p-1 rounded bg-slate-50 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    )}

                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-sm">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                <Filter size={24} className="text-slate-300" />
                            </div>
                            <p>Tidak ada transaksi ditemukan.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default History;
