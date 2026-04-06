import React, { useState, useEffect, useMemo } from 'react';
import { formatCurrency, formatDate } from '../utils/helpers';
import { isSameWeek, isSameMonth, parseISO, format } from 'date-fns';
import { id } from 'date-fns/locale';
import { BarChart, Wallet, ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, FileDown, FileSpreadsheet, Pencil, Users, User, UserCheck } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useAuth } from '../contexts/AuthContext';
import { useTransactions } from '../contexts/TransactionContext';
import { ReportSkeleton } from '../components/SkeletonLoader';
import EditTransactionModal from '../components/EditTransactionModal';
import IconSelect from '../components/IconSelect';

const Report = () => {
    const { session } = useAuth();
    const { transactions, isLoading } = useTransactions();
    const [period, setPeriod] = useState('monthly'); // 'weekly' or 'monthly'
    const [userFilter, setUserFilter] = useState('me'); // 'all', 'me', 'partner'
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Edit modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);

    const handleEditClick = (transaction) => {
        setEditingTransaction(transaction);
        setShowEditModal(true);
    };

    // Reset pagination when period changes
    useEffect(() => {
        setCurrentPage(1);
    }, [period]);

    const now = new Date();

    const { targetTransactions, totalIncome, totalExpense, balance, transactionsWithBalance } = useMemo(() => {
        // Pre-filter by User
        const userFiltered = transactions.filter(t => {
            if (userFilter === 'all') return true;
            if (userFilter === 'me') return t.user_id === session?.user?.id;
            if (userFilter === 'partner') return t.user_id !== session?.user?.id;
            return true;
        });

        // Filter Target Transactions for the selected period
        const filtered = userFiltered.filter(t => {
            const tDate = parseISO(t.date);
            if (period === 'weekly') {
                return isSameWeek(tDate, now, { weekStartsOn: 1 }); // Starts on Monday
            }
            return isSameMonth(tDate, now);
        });

        // Calculate Totals Header
        const tIncome = filtered
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const tExpense = filtered
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const tBal = tIncome - tExpense;

        // Sort properly for scoped chronological running balance (from oldest to newest)
        // User requested: the balance is based ONLY on the transactions inside this report.
        // Balance starts at 0, + income, - expense
        const sortedOldest = [...filtered].sort((a, b) => new Date(a.date) - new Date(b.date));

        let currentBalance = 0;
        const withBalance = sortedOldest.map(t => {
            if (t.type === 'income') {
                currentBalance += Number(t.amount);
            } else {
                currentBalance -= Number(t.amount);
            }
            return { ...t, runningBalance: currentBalance };
        });

        // Finally, reverse back to display newest on top of table
        const reversed = [...withBalance].reverse();

        return {
            targetTransactions: filtered,
            totalIncome: tIncome,
            totalExpense: tExpense,
            balance: tBal,
            transactionsWithBalance: reversed
        };
    }, [transactions, period, userFilter, session]);

    // Pagination Logic
    const totalPages = Math.ceil(transactionsWithBalance.length / itemsPerPage);
    const paginatedTransactions = transactionsWithBalance.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // --- Export Functions ---
    const handleExportPDF = () => {
        const doc = new jsPDF();

        doc.setFontSize(16);
        const titleDate = period === 'weekly' ? 'Minggu Ini' : format(now, 'MMMM yyyy', { locale: id });
        doc.text(`Laporan Keuangan (${titleDate})`, 14, 20);

        doc.setFontSize(10);
        doc.text(`Total Pemasukan: ${formatCurrency(totalIncome)}`, 14, 30);
        doc.text(`Total Pengeluaran: ${formatCurrency(totalExpense)}`, 14, 35);
        doc.text(`Sisa Saldo: ${formatCurrency(balance)}`, 14, 40);

        const tableColumn = ["No", "Tanggal", "Oleh", "Kategori", "Keterangan", "Pemasukan", "Pengeluaran", "Saldo"];
        const tableRows = [];

        // Reverse back to oldest first for report flow (chronological order)
        const exportData = [...transactionsWithBalance].reverse();

        exportData.forEach((t, i) => {
            const ticketData = [
                i + 1,
                formatDate(t.date, 'dd/MM/yyyy'),
                t.creator_name || '-',
                t.category,
                t.note || '-',
                t.type === 'income' ? formatCurrency(t.amount) : '-',
                t.type === 'expense' ? formatCurrency(t.amount) : '-',
                formatCurrency(t.runningBalance)
            ];
            tableRows.push(ticketData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 45,
            theme: 'striped',
            headStyles: { fillColor: [134, 167, 136] }, // sage-500
        });

        doc.save(`laporan_keuangan_${period}_${new Date().getTime()}.pdf`);
    };

    const handleExportExcel = () => {
        // Reverse back to oldest first for report flow
        const exportData = [...transactionsWithBalance].reverse();

        const worksheetData = exportData.map((t, i) => ({
            No: i + 1,
            Tanggal: formatDate(t.date, 'dd/MM/yyyy'),
            Oleh: t.creator_name || '-',
            Kategori: t.category,
            Keterangan: t.note || '-',
            Jenis: t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
            Nominal: Number(t.amount),
            Saldo: t.runningBalance
        }));

        // Add Totals row at bottom
        worksheetData.push({
            No: '',
            Tanggal: '',
            Kategori: 'TOTAL',
            Keterangan: '',
            Jenis: '',
            Nominal: `Masuk: ${totalIncome} | Keluar: ${totalExpense}`,
            Saldo: balance
        });

        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        const titleSheet = period === 'weekly' ? 'Mingguan' : format(now, 'MMMM yyyy', { locale: id });
        XLSX.utils.book_append_sheet(workbook, worksheet, `Laporan ${titleSheet}`);

        // Adjust column widths
        const wscols = [
            { wch: 5 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 20 }
        ];
        worksheet['!cols'] = wscols;

        XLSX.writeFile(workbook, `laporan_keuangan_${period}_${new Date().getTime()}.xlsx`);
    };


    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white">Laporan Keuangan</h1>
                <div className="flex space-x-2">
                    <button
                        onClick={handleExportPDF}
                        disabled={transactionsWithBalance.length === 0}
                        title="Export PDF"
                        className="p-2 bg-rose-500/80 hover:bg-rose-500 text-white rounded-lg backdrop-blur-md transition-colors disabled:opacity-50"
                    >
                        <FileDown size={20} />
                    </button>
                    <button
                        onClick={handleExportExcel}
                        disabled={transactionsWithBalance.length === 0}
                        title="Export Excel"
                        className="p-2 bg-teal-500/80 hover:bg-teal-500 text-white rounded-lg backdrop-blur-md transition-colors disabled:opacity-50"
                    >
                        <FileSpreadsheet size={20} />
                    </button>
                </div>
            </div>

            <div className="glass-card min-h-[60vh] flex flex-col p-4">

                {/* Toggle Filters */}
                <div className="flex flex-col sm:flex-row gap-2 mb-6 mt-2">
                    <div className="flex flex-1 bg-slate-100/50 p-1.5 rounded-xl">
                        <button
                            onClick={() => setPeriod('weekly')}
                            className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all duration-300 ${period === 'weekly' ? 'bg-white shadow-sm text-sage-600' : 'text-slate-500'
                                }`}
                        >
                            Minggu Ini
                        </button>
                        <button
                            onClick={() => setPeriod('monthly')}
                            className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all duration-300 ${period === 'monthly' ? 'bg-white shadow-sm text-sage-600' : 'text-slate-500'
                                }`}
                        >
                            Bulan Ini
                        </button>
                    </div>

                    <IconSelect
                        value={userFilter}
                        onChange={setUserFilter}
                        options={[
                            { value: 'all', label: 'Semua Data', icon: Users },
                            { value: 'me', label: 'Data Saya', icon: User },
                            { value: 'partner', label: 'Data Pasangan', icon: UserCheck },
                        ]}
                    />
                </div>

                {isLoading ? (
                    <ReportSkeleton />
                ) : (
                    <>
                        {/* Visual Summary Overview */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="bg-sage-50/70 border border-sage-100 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                                <div className="w-8 h-8 rounded-full bg-sage-200 text-sage-700 flex items-center justify-center mb-2">
                                    <ArrowDownRight size={18} />
                                </div>
                                <p className="text-xs text-slate-500 font-semibold mb-1">Pemasukan</p>
                                <p className="font-bold text-sage-700 text-sm">{formatCurrency(totalIncome)}</p>
                            </div>

                            <div className="bg-rose-50/70 border border-rose-100 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                                <div className="w-8 h-8 rounded-full bg-rose-200 text-rose-700 flex items-center justify-center mb-2">
                                    <ArrowUpRight size={18} />
                                </div>
                                <p className="text-xs text-slate-500 font-semibold mb-1">Pengeluaran</p>
                                <p className="font-bold text-rose-600 text-sm">{formatCurrency(totalExpense)}</p>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white flex justify-between items-center mb-8 shadow-lg">
                            <div>
                                <p className="text-xs text-slate-300 font-medium mb-1">Sisa Saldo {period === 'weekly' ? 'Mingguan' : 'Bulanan'}</p>
                                <p className="text-2xl font-bold">{formatCurrency(balance)}</p>
                            </div>
                            <div className="p-3 bg-white/10 rounded-xl">
                                <Wallet size={24} className="text-white" />
                            </div>
                        </div>

                        {/* Table Details */}
                        <h3 className="text-sm font-bold text-slate-800 mb-3 px-1">Rincian Transaksi</h3>

                        <div className="flex-1 overflow-x-auto pb-6">
                            {targetTransactions.length > 0 ? (
                                    <table className="w-full text-left text-sm border-collapse min-w-[550px]">
                                        <thead>
                                            <tr className="border-b-2 border-sage-100 text-slate-500">
                                                <th className="pb-3 pt-2 font-semibold px-2 w-8">No</th>
                                                <th className="pb-3 pt-2 font-semibold px-2">Tanggal</th>
                                                <th className="pb-3 pt-2 font-semibold px-2">Pemasukan</th>
                                                <th className="pb-3 pt-2 font-semibold px-2">Pengeluaran</th>
                                                <th className="pb-3 pt-2 font-semibold px-2">Kategori</th>
                                                <th className="pb-3 pt-2 font-semibold px-2">Ket.</th>
                                                <th className="pb-3 pt-2 font-semibold px-2 text-right">Saldo</th>
                                                <th className="pb-3 pt-2 font-semibold px-2 text-right w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedTransactions.map((t, index) => {
                                                // Calculate No. column (newest is No 1, next is No 2, etc.)
                                                const overallIndex = (currentPage - 1) * itemsPerPage + index + 1;

                                                return (
                                                    <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group">
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
                                                            <div className="flex items-center gap-1.5">
                                                                <span>{t.category}</span>
                                                                {t.creator_name && t.creator_name !== 'Tidak Diketahui' && (
                                                                    <span className="bg-slate-100 text-slate-400 text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wide font-bold">
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
                                                        <td className={`py-3 text-right font-bold align-top text-slate-800 whitespace-nowrap`}>
                                                            {formatCurrency(t.runningBalance)}
                                                        </td>
                                                        <td className="py-3 px-2 text-right align-top">
                                                            {t.user_id === session?.user?.id && (
                                                                <button
                                                                    onClick={() => handleEditClick(t)}
                                                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                                                                    title="Edit Transaksi"
                                                                >
                                                                    <Pencil size={14} />
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                            ) : (
                                <div className="text-center p-8 text-slate-400 text-sm bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                                    Tidak ada transaksi pada periode ini.
                                </div>
                            )}
                        </div>

                        {/* Pagination Controls - OUTSIDE overflow container */}
                        {targetTransactions.length > 0 && totalPages > 1 && (
                            <div className="flex justify-center items-center space-x-2 mt-2 mb-4">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-1 rounded bg-slate-100 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 transition-colors"
                                >
                                    <ChevronLeft size={20} />
                                </button>

                                {Array.from({ length: totalPages }).map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentPage(idx + 1)}
                                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-all ${currentPage === idx + 1
                                            ? 'bg-sage-500 text-white shadow-md'
                                            : 'bg-white text-slate-500 hover:bg-sage-50 border border-slate-200'
                                            }`}
                                    >
                                        {idx + 1}
                                    </button>
                                ))}

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-1 rounded bg-slate-100 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 transition-colors"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        )}
                    </>
                )}

            </div>

            <EditTransactionModal
                isOpen={showEditModal}
                onClose={() => { setShowEditModal(false); setEditingTransaction(null); }}
                transaction={editingTransaction}
            />
        </div>
    );
};

export default Report;
