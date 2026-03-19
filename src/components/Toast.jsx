import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const Toast = ({ message, type = 'info', duration = 4000, onClose }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300); // wait for exit animation
        }, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const typeStyles = {
        info: 'bg-sage-500 text-white',
        success: 'bg-mint-500 text-white',
        warning: 'bg-amber-500 text-white',
        error: 'bg-rose-500 text-white',
    };

    return (
        <div
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[90%] px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 transition-all duration-300 ${typeStyles[type]} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}
        >
            <p className="text-sm font-medium flex-1">{message}</p>
            <button onClick={() => { setIsVisible(false); setTimeout(onClose, 300); }} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X size={16} />
            </button>
        </div>
    );
};

// Toast container to manage multiple toasts
export const ToastContainer = ({ toasts, removeToast }) => {
    return (
        <>
            {toasts.map((toast, idx) => (
                <div key={toast.id} style={{ top: `${1 + idx * 4}rem` }} className="fixed left-1/2 -translate-x-1/2 z-50 w-full flex justify-center">
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        duration={toast.duration}
                        onClose={() => removeToast(toast.id)}
                    />
                </div>
            ))}
        </>
    );
};

export default Toast;
