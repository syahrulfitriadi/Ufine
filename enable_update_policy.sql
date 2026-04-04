-- =============================================
-- Enable UPDATE RLS Policy for Transactions
-- Hanya pemilik transaksi yang bisa mengedit
-- =============================================

-- Hapus policy lama jika ada (aman dijalankan ulang)
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;

-- Buat policy UPDATE: hanya user_id yang sama dengan auth.uid() yang boleh update
CREATE POLICY "Users can update own transactions" ON transactions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Verifikasi: jalankan query ini untuk memastikan policy terpasang
-- SELECT * FROM pg_policies WHERE tablename = 'transactions';
