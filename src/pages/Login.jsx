import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Wallet, LogIn, UserPlus } from 'lucide-react';

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const { signIn, signUp } = useAuth();

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            if (isLogin) {
                const { error } = await signIn(email, password);
                if (error) throw error;
            } else {
                const { error } = await signUp(email, password);
                if (error) throw error;
                setSuccessMsg('Registrasi berhasil! Silakan login.');
                setIsLogin(true);
            }
        } catch (error) {
            let msg = error.message || 'Terjadi kesalahan.';
            if (msg.toLowerCase().includes('email rate limit exceeded')) {
                msg = 'Terlalu banyak permintaan pembuatan akun. Harap tunggu beberapa saat lagi atau cek email Anda untuk memverifikasi jika Anda baru saja mendaftar.';
            } else if (msg.includes('Invalid login credentials')) {
                msg = 'Email atau password salah.';
            }
            setErrorMsg(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-sage-50 flex flex-col justify-center relative overflow-hidden px-6">
            <div className="absolute top-[-100px] left-[-100px] w-96 h-96 bg-mint-400/40 rounded-full blur-3xl"></div>
            <div className="absolute bottom-[-100px] right-[-100px] w-96 h-96 bg-sage-400/30 rounded-full blur-3xl"></div>

            <div className="relative z-10 w-full max-w-sm mx-auto">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-mint-400 to-sage-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-mint-500/30 mb-4 transform rotate-12">
                        <Wallet size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800">UangKu Cloud</h1>
                    <p className="text-slate-500 text-sm mt-1 text-center">Catat & sinkronisasi keuangan Anda dari mana saja.</p>
                </div>

                <div className="glass-card p-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-6">
                        {isLogin ? 'Masuk ke Akun' : 'Buat Akun Baru'}
                    </h2>

                    {errorMsg && (
                        <div className="p-3 mb-4 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl">
                            {errorMsg}
                        </div>
                    )}

                    {successMsg && (
                        <div className="p-3 mb-4 text-sm text-sage-700 bg-sage-50 border border-sage-200 rounded-xl">
                            {successMsg}
                        </div>
                    )}

                    <form onSubmit={handleAuth} className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
                                Email
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full p-3 bg-white/50 border border-slate-200 rounded-xl outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-all text-sm"
                                placeholder="nama@email.com"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
                                Password
                            </label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-3 bg-white/50 border border-slate-200 rounded-xl outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-all text-sm"
                                placeholder="Minimal 6 karakter"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3 mt-2 rounded-xl text-white font-bold text-sm shadow-lg transform transition-transform ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95'
                                } flex items-center justify-center space-x-2 bg-gradient-to-r from-sage-500 to-mint-500 shadow-sage-500/30`}
                        >
                            {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
                            <span>{loading ? 'Memproses...' : (isLogin ? 'Masuk' : 'Daftar')}</span>
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm">
                        <span className="text-slate-500">
                            {isLogin ? 'Belum punya akun? ' : 'Sudah punya akun? '}
                        </span>
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-mint-600 font-semibold hover:underline"
                        >
                            {isLogin ? 'Daftar sekarang' : 'Masuk di sini'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
