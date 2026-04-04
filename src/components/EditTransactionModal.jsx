import React, { useState, useEffect } from 'react';
import { updateTransaction } from '../utils/storage';
import { useTransactions } from '../contexts/TransactionContext';
import { format } from 'date-fns';
import { X, Save, ArrowDownRight, ArrowUpRight } from 'lucide-react';

const CATEGORIES = {
    expense: ['Makan', 'Transportasi', 'Belanja', 'Hobi', 'Tagihan', 'Lainnya'],
    income: ['Gaji', 'Freelance', 'Investasi', 'Bonus', 'Lainnya']
};

const EditTransactionModal = ({ isOpen, onClose, transaction }) => {
    const { refreshTransactions } = useTransactions();

    const [type, setType] = useState('expense');
    const [amount, setAmount] = useState('');
    const [numericAmount, setNumericAmount] = useState(0);
    const [category, setCategory] = useState('');
    const [customCategory, setCustomCategory] = useState('');
    const [date, setDate] = useState('');
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationError, setValidationError] = useState('');

    // Pre-fill form when transaction data changes
    useEffect(() => {
        if (transaction) {
            setType(transaction.type || 'expense');
            const amt = Number(transaction.amount) || 0;
            setNumericAmount(amt);
            setAmount(amt > 0 ? new Intl.NumberFormat('id-ID').format(amt) : '');

            const txCategory = transaction.category || '';
            const allCats = CATEGORIES[transaction.type || 'expense'];
            if (allCats.includes(txCategory)) {
                setCategory(txCategory);
                setCustomCategory('');
            } else {
                setCategory('Lainnya');
                setCustomCategory(txCategory);
            }

            setDate(transaction.date ? format(new Date(transaction.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
            setNote(transaction.note || '');
            setValidationError('');
        }
    }, [transaction]);

    if (!isOpen || !transaction) return null;

    const handleTypeChange = (newType) => {
        setType(newType);
        setCategory(CATEGORIES[newType][0]);
        setCustomCategory('');
    };

    const handleAmountChange = (e) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        if (rawValue === '') {
            setAmount('');
            setNumericAmount(0);
            return;
        }
        const numericValue = parseInt(rawValue, 10);
        setNumericAmount(numericValue);
        setAmount(new Intl.NumberFormat('id-ID').format(numericValue));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setValidationError('');

        if (!numericAmount || numericAmount <= 0) {
            setValidationError('Nominal harus lebih dari Rp 0.');
            return;
        }
        if (category === 'Lainnya' && !customCategory.trim()) {
            setValidationError('Tulis nama kategori terlebih dahulu.');
            return;
        }

        if (isSubmitting) return;
        setIsSubmitting(true);

        const finalCategory = category === 'Lainnya' && customCategory ? customCategory.trim() : category;

        try {
            await updateTransaction(transaction.id, {
                type,
                amount: numericAmount,
                category: finalCategory,
                date: new Date(date).toISOString(),
                note
            });
            await refreshTransactions();
            onClose();
        } catch (error) {
            console.error("Failed updating:", error);
            if (error.message?.includes('policy') || error.code === '42501') {
                setValidationError('Anda tidak memiliki izin untuk mengedit transaksi ini. Pastikan RLS policy UPDATE sudah aktif.');
            } else {
                setValidationError('Gagal menyimpan perubahan. Pastikan internet Anda terhubung.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const currentCategories = CATEGORIES[type];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" />

            {/* Modal */}
            <div
                className="relative bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto p-6 pb-8 animate-in zoom-in-95 fade-in duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                        Edit Transaksi
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">

                    {/* Validation Error */}
                    {validationError && (
                        <div className="p-3 text-sm text-rose-600 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-xl animate-in fade-in duration-300">
                            {validationError}
                        </div>
                    )}

                    {/* Toggle Type */}
                    <div className="flex bg-slate-100/50 dark:bg-slate-700/50 p-1.5 rounded-xl">
                        <button
                            type="button"
                            onClick={() => handleTypeChange('expense')}
                            className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 transition-all duration-300 ${type === 'expense' ? 'bg-white dark:bg-slate-600 shadow-sm text-rose-500' : 'text-slate-500 dark:text-slate-400'}`}
                        >
                            <ArrowUpRight size={16} />
                            <span>Pengeluaran</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleTypeChange('income')}
                            className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 transition-all duration-300 ${type === 'income' ? 'bg-white dark:bg-slate-600 shadow-sm text-sage-600' : 'text-slate-500 dark:text-slate-400'}`}
                        >
                            <ArrowDownRight size={16} />
                            <span>Pemasukan</span>
                        </button>
                    </div>

                    {/* Amount */}
                    <div className={`p-4 rounded-xl border-2 transition-colors duration-300 ${type === 'income'
                        ? 'bg-sage-50/50 dark:bg-sage-900/20 border-sage-200 dark:border-sage-700 focus-within:border-sage-400'
                        : 'bg-rose-50/50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-700 focus-within:border-rose-400'
                        }`}>
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                            Nominal
                        </label>
                        <div className="flex items-center text-2xl font-bold text-slate-800 dark:text-slate-100">
                            <span className="mr-2 text-lg text-slate-400">Rp</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                required
                                className="w-full bg-transparent outline-none p-0 text-slate-800 dark:text-slate-100 placeholder-slate-300 dark:placeholder-slate-600"
                                placeholder="0"
                                value={amount}
                                onChange={handleAmountChange}
                            />
                        </div>
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                            Kategori
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {currentCategories.map(cat => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setCategory(cat)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${category === cat
                                        ? (type === 'income' ? 'bg-sage-500 text-white' : 'bg-rose-500 text-white')
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                        {category === 'Lainnya' && (
                            <input
                                type="text"
                                placeholder="Tulis kategori..."
                                required
                                value={customCategory}
                                onChange={(e) => setCustomCategory(e.target.value)}
                                className="w-full p-2.5 bg-white/50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-all text-sm text-slate-700 dark:text-slate-200"
                            />
                        )}
                    </div>

                    {/* Date */}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                            Tanggal
                        </label>
                        <input
                            type="date"
                            required
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            onClick={(e) => e.target.showPicker && e.target.showPicker()}
                            className="date-input w-full p-2.5 bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-all text-sm text-slate-700 dark:text-slate-200"
                        />
                    </div>

                    {/* Note */}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                            Keterangan (Opsional)
                        </label>
                        <input
                            type="text"
                            placeholder="Cth: Beli kopi"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="w-full p-2.5 bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-all text-sm text-slate-700 dark:text-slate-200"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`flex-1 py-2.5 px-4 rounded-xl text-white text-sm font-bold shadow-lg transform transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                                } ${type === 'income'
                                    ? 'bg-gradient-to-r from-sage-500 to-mint-500 shadow-sage-500/30'
                                    : 'bg-gradient-to-r from-rose-400 to-rose-500 shadow-rose-500/30'
                                }`}
                        >
                            <Save size={16} />
                            <span>{isSubmitting ? 'Menyimpan...' : 'Simpan'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditTransactionModal;
