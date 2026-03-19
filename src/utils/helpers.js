import { format, isSameMonth, parseISO, subDays, isAfter } from 'date-fns';

// Format currency IDR
export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

// Format Date
export const formatDate = (dateString, formatStr = 'dd MMM yyyy') => {
    if (!dateString) return '';
    return format(parseISO(dateString), formatStr);
};

// Calculate summaries for current month
export const calculateSummary = (transactions) => {
    const now = new Date();

    const currentMonthTransactions = transactions.filter(t =>
        isSameMonth(parseISO(t.date), now)
    );

    const totalIncome = currentMonthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpense = currentMonthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
        totalBalance: totalIncome - totalExpense,
        totalIncome,
        totalExpense
    };
};

export const getChartData = (transactions, days = 7) => {
    const chartData = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
        const targetDate = subDays(now, i);
        const formattedDate = format(targetDate, 'dd/MM');

        // Find transactions for this specific day
        const dayTransactions = transactions.filter(t => {
            const tDate = parseISO(t.date);
            return format(tDate, 'dd/MM') === formattedDate;
        });

        const income = dayTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const expense = dayTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        chartData.push({
            name: formattedDate,
            Pemasukan: income,
            Pengeluaran: expense
        });
    }

    return chartData;
};
