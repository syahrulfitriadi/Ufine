-- Script ini akan memperbaiki riwayat transaksi lama Anda yang belum terkait ke Keluarga
-- dan memperbaruinya agar memiliki "family_id" yang sama dengan profil terbaru Anda.
UPDATE public.transactions t
SET family_id = p.family_id
FROM public.profiles p
WHERE t.user_id = p.id 
  AND t.family_id IS NULL 
  AND p.family_id IS NOT NULL;
