import React, { useState, useEffect, useMemo, useRef } from 'react';
import { deleteTransaction } from '../utils/storage';
import { formatCurrency, formatDate } from '../utils/helpers';
import { isSameMonth, parseISO, format, getYear, getMonth } from 'date-fns';
import { id } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CalendarDays, Download, Trash2, ArrowDownLeft, ArrowUpRight, ListFilter, ChevronLeft, ChevronRight, X, FileSpreadsheet, FileText, Calendar, Users, User, UserCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTransactions } from '../contexts/TransactionContext';
import ConfirmModal from '../components/ConfirmModal';
import { HistorySkeleton } from '../components/SkeletonLoader';
import IconSelect from '../components/IconSelect';

const History = () => {
    const { session } = useAuth();
    const { transactions, isLoading, removeTransaction } = useTransactions();
    const [filterType, setFilterType] = useState('all'); // 'all', 'income', 'expense'
    const [userFilter, setUserFilter] = useState('me'); // 'all', 'me', 'partner'

    // Pagination state: map of monthYear -> currentPage
    const [pageConfig, setPageConfig] = useState({});
    const itemsPerPage = 5;

    // Confirm modal state
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState(null);
    const [showDownloadModal, setShowDownloadModal] = useState(false);

    const handleDeleteClick = (id) => {
        setPendingDeleteId(id);
        setShowConfirm(true);
    };

    const handleDeleteConfirm = async () => {
        if (!pendingDeleteId) return;
        const success = await deleteTransaction(pendingDeleteId);
        if (success) {
            removeTransaction(pendingDeleteId);
        }
        setPendingDeleteId(null);
    };

    // First filter by user and type
    const preFiltered = transactions.filter(t => {
        if (filterType !== 'all' && t.type !== filterType) return false;
        if (userFilter === 'me') {
            if (t.user_id !== session?.user?.id) return false;
        } else if (userFilter === 'partner') {
            if (t.user_id === session?.user?.id) return false;
        }
        return true;
    });

    // Compute running balance on filtered data (oldest first)
    const filteredSorted = [...preFiltered].sort((a, b) => new Date(a.date) - new Date(b.date));
    let runBal = 0;
    const filteredWithBalance = filteredSorted.map(t => {
        runBal += t.type === 'income' ? Number(t.amount) : -Number(t.amount);
        return { ...t, runningBalance: runBal };
    });

    // Re-sort to newest first for UI
    const filteredTransactions = [...filteredWithBalance].reverse();

    // Group by month
    const groupedTransactions = filteredTransactions.reduce((acc, obj) => {
        const dateStr = format(parseISO(obj.date), 'MMMM yyyy', { locale: id });
        if (!acc[dateStr]) acc[dateStr] = [];
        acc[dateStr].push(obj);
        return acc;
    }, {});

    // Compute available years and months from filtered data
    const availableYears = useMemo(() => {
        const years = new Set();
        filteredTransactions.forEach(t => years.add(getYear(parseISO(t.date))));
        return [...years].sort((a, b) => b - a); // newest first
    }, [filteredTransactions]);

    const now = new Date();
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-indexed

    const MONTH_NAMES = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const availableMonths = useMemo(() => {
        const months = new Set();
        filteredTransactions.forEach(t => {
            const d = parseISO(t.date);
            if (getYear(d) === selectedYear) {
                months.add(getMonth(d));
            }
        });
        return [...months].sort((a, b) => b - a); // newest first
    }, [filteredTransactions, selectedYear]);

    // Auto-select latest month when year changes
    useEffect(() => {
        if (availableMonths.length > 0 && !availableMonths.includes(selectedMonth)) {
            setSelectedMonth(availableMonths[0]);
        }
    }, [availableMonths, selectedYear]);

    // Get the selected month key (e.g., "April 2026")
    const selectedMonthKey = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
    // Match with locale-formatted key from groupedTransactions
    const selectedMonthKeyLocale = Object.keys(groupedTransactions).find(k => {
        // format is "April 2026" in Indonesian locale - capitalize first letter for comparison
        return k.toLowerCase() === selectedMonthKey.toLowerCase();
    });
    const selectedData = selectedMonthKeyLocale ? groupedTransactions[selectedMonthKeyLocale] : [];

    const COLORS = ['#86a788', '#f43f5e', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ec4899', '#6366f1', '#64748b'];

    // --- Export Functions ---
    const generateSheetData = (monthTransactions) => {
        const sorted = [...monthTransactions].sort((a, b) => {
            const dateDiff = new Date(a.date) - new Date(b.date);
            if (dateDiff !== 0) return dateDiff;
            // Same date: income first, then expense
            if (a.type === 'income' && b.type === 'expense') return -1;
            if (a.type === 'expense' && b.type === 'income') return 1;
            return 0;
        });
        let balance = 0;
        return sorted.map((t, i) => {
            balance += t.type === 'income' ? Number(t.amount) : -Number(t.amount);
            return {
                No: i + 1,
                Tanggal: formatDate(t.date, 'dd/MM/yyyy'),
                Oleh: t.creator_name || '-',
                Kategori: t.category,
                Keterangan: t.note || '-',
                Pemasukan: t.type === 'income' ? Number(t.amount) : '',
                Pengeluaran: t.type === 'expense' ? Number(t.amount) : '',
                Saldo: balance
            };
        });
    };

    const handleDownloadMonth = () => {
        if (!selectedData || selectedData.length === 0) return;

        const sheetData = generateSheetData(selectedData);
        const monthIncome = selectedData.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
        const monthExpense = selectedData.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

        sheetData.push({ No: '', Tanggal: '', Oleh: '', Kategori: 'TOTAL', Keterangan: '', Pemasukan: monthIncome, Pengeluaran: monthExpense, Saldo: monthIncome - monthExpense });

        const ws = XLSX.utils.json_to_sheet(sheetData);
        ws['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 20 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `${MONTH_NAMES[selectedMonth]} ${selectedYear}`);
        XLSX.writeFile(wb, `Riwayat_${MONTH_NAMES[selectedMonth]}_${selectedYear}.xlsx`);
        setShowDownloadModal(false);
    };

    const handleDownloadYear = () => {
        const wb = XLSX.utils.book_new();
        let hasData = false;

        // Loop through all 12 months (Jan=0 to Dec=11)
        for (let m = 0; m < 12; m++) {
            const monthKey = `${MONTH_NAMES[m]} ${selectedYear}`;
            const localeKey = Object.keys(groupedTransactions).find(k => k.toLowerCase() === monthKey.toLowerCase());
            if (!localeKey) continue;

            const monthTx = groupedTransactions[localeKey];
            if (!monthTx || monthTx.length === 0) continue;

            hasData = true;
            const sheetData = generateSheetData(monthTx);
            const monthIncome = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
            const monthExpense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

            sheetData.push({ No: '', Tanggal: '', Oleh: '', Kategori: 'TOTAL', Keterangan: '', Pemasukan: monthIncome, Pengeluaran: monthExpense, Saldo: monthIncome - monthExpense });

            const ws = XLSX.utils.json_to_sheet(sheetData);
            ws['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 20 }];
            XLSX.utils.book_append_sheet(wb, ws, MONTH_NAMES[m]);
        }

        if (hasData) {
            XLSX.writeFile(wb, `Riwayat_Tahun_${selectedYear}.xlsx`);
        }
        setShowDownloadModal(false);
    };

    // --- PDF Export Functions ---
    const generatePdfTable = (doc, monthTx, title, startY) => {
        const sorted = [...monthTx].sort((a, b) => {
            const dateDiff = new Date(a.date) - new Date(b.date);
            if (dateDiff !== 0) return dateDiff;
            if (a.type === 'income' && b.type === 'expense') return -1;
            if (a.type === 'expense' && b.type === 'income') return 1;
            return 0;
        });
        let balance = 0;
        const monthIncome = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
        const monthExpense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

        doc.setFontSize(14);
        doc.text(title, 14, startY);
        doc.setFontSize(9);
        doc.text(`Pemasukan: ${formatCurrency(monthIncome)}  |  Pengeluaran: ${formatCurrency(monthExpense)}  |  Saldo: ${formatCurrency(monthIncome - monthExpense)}`, 14, startY + 7);

        const tableRows = sorted.map((t, i) => {
            balance += t.type === 'income' ? Number(t.amount) : -Number(t.amount);
            return [
                i + 1,
                formatDate(t.date, 'dd/MM/yyyy'),
                t.creator_name || '-',
                t.category,
                t.note || '-',
                t.type === 'income' ? formatCurrency(t.amount) : '-',
                t.type === 'expense' ? formatCurrency(t.amount) : '-',
                formatCurrency(balance)
            ];
        });

        autoTable(doc, {
            head: [['No', 'Tanggal', 'Oleh', 'Kategori', 'Ket.', 'Pemasukan', 'Pengeluaran', 'Saldo']],
            body: tableRows,
            startY: startY + 11,
            theme: 'striped',
            headStyles: { fillColor: [134, 167, 136], fontSize: 8 },
            bodyStyles: { fontSize: 7 },
            columnStyles: { 0: { cellWidth: 8 }, 4: { cellWidth: 25 } },
        });

        return doc.lastAutoTable.finalY;
    };

    const handleDownloadMonthPDF = () => {
        if (!selectedData || selectedData.length === 0) return;

        const doc = new jsPDF();
        const title = `Riwayat Keuangan — ${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
        generatePdfTable(doc, selectedData, title, 20);
        doc.save(`Riwayat_${MONTH_NAMES[selectedMonth]}_${selectedYear}.pdf`);
        setShowDownloadModal(false);
    };

    const handleDownloadYearPDF = () => {
        const doc = new jsPDF();
        let currentY = 15;
        let hasData = false;
        let isFirstPage = true;

        doc.setFontSize(16);
        doc.text(`Riwayat Keuangan Tahun ${selectedYear}`, 14, currentY);
        currentY += 12;

        for (let m = 0; m < 12; m++) {
            const monthKey = `${MONTH_NAMES[m]} ${selectedYear}`;
            const localeKey = Object.keys(groupedTransactions).find(k => k.toLowerCase() === monthKey.toLowerCase());
            if (!localeKey) continue;

            const monthTx = groupedTransactions[localeKey];
            if (!monthTx || monthTx.length === 0) continue;

            hasData = true;

            // Add new page for each month after the first
            if (!isFirstPage) {
                doc.addPage();
                currentY = 15;
            }
            isFirstPage = false;

            generatePdfTable(doc, monthTx, MONTH_NAMES[m] + ' ' + selectedYear, currentY);
        }

        if (hasData) {
            doc.save(`Riwayat_Tahun_${selectedYear}.pdf`);
        }
        setShowDownloadModal(false);
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white">Riwayat Transaksi</h1>
                <button
                    onClick={() => setShowDownloadModal(true)}
                    className="p-2 bg-white/20 rounded-lg backdrop-blur-md cursor-pointer hover:bg-white/30 transition-colors"
                    title="Download Riwayat"
                >
                    <Download size={20} className="text-white" />
                </button>
            </div>

            <div className="glass-card min-h-[60vh] overflow-hidden flex flex-col">

                {/* Filters */}
                <div className="flex flex-col gap-2 border-b border-slate-100 dark:border-slate-700 p-2 bg-slate-50/30 dark:bg-slate-800/30">
                    <div className="flex gap-2">
                        <IconSelect
                            value={filterType}
                            onChange={setFilterType}
                            className="flex-1"
                            options={[
                                { value: 'all', label: 'Semua Tipe', icon: ListFilter },
                                { value: 'income', label: 'Pemasukan', icon: ArrowDownLeft },
                                { value: 'expense', label: 'Pengeluaran', icon: ArrowUpRight },
                            ]}
                        />
                        <IconSelect
                            value={userFilter}
                            onChange={setUserFilter}
                            className="flex-1"
                            options={[
                                { value: 'all', label: 'Semua Data', icon: Users },
                                { value: 'me', label: 'Data Saya', icon: User },
                                { value: 'partner', label: 'Data Pasangan', icon: UserCheck },
                            ]}
                        />
                    </div>
                    <div className="flex gap-2">
                        <IconSelect
                            value={selectedYear}
                            onChange={(v) => setSelectedYear(Number(v))}
                            className="flex-1"
                            options={(
                                availableYears.length > 0
                                    ? availableYears
                                    : [now.getFullYear()]
                            ).map(y => ({ value: y, label: String(y), icon: CalendarDays }))}
                        />
                        <IconSelect
                            value={selectedMonth}
                            onChange={(v) => setSelectedMonth(Number(v))}
                            className="flex-1"
                            options={(
                                availableMonths.length > 0
                                    ? availableMonths
                                    : [now.getMonth()]
                            ).map(m => ({ value: m, label: MONTH_NAMES[m], icon: Calendar }))}
                        />
                    </div>
                </div>

                {/* List Grouped by Month */}
                <div className="flex-1 overflow-y-auto p-4 space-y-8 pb-24">
                    {isLoading ? (
                        <HistorySkeleton />
                    ) : selectedData.length > 0 ? (
                        (() => {
                            const monthData = selectedData;
                            const monthYear = selectedMonthKeyLocale;

                            // Calculate Month Totals
                            const monthIncome = monthData.filter(t => t.type === 'income').reduce((acc, curr) => acc + Number(curr.amount), 0);
                            const monthExpense = monthData.filter(t => t.type === 'expense').reduce((acc, curr) => acc + Number(curr.amount), 0);
                            
                            // Group by category for Chart
                            const categoryMap = {};
                            monthData.forEach(t => {
                                if (!categoryMap[t.category]) {
                                    categoryMap[t.category] = { name: t.category, value: 0, type: t.type };
                                }
                                categoryMap[t.category].value += Number(t.amount);
                            });
                            const chartData = Object.values(categoryMap).sort((a,b) => b.value - a.value);

                            const transactionsWithBalance = monthData;
                            const currentPage = pageConfig[monthYear] || 0;

                            return (
                                <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                                    <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
                                        <div className="flex items-center space-x-2 text-sage-700">
                                            <CalendarDays size={20} />
                                            <h2 className="text-lg font-bold">{monthYear}</h2>
                                        </div>
                                    </div>

                                    {/* Monthly Summary & Category Breakdown */}
                                    <div className="mb-6 rounded-2xl overflow-hidden">
                                        {/* Summary Row */}
                                        <div className="flex items-stretch gap-1.5 sm:gap-2 mb-5">
                                            <div className="flex-1 min-w-0 bg-sage-50 dark:bg-sage-900/20 rounded-xl p-2 sm:p-3 border border-sage-100 dark:border-sage-800/30">
                                                <p className="text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider" style={{ fontSize: 'clamp(7px, 2vw, 10px)' }}>Masuk</p>
                                                <p className="font-bold text-sage-600 dark:text-sage-400 mt-1 leading-tight" style={{ fontSize: 'clamp(10px, 2.8vw, 14px)' }}>{formatCurrency(monthIncome)}</p>
                                            </div>
                                            <div className="flex-1 min-w-0 bg-rose-50 dark:bg-rose-900/20 rounded-xl p-2 sm:p-3 border border-rose-100 dark:border-rose-800/30">
                                                <p className="text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider" style={{ fontSize: 'clamp(7px, 2vw, 10px)' }}>Keluar</p>
                                                <p className="font-bold text-rose-500 dark:text-rose-400 mt-1 leading-tight" style={{ fontSize: 'clamp(10px, 2.8vw, 14px)' }}>{formatCurrency(monthExpense)}</p>
                                            </div>
                                            <div className="flex-1 min-w-0 bg-slate-800 dark:bg-slate-700 rounded-xl p-2 sm:p-3">
                                                <p className="text-slate-400 font-semibold uppercase tracking-wider" style={{ fontSize: 'clamp(7px, 2vw, 10px)' }}>Saldo</p>
                                                <p className="font-bold text-white mt-1 leading-tight" style={{ fontSize: 'clamp(10px, 2.8vw, 14px)' }}>{formatCurrency(monthIncome - monthExpense)}</p>
                                            </div>
                                        </div>

                                        {/* Stacked Bar */}
                                        {chartData.length > 0 && (
                                            <div className="mb-4">
                                                <div className="flex w-full h-3 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                                                    {chartData.map((entry, index) => {
                                                        const total = chartData.reduce((sum, e) => sum + e.value, 0);
                                                        const pct = total > 0 ? (entry.value / total) * 100 : 0;
                                                        return (
                                                            <div
                                                                key={index}
                                                                className="h-full transition-all duration-500"
                                                                style={{
                                                                    width: `${pct}%`,
                                                                    backgroundColor: COLORS[index % COLORS.length],
                                                                    minWidth: pct > 0 ? '4px' : '0'
                                                                }}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Category Breakdown List */}
                                        {chartData.length > 0 && (
                                            <div className="space-y-2">
                                                {chartData.map((entry, index) => {
                                                    const total = chartData.reduce((sum, e) => sum + e.value, 0);
                                                    const pct = total > 0 ? ((entry.value / total) * 100).toFixed(0) : 0;
                                                    return (
                                                        <div key={index} className="flex items-center gap-3 py-1.5 px-1">
                                                            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                                            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium flex-1 truncate">{entry.name}</span>
                                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium w-8 text-right">{pct}%</span>
                                                            <span className={`text-xs font-bold w-24 text-right ${entry.type === 'income' ? 'text-sage-600 dark:text-sage-400' : 'text-rose-500 dark:text-rose-400'}`}>
                                                                {formatCurrency(entry.value)}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
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
                                                        <th className="pb-3 pt-2 font-semibold px-2">Ket.</th>
                                                        <th className="pb-3 pt-2 font-semibold px-2 text-right">Saldo</th>
                                                        <th className="pb-3 pt-2 font-semibold px-2 text-right w-16"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {transactionsWithBalance.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage).map((t, tIdx) => {
                                                        const overallIndex = currentPage * itemsPerPage + tIdx + 1;
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
                                                                <td className="py-3 px-2 text-slate-500 dark:text-slate-400 align-top min-w-[120px] max-w-[200px]">
                                                                    <span className="block break-words whitespace-normal">
                                                                        {t.note || '-'}
                                                                    </span>
                                                                </td>
                                                                <td className={`py-3 px-2 text-right font-bold align-top text-slate-800 whitespace-nowrap`}>
                                                                    {formatCurrency(t.runningBalance)}
                                                                </td>
                                                                <td className="py-3 px-2 text-right align-top">
                                                                    <div className="flex items-center justify-end gap-1">
                                                                        <button
                                                                            onClick={() => handleDeleteClick(t.id)}
                                                                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all"
                                                                            title="Hapus Transaksi"
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Pagination Controls */}
                                    {transactionsWithBalance.length > itemsPerPage && (
                                        <div className="flex justify-center items-center space-x-2 mt-4">
                                            <button
                                                onClick={() => setPageConfig(prev => ({ ...prev, [monthYear]: Math.max(0, (prev[monthYear] || 0) - 1) }))}
                                                disabled={currentPage === 0}
                                                className="p-1 rounded bg-slate-50 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
                                            >
                                                <ChevronLeft size={16} />
                                            </button>

                                            {Array.from({ length: Math.ceil(transactionsWithBalance.length / itemsPerPage) }).map((_, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setPageConfig(prev => ({ ...prev, [monthYear]: idx }))}
                                                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-all ${currentPage === idx ? 'bg-sage-500 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-sage-50 border border-slate-200'}`}
                                                >
                                                    {idx + 1}
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => setPageConfig(prev => ({ ...prev, [monthYear]: Math.min(Math.ceil(transactionsWithBalance.length / itemsPerPage) - 1, (prev[monthYear] || 0) + 1) }))}
                                                disabled={currentPage >= Math.ceil(transactionsWithBalance.length / itemsPerPage) - 1}
                                                className="p-1 rounded bg-slate-50 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    )}

                                </div>
                            );
                        })()
                    ) : (
                        <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-sm">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                <CalendarDays size={24} className="text-slate-300" />
                            </div>
                            <p>Tidak ada transaksi di bulan ini.</p>
                        </div>
                    )}
                </div>

            </div>

            <ConfirmModal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={handleDeleteConfirm}
                title="Hapus Transaksi?"
                message="Transaksi ini akan dihapus permanen dan tidak bisa dikembalikan."
                confirmText="Hapus"
                cancelText="Batal"
            />

            {/* Download Modal */}
            {showDownloadModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDownloadModal(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Download Riwayat</h3>
                            <button onClick={() => setShowDownloadModal(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                <X size={18} className="text-slate-400" />
                            </button>
                        </div>
                        <div className="p-4 space-y-2">
                            {/* Section: Per Bulan */}
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">📆 {MONTH_NAMES[selectedMonth]} {selectedYear}</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleDownloadMonth}
                                    disabled={!selectedData || selectedData.length === 0}
                                    className="flex-1 flex items-center gap-3 p-3 bg-sage-50 dark:bg-sage-900/20 border border-sage-200 dark:border-sage-800/40 rounded-xl hover:bg-sage-100 dark:hover:bg-sage-900/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <div className="w-9 h-9 bg-sage-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <FileSpreadsheet size={16} className="text-white" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs font-bold text-slate-800 dark:text-white">Excel</p>
                                        <p className="text-[10px] text-slate-400">.xlsx</p>
                                    </div>
                                </button>
                                <button
                                    onClick={handleDownloadMonthPDF}
                                    disabled={!selectedData || selectedData.length === 0}
                                    className="flex-1 flex items-center gap-3 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/40 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <div className="w-9 h-9 bg-rose-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <FileText size={16} className="text-white" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs font-bold text-slate-800 dark:text-white">PDF</p>
                                        <p className="text-[10px] text-slate-400">.pdf</p>
                                    </div>
                                </button>
                            </div>

                            {/* Section: Per Tahun */}
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 pt-2">📅 Tahun {selectedYear}</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleDownloadYear}
                                    className="flex-1 flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                >
                                    <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <FileSpreadsheet size={16} className="text-white" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs font-bold text-slate-800 dark:text-white">Excel</p>
                                        <p className="text-[10px] text-slate-400">Sheet per bulan</p>
                                    </div>
                                </button>
                                <button
                                    onClick={handleDownloadYearPDF}
                                    className="flex-1 flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                                >
                                    <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <FileText size={16} className="text-white" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs font-bold text-slate-800 dark:text-white">PDF</p>
                                        <p className="text-[10px] text-slate-400">Halaman per bulan</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                        <div className="p-3 pt-0">
                            <p className="text-[10px] text-center text-slate-400">File otomatis terdownload ke perangkat anda</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default History;
