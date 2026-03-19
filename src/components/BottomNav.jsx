import React from 'react';
import { Home, PlusCircle, FileText, PieChart, User } from 'lucide-react';

const BottomNav = ({ activeTab, setActiveTab }) => {
    const navItems = [
        { id: 'dashboard', label: 'Beranda', icon: Home },
        { id: 'report', label: 'Laporan', icon: PieChart },
        { id: 'add', label: 'Tambah', icon: PlusCircle, isCenter: true },
        { id: 'history', label: 'Riwayat', icon: FileText },
        { id: 'profile', label: 'Profil', icon: User },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-4 px-4 pointer-events-none">
            <div className="w-full max-w-md pointer-events-auto">
                <div className="glass-nav rounded-2xl px-6 py-3 flex justify-between items-center">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;

                        if (item.isCenter) {
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className="flex-shrink-0 flex items-center justify-center -mt-8 w-14 h-14 rounded-full bg-gradient-to-br from-mint-400 to-sage-500 text-white shadow-lg shadow-mint-500/30 transform transition-transform hover:scale-105 active:scale-95"
                                    aria-label={item.label}
                                >
                                    <Icon size={28} />
                                </button>
                            );
                        }

                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`flex flex-col items-center justify-center space-y-1 w-16 transition-colors duration-200 ${isActive ? 'text-sage-700' : 'text-slate-400 hover:text-sage-500'
                                    }`}
                            >
                                <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}>
                                    <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                </div>
                                <span className={`text-[10px] font-medium transition-opacity duration-300 ${isActive ? 'opacity-100 font-bold text-sage-600 mt-0.5' : 'opacity-80'}`}>
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default BottomNav;
