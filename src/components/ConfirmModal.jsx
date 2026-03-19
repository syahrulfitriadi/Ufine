import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Hapus', cancelText = 'Batal', variant = 'danger' }) => {
    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            icon: 'bg-rose-100 text-rose-500',
            button: 'bg-gradient-to-r from-rose-400 to-rose-500 shadow-rose-500/30',
        },
        warning: {
            icon: 'bg-amber-100 text-amber-500',
            button: 'bg-gradient-to-r from-amber-400 to-amber-500 shadow-amber-500/30',
        },
    };

    const styles = variantStyles[variant] || variantStyles.danger;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" />

            {/* Modal */}
            <div
                className="relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 fade-in duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <X size={18} />
                </button>

                {/* Icon */}
                <div className="flex justify-center mb-4">
                    <div className={`w-14 h-14 rounded-full ${styles.icon} flex items-center justify-center`}>
                        <AlertTriangle size={28} />
                    </div>
                </div>

                {/* Content */}
                <h3 className="text-lg font-bold text-slate-800 text-center mb-2">
                    {title || 'Konfirmasi'}
                </h3>
                <p className="text-sm text-slate-500 text-center mb-6 leading-relaxed">
                    {message || 'Apakah Anda yakin ingin melanjutkan?'}
                </p>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 py-2.5 px-4 rounded-xl text-white text-sm font-bold shadow-lg transform transition-transform hover:scale-[1.02] active:scale-95 ${styles.button}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
