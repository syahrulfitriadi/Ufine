-- Hapus policy SELECT yang lama
DROP POLICY IF EXISTS "Users can view their own family" ON public.families;

-- Buat policy baru: User bisa melihat keluarga yang id-nya ada di profil mereka 
-- ATAU ketika mereka baru saja membuatnya (bisa dilihat oleh authenticated user manapun untuk proses join/create)
CREATE POLICY "Users can view families" ON public.families FOR SELECT
USING (auth.uid() IS NOT NULL);
