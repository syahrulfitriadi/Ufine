import React, { useState } from 'react';
import { addTransaction } from '../utils/storage';
import { useTransactions } from '../contexts/TransactionContext';
import { format } from 'date-fns';
import { ArrowDownRight, ArrowUpRight, CheckCircle2 } from 'lucide-react';

const CATEGORIES = {
    expense: ['Makan', 'Transportasi', 'Belanja', 'Hobi', 'Tagihan', 'Lainnya'],
    income: ['Gaji', 'Freelance', 'Investasi', 'Bonus', 'Lainnya']
};

const AddTransaction = ({ onSuccess }) => {
    const { refreshTransactions } = useTransactions();
    const [type, setType] = useState('expense');
    const [amount, setAmount] = useState('');
    const [numericAmount, setNumericAmount] = useState(0);
    const [category, setCategory] = useState(CATEGORIES.expense[0]);
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [note, setNote] = useState('');
    const [customCategory, setCustomCategory] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [validationError, setValidationError] = useState('');

    // Switch type and reset category
    const handleTypeChange = (newType) => {
        setType(newType);
        setCategory(CATEGORIES[newType][0]);
        setCustomCategory('');
    };

    const handleAmountChange = (e) => {
        // 1. Remove non-digit characters
        const rawValue = e.target.value.replace(/\D/g, '');

        if (rawValue === '') {
            setAmount('');
            setNumericAmount(0);
            return;
        }

        // 2. Convert to number to remove leading zeros, then format back to locale string (id-ID)
        const numericValue = parseInt(rawValue, 10);
        setNumericAmount(numericValue);

        // 3. Format with dots
        const formattedValue = new Intl.NumberFormat('id-ID').format(numericValue);
        setAmount(formattedValue);
    };

    const handleAmountBlur = () => {
        if (amount && numericAmount > 0) {
            setAmount(`${new Intl.NumberFormat('id-ID').format(numericAmount)}`);
        }
    };
    const handleAmountFocus = () => {
        if (numericAmount > 0) {
            setAmount(new Intl.NumberFormat('id-ID').format(numericAmount));
        }
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const currentCategories = CATEGORIES[type];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setValidationError('');

        // Validasi nominal
        if (!numericAmount || numericAmount <= 0) {
            setValidationError('Nominal harus lebih dari Rp 0.');
            return;
        }

        // Validasi kategori custom
        if (category === 'Lainnya' && !customCategory.trim()) {
            setValidationError('Tulis nama kategori terlebih dahulu.');
            return;
        }

        if (isSubmitting) return;
        setIsSubmitting(true);
        const finalCategory = category === 'Lainnya' && customCategory ? customCategory.trim() : category;

        try {
            await addTransaction({
                type,
                amount: numericAmount,
                category: finalCategory,
                date: new Date(date).toISOString(),
                note
            });

            // Refresh shared transaction cache
            await refreshTransactions();

            // Set local success state to show CheckCircle UI
            setIsSuccess(true);
            setTimeout(() => {
                // Navigate to report page per user request using the prop callback
                onSuccess();
            }, 1500);
        } catch (error) {
            console.error("Failed adding:", error);
            setValidationError('Gagal menambahkan transaksi. Pastikan internet Anda terhubung.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in zoom-in duration-500">
                <div className="w-24 h-24 bg-mint-100 rounded-full flex items-center justify-center mb-6 shadow-mint-500/30 shadow-lg">
                    <CheckCircle2 size={48} className="text-mint-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Berhasil!</h2>
                <p className="text-slate-500 mt-2">Transaksi telah ditambahkan.</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-2xl font-bold text-white mb-6">Tambah Transaksi</h1>

            <div className="glass-card p-6 min-h-[60vh] relative">
                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Validation Error Message */}
                    {validationError && (
                        <div className="p-3 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl animate-in fade-in duration-300">
                            {validationError}
                        </div>
                    )}

                    {/* Toggle Type */}
                    <div className="flex bg-slate-100/50 p-1.5 rounded-xl">
                        <button
                            type="button"
                            onClick={() => handleTypeChange('expense')}
                            className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 transition-all duration-300 ${type === 'expense' ? 'bg-white shadow-sm text-rose-500' : 'text-slate-500'
                                }`}
                        >
                            <ArrowUpRight size={18} />
                            <span>Pengeluaran</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleTypeChange('income')}
                            className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 transition-all duration-300 ${type === 'income' ? 'bg-white shadow-sm text-sage-600' : 'text-slate-500'
                                }`}
                        >
                            <ArrowDownRight size={18} />
                            <span>Pemasukan</span>
                        </button>
                    </div>

                    {/* Amount Box */}
                    <div className={`nominal-box p-4 rounded-xl border-2 transition-colors duration-300 ${type === 'income' ? 'bg-sage-50/50 border-sage-200 focus-within:border-sage-400' : 'bg-rose-50/50 border-rose-200 focus-within:border-rose-400'
                        }`}>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
                            Nominal
                        </label>
                        <div className="flex items-center text-3xl font-bold text-slate-800">
                            <span className="mr-2 text-xl text-slate-400">Rp</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                required
                                className="w-full bg-transparent outline-none p-0 custom-number-input placeholder-slate-300"
                                placeholder="0"
                                value={amount}
                                onFocus={handleAmountFocus}
                                onBlur={handleAmountBlur}
                                onChange={handleAmountChange}
                            />
                        </div>
                    </div>

                    {/* Category Selection */}
                    <div className="space-y-3">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                            Kategori
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {currentCategories.map(cat => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setCategory(cat)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${category === cat
                                        ? (type === 'income' ? 'bg-sage-500 text-white' : 'bg-rose-500 text-white')
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                        {/* Custom Category input if Lainnya is selected */}
                        {category === 'Lainnya' && (
                            <input
                                type="text"
                                placeholder="Tulis kategori..."
                                required
                                value={customCategory}
                                onChange={(e) => setCustomCategory(e.target.value)}
                                className="w-full p-3 bg-white/50 border border-slate-200 rounded-xl outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-all text-sm"
                            />
                        )}
                    </div>

                    {/* Date Picker */}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
                            Tanggal
                        </label>
                        <input
                            type="date"
                            required
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            onClick={(e) => e.target.showPicker && e.target.showPicker()}
                            className="date-input w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-all text-sm text-slate-700"
                        />
                    </div>

                    {/* Note Input */}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
                            Catatan (Opsional)
                        </label>
                        <input
                            type="text"
                            placeholder="Cth: Beli kopi"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-all text-sm text-slate-700"
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transform transition-transform ${isSubmitting ? 'opacity-70' : 'hover:scale-[1.02] active:scale-95'} ${type === 'income' ? 'bg-gradient-to-r from-sage-500 to-mint-500 shadow-sage-500/30' : 'bg-gradient-to-r from-rose-400 to-rose-500 shadow-rose-500/30'
                            }`}
                    >
                        {isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}
                    </button>
                </form>
            </div>

        </div>
    );
};

export default AddTransaction;
