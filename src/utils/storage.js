import { supabase } from '../lib/supabaseClient';

export const TABLE_NAME = 'transactions';

// Get current user ID
const getCurrentUserId = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id;
};

// Get user profile (including family info)
export const getUserProfile = async () => {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const { data, error } = await supabase
        .from('profiles')
        .select(`
            id, 
            display_name,
            family_id,
            families ( name, join_code )
        `)
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching profile:', error);
        return null;
    }
    return data;
};

// Get all transactions (RLS will automatically filter to user's OR family's data)
export const getTransactions = async () => {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    // Fetch transactions
    const { data: txData, error: txError } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .order('date', { ascending: false });

    if (txError) {
        console.error('Error fetching transactions:', txError);
        return [];
    }

    // Get unique user_ids from fetched transactions
    const uniqueUserIds = [...new Set((txData || []).map(t => t.user_id))];

    // Fetch matching profiles
    let profilesData = [];
    if (uniqueUserIds.length > 0) {
        const { data: profData, error: profError } = await supabase
            .from('profiles')
            .select('id, display_name')
            .in('id', uniqueUserIds);

        if (!profError && profData) {
            profilesData = profData;
        }
    }

    // Build map for quick lookup
    const profileMap = {};
    profilesData.forEach(p => {
        profileMap[p.id] = p.display_name;
    });

    // Map the shape
    return (txData || []).map(t => ({
        ...t,
        creator_name: profileMap[t.user_id] || 'Tidak Diketahui'
    }));
};

// Add new transaction
export const addTransaction = async (transaction) => {
    const profile = await getUserProfile();
    if (!profile) throw new Error('User profile not found');

    const newTransaction = {
        ...transaction,
        user_id: profile.id,
        family_id: profile.family_id // If null, it just saves as null (Personal mode)
    };

    const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert([newTransaction])
        .select()
        .single();

    if (error) {
        console.error('Error adding transaction:', error);
        throw error;
    }

    return data;
};

// Delete transaction
export const deleteTransaction = async (id) => {
    // Note: RLS handles security. We just try to delete the ID.
    // If it belongs to their family/them, RLS allows it.
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting transaction:', error);
        return false;
    }
    return true;
};

// Update transaction (only own transactions via RLS)
export const updateTransaction = async (id, updates) => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from(TABLE_NAME)
        .update({
            type: updates.type,
            amount: updates.amount,
            category: updates.category,
            date: updates.date,
            note: updates.note,
        })
        .eq('id', id)
        .eq('user_id', userId) // extra safety: only own transactions
        .select()
        .single();

    if (error) {
        console.error('Error updating transaction:', error);
        throw error;
    }
    return data;
};

// Get avatar URL from profiles
export const getAvatarUrl = async () => {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching avatar:', error);
        return null;
    }
    return data?.avatar_url || null;
};

// Update avatar URL in profiles (base64 string)
export const updateAvatarUrl = async (base64String) => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: base64String })
        .eq('id', userId);

    if (error) {
        console.error('Error updating avatar:', error);
        throw error;
    }
    return true;
};

// Compress image client-side: resize to max 200x200, JPEG 60% quality
export const compressImage = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 200;
                let width = img.width;
                let height = img.height;

                // Scale down proportionally
                if (width > height) {
                    if (width > MAX_SIZE) {
                        height = Math.round((height * MAX_SIZE) / width);
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width = Math.round((width * MAX_SIZE) / height);
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to JPEG at 60% quality
                const base64 = canvas.toDataURL('image/jpeg', 0.6);
                resolve(base64);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

