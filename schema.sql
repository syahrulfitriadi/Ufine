-- Jalankan script SQL ini di SQL Editor dashboard Supabase Anda.

-- 1. Buat Tabel Transaksi
CREATE TABLE public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC NOT NULL,
    category TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Aktifkan Row Level Security (RLS)
-- Ini sangat penting agar user hanya bisa melihat & memodifikasi datanya sendiri
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 3. Buat Policies (Aturan Akses)
-- Policy: User bisa melihat transaksinya sendiri
CREATE POLICY "Users can view their own transactions" 
ON public.transactions FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: User bisa menambah transaksinya sendiri
CREATE POLICY "Users can insert their own transactions" 
ON public.transactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: User bisa menghapus transaksinya sendiri
CREATE POLICY "Users can delete their own transactions" 
ON public.transactions FOR DELETE 
USING (auth.uid() = user_id);

-- Policy: User bisa mengubah transaksinya sendiri (opsional untuk masa depan)
CREATE POLICY "Users can update their own transactions" 
ON public.transactions FOR UPDATE 
USING (auth.uid() = user_id);
