import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { UserCircle, LogOut, CheckCircle2, ChevronRight, Bell, Moon, Shield, HelpCircle, Settings, Camera } from 'lucide-react';
import { getAvatarUrl, updateAvatarUrl, compressImage } from '../utils/storage';
import ConfirmModal from '../components/ConfirmModal';

const Profile = ({ session }) => {
    const [loading, setLoading] = useState(false);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    // Settings States
    const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
    const [isNotifEnabled, setIsNotifEnabled] = useState(true);
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [avatarLoading, setAvatarLoading] = useState(false);
    const fileInputRef = useRef(null);
    const settingsRef = useRef(null);

    // Apply dark mode class on mount
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, []);

    const toggleDarkMode = () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        localStorage.setItem('darkMode', newMode.toString());
        if (newMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        // Update status bar color to match theme
        const meta = document.getElementById('theme-color-meta');
        if (meta) meta.setAttribute('content', newMode ? '#1e293b' : '#86a788');
    };

    const [familyInfo, setFamilyInfo] = useState(null);
    const [joinCodeInput, setJoinCodeInput] = useState('');
    const [familyNameInput, setFamilyNameInput] = useState('');
    const [familyLoading, setFamilyLoading] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

    useEffect(() => {
        if (session?.user) {
            setEmail(session.user.email);
            setUsername(session.user.user_metadata?.username || '');
            fetchFamilyData(session.user.id);
            // Fetch avatar
            getAvatarUrl().then(url => setAvatarUrl(url));
        }
    }, [session]);

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Pilih file gambar (JPG, PNG, dll.)');
            return;
        }

        setAvatarLoading(true);
        try {
            const compressed = await compressImage(file);
            await updateAvatarUrl(compressed);
            setAvatarUrl(compressed);
        } catch (error) {
            console.error('Error uploading avatar:', error);
            alert('Gagal mengupload foto. Coba lagi.');
        } finally {
            setAvatarLoading(false);
            // Reset input so same file can be selected again
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const scrollToSettings = () => {
        settingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const fetchFamilyData = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select(`
                    id,
                    family_id,
                    families ( id, name, join_code )
                `)
                .eq('id', userId)
                .single();

            if (error) throw error;
            if (data?.families) {
                setFamilyInfo(data.families);
            }
        } catch (error) {
            console.error('Error fetching family logic:', error.message);
        }
    };

    const handleCreateFamily = async () => {
        if (!familyNameInput) return alert('Nama keluarga tidak boleh kosong');
        setFamilyLoading(true);
        try {
            // Generate simple random 6-char code
            const passCode = Math.random().toString(36).substring(2, 8).toUpperCase();

            // Insert into families
            const { data: newFamily, error: familyError } = await supabase
                .from('families')
                .insert([{ name: familyNameInput, join_code: passCode }])
                .select()
                .single();

            if (familyError) throw familyError;

            // Update user profile
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ family_id: newFamily.id, display_name: username || email.split('@')[0] })
                .eq('id', session.user.id);

            if (profileError) throw profileError;

            // Update all past personal transactions to belong to this family 
            const { error: txError } = await supabase
                .from('transactions')
                .update({ family_id: newFamily.id })
                .eq('user_id', session.user.id)
                .is('family_id', null);

            if (txError) console.error("Error migrating past transactions to new family:", txError);

            setFamilyInfo(newFamily);
            alert('Grup Keluarga berhasil dibuat!');
            setFamilyNameInput('');
        } catch (error) {
            alert('Gagal membuat grup: ' + error.message);
        } finally {
            setFamilyLoading(false);
        }
    };

    const handleJoinFamily = async () => {
        if (!joinCodeInput) return alert('Kode gabung tidak boleh kosong');
        setFamilyLoading(true);
        try {
            // Check if family exists
            const { data: familyTarget, error: searchError } = await supabase
                .from('families')
                .select('*')
                .eq('join_code', joinCodeInput.toUpperCase())
                .single();

            if (searchError || !familyTarget) {
                throw new Error('Kode grup tidak ditemukan atau tidak valid.');
            }

            // Update user profile
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ family_id: familyTarget.id, display_name: username || email.split('@')[0] })
                .eq('id', session.user.id);

            if (profileError) throw profileError;

            // Update all past personal transactions to belong to this new family
            const { error: txError } = await supabase
                .from('transactions')
                .update({ family_id: familyTarget.id })
                .eq('user_id', session.user.id)
                .is('family_id', null);

            if (txError) console.error("Error migrating past transactions to joined family:", txError);

            setFamilyInfo(familyTarget);
            alert(`Berhasil bergabung dengan keluarga: ${familyTarget.name}`);
            setJoinCodeInput('');
        } catch (error) {
            alert(error.message);
        } finally {
            setFamilyLoading(false);
        }
    };

    const handleLeaveFamily = async () => {
        setFamilyLoading(true);
        try {
            // Remove family_id from profile
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ family_id: null })
                .eq('id', session.user.id);

            if (profileError) throw profileError;

            // Remove family_id from user's personal transactions
            const { error: txError } = await supabase
                .from('transactions')
                .update({ family_id: null })
                .eq('user_id', session.user.id);

            if (txError) console.error('Error clearing family from transactions:', txError);

            setFamilyInfo(null);
            alert('Anda telah keluar dari grup keluarga.');
        } catch (error) {
            alert('Gagal keluar: ' + error.message);
        } finally {
            setFamilyLoading(false);
        }
    };


    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                data: { username: username }
            });
            if (error) throw error;

            // Also sync it to our display_name in profiles to be safe
            await supabase.from('profiles').update({ display_name: username }).eq('id', session.user.id);

            if (error) throw error;

            setIsSuccess(true);
            setTimeout(() => setIsSuccess(false), 3000);
            alert('Username berhasil diperbarui!');
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
        } catch (error) {
            alert(error.message);
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-28">
            <div className="flex justify-between items-center mb-6 text-white">
                <h1 className="text-2xl font-bold">Profil</h1>
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md cursor-pointer hover:bg-white/30 transition-colors" onClick={scrollToSettings}>
                    <Settings size={20} />
                </div>
            </div>

            {/* Profile Info Card */}
            <div className="glass-card p-6 mb-6 flex flex-col items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-sage-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>

                <div
                    className="w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-inner relative text-sage-600 font-bold text-3xl uppercase border-4 border-white cursor-pointer group overflow-hidden"
                    onClick={() => fileInputRef.current?.click()}
                    title="Klik untuk ganti foto"
                >
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-sage-100 flex items-center justify-center">
                            {username ? username.charAt(0) : <UserCircle size={40} />}
                        </div>
                    )}
                    {/* Camera overlay on hover */}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                        {avatarLoading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Camera size={20} className="text-white" />
                        )}
                    </div>
                    {isSuccess && (
                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full">
                            <CheckCircle2 className="text-mint-500 w-6 h-6 border-2 border-white rounded-full bg-white relative z-10" />
                        </div>
                    )}
                </div>
                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                />

                <div className="w-full text-center mb-6">
                    <h2 className="text-xl font-extrabold text-slate-800">{username || 'Pengguna'}</h2>
                    <p className="text-xs font-medium text-slate-400 mt-1">{email}</p>
                </div>

                <form onSubmit={handleUpdate} className="w-full space-y-4">
                    <div>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Ubah nama pengguna..."
                            maxLength="20"
                            className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-all text-sm text-slate-700 text-center font-medium placeholder-slate-300"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 rounded-xl text-white font-bold text-sm shadow-md shadow-sage-500/20 transform transition-transform ${loading ? 'opacity-70' : 'hover:scale-[1.02] active:scale-95'
                            } bg-gradient-to-r from-sage-500 to-mint-500`}
                    >
                        {loading ? 'Menyimpan...' : 'Simpan Nama'}
                    </button>
                </form>
            </div>

            {/* Family Connect Section */}
            <h3 className="text-sm font-bold text-slate-800 mb-3 px-1">Keluarga & Pasangan</h3>
            <div className="glass-card mb-6 p-4 overflow-hidden">
                {familyInfo ? (
                    <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-mint-50 text-mint-500 rounded-full flex items-center justify-center mb-3">
                            <UserCircle size={24} />
                        </div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-1">{familyInfo.name}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Anda tergabung dalam grup keluarga ini.</p>
                        <div className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 p-3 rounded-xl flex justify-between items-center">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Kode Undangan:</span>
                            <span className="text-sm font-bold tracking-widest text-sage-600 dark:text-sage-400">{familyInfo.join_code}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 text-left w-full leading-tight">
                            *Berikan kode ini kepada pasangan/keluarga Anda agar mereka dapat memantau dan mengisi arus kas yang sama.
                        </p>
                        <button
                            onClick={() => setShowLeaveConfirm(true)}
                            disabled={familyLoading}
                            className="mt-4 w-full py-2.5 text-sm font-semibold text-rose-500 dark:text-rose-400 border border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-900/20 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors disabled:opacity-50"
                        >
                            Keluar dari Grup
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <h4 className="text-sm font-bold text-slate-700 mb-2">Bentuk Grup Baru</h4>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={familyNameInput}
                                    onChange={(e) => setFamilyNameInput(e.target.value)}
                                    placeholder="Nama Keluarga (mis: Keluarga Budi)"
                                    className="flex-1 p-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-sage-400"
                                />
                                <button
                                    onClick={handleCreateFamily}
                                    disabled={familyLoading}
                                    className="bg-sage-500 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-sage-600 disabled:opacity-50"
                                >
                                    Buat
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="h-px bg-slate-200 flex-1"></div>
                            <span className="text-xs font-bold text-slate-400">ATAU</span>
                            <div className="h-px bg-slate-200 flex-1"></div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <h4 className="text-sm font-bold text-slate-700 mb-2">Gabung via Kode</h4>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={joinCodeInput}
                                    onChange={(e) => setJoinCodeInput(e.target.value)}
                                    placeholder="Masukkan 6 Digit Kode"
                                    maxLength="6"
                                    className="flex-1 p-2 text-sm uppercase bg-white border border-slate-200 rounded-lg outline-none focus:border-sage-400"
                                />
                                <button
                                    onClick={handleJoinFamily}
                                    disabled={familyLoading}
                                    className="bg-mint-500 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-mint-600 disabled:opacity-50"
                                >
                                    Gabung
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* App Settings Card */}
            <h3 ref={settingsRef} className="text-sm font-bold text-slate-800 mb-3 px-1">Pengaturan Aplikasi</h3>
            <div className="glass-card mb-6 overflow-hidden flex flex-col">
                <div onClick={() => setIsNotifEnabled(!isNotifEnabled)} className="flex items-center justify-between p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-500 rounded-xl"><Bell size={18} /></div>
                        <span className="text-sm font-medium text-slate-700">Notifikasi</span>
                    </div>
                    <div className={`w-10 h-5 rounded-full relative shadow-inner cursor-pointer transition-colors duration-300 ${isNotifEnabled ? 'bg-sage-500' : 'bg-slate-200'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow-sm transition-all duration-300 ${isNotifEnabled ? 'right-0.5' : 'left-0.5'}`}></div>
                    </div>
                </div>
                <div onClick={toggleDarkMode} className="flex items-center justify-between p-4 hover:bg-slate-50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 text-slate-600 rounded-xl"><Moon size={18} /></div>
                        <span className="text-sm font-medium text-slate-700">Mode Gelap</span>
                    </div>
                    <div className={`w-10 h-5 rounded-full relative shadow-inner cursor-pointer transition-colors duration-300 ${isDarkMode ? 'bg-sage-500' : 'bg-slate-200'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow-sm transition-all duration-300 ${isDarkMode ? 'right-0.5' : 'left-0.5'}`}></div>
                    </div>
                </div>
            </div>

            {/* General Settings */}
            <h3 className="text-sm font-bold text-slate-800 mb-3 px-1">Bantuan & Keamanan</h3>
            <div className="glass-card mb-8 overflow-hidden flex flex-col">
                <div onClick={() => alert('Fokus utama saat ini adalah manajemen UI. Menu ini akan dibawa pada rilis berikutnya!')} className="flex items-center justify-between p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-50 text-amber-500 rounded-xl"><Shield size={18} /></div>
                        <span className="text-sm font-medium text-slate-700">Keamanan Akun</span>
                    </div>
                    <ChevronRight size={18} className="text-slate-300" />
                </div>
                <div onClick={() => alert('Pusat Bantuan sedang dalam pengembangan.')} className="flex items-center justify-between p-4 hover:bg-slate-50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-50 text-teal-500 rounded-xl"><HelpCircle size={18} /></div>
                        <span className="text-sm font-medium text-slate-700">Pusat Bantuan</span>
                    </div>
                    <ChevronRight size={18} className="text-slate-300" />
                </div>
            </div>

            {/* Logout Button */}
            <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 py-4 rounded-2xl bg-white border-2 border-slate-100 text-rose-500 text-sm font-bold hover:bg-rose-50 hover:border-rose-100 transition-colors shadow-sm"
            >
                <LogOut size={18} />
                <span>Keluar dari Akun</span>
            </button>

            <ConfirmModal
                isOpen={showLeaveConfirm}
                onClose={() => setShowLeaveConfirm(false)}
                onConfirm={handleLeaveFamily}
                title="Keluar dari Grup?"
                message="Anda akan terlepas dari grup keluarga ini. Transaksi Anda akan menjadi data pribadi kembali."
                confirmText="Keluar"
                cancelText="Batal"
                variant="warning"
            />
        </div>
    );
};

export default Profile;
