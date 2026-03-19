-- 1. Buat Tabel Families (Keluarga)
CREATE TABLE IF NOT EXISTS public.families (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  join_code text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Buat Tabel Profiles (jika belum ada) untuk menyimpan profil pengguna dan relasi keluarga
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  display_name text,
  family_id uuid REFERENCES public.families(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Pastikan kolom baru tetap ada jika tabel profiles sebelumnya sudah ada
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES public.families(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;

-- (Opsional tapi penting) Trigger untuk membuat profil secara otomatis saat ada user register baru
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, new.raw_user_meta_data->>'username');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Pastikan user yang SUDAH TERDAFTAR sebelumnya di auth.users dibuatkan profilnya (Backfill)
INSERT INTO public.profiles (id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

-- 3. Update Tabel Transactions (Menambahkan referensi Keluarga)
-- Pastikan tabel transaksi sudah memiliki kolom family_id
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES public.families(id) ON DELETE CASCADE;

-- 4. Aktifkan RLS
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------
-- POLICIES UNTUK PROFILES
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
CREATE POLICY "Users can view profiles" ON public.profiles FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());


-- ---------------------------------------------------------
-- POLICIES UNTUK FAMILIES
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own family" ON public.families;
CREATE POLICY "Users can view their own family" ON public.families FOR SELECT
USING (id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can create a family" ON public.families;
CREATE POLICY "Users can create a family" ON public.families FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);


-- ---------------------------------------------------------
-- POLICIES UNTUK TRANSACTIONS
-- ---------------------------------------------------------
-- Hapus policy yang lama agar tidak bentrok
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can view their own or family transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update their own or family transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete their own or family transactions" ON public.transactions;

-- Buat policy baru yang mengizinkan akses ke data pribadi DAN data keluarga (jika ada)
CREATE POLICY "Users can view their own or family transactions"
ON public.transactions FOR SELECT
USING (
  user_id = auth.uid() 
  OR 
  (family_id IS NOT NULL AND family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid()))
);

CREATE POLICY "Users can insert their own transactions"
ON public.transactions FOR INSERT
WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY "Users can update their own or family transactions"
ON public.transactions FOR UPDATE
USING (
  user_id = auth.uid() 
  OR 
  (family_id IS NOT NULL AND family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid()))
);

CREATE POLICY "Users can delete their own or family transactions"
ON public.transactions FOR DELETE
USING (
  user_id = auth.uid() 
  OR 
  (family_id IS NOT NULL AND family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid()))
);

