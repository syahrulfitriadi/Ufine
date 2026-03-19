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
