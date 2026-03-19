-- ============================================================
-- Script: Aktifkan CASCADE DELETE pada semua tabel user
-- Fungsi: Ketika user dihapus dari Supabase Auth,
--         semua data profiles & transactions miliknya
--         akan OTOMATIS ikut terhapus.
-- ============================================================

-- 1. Perbaiki foreign key pada tabel PROFILES
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- 2. Perbaiki foreign key pada tabel TRANSACTIONS
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id)
  ON DELETE CASCADE;
