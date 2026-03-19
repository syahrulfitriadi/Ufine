import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getTransactions } from '../utils/storage';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

const TransactionContext = createContext({});

export const useTransactions = () => useContext(TransactionContext);

export const TransactionProvider = ({ children }) => {
    const { session } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastFetched, setLastFetched] = useState(null);
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type, duration }]);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const fetchTransactions = useCallback(async () => {
        if (!session) return;
        try {
            setIsLoading(true);
            const data = await getTransactions();
            setTransactions(data);
            setLastFetched(Date.now());
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setIsLoading(false);
        }
    }, [session]);

    // Initial fetch when session is available
    useEffect(() => {
        if (session) {
            fetchTransactions();
        }
    }, [session, fetchTransactions]);

    // Supabase Realtime subscription
    useEffect(() => {
        if (!session) return;

        const channel = supabase
            .channel('realtime-transactions')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'transactions'
            }, (payload) => {
                const newTx = payload.new;
                // Only show notification for transactions by OTHER users
                if (newTx.user_id !== session.user.id) {
                    // Refresh data to get the new transaction
                    fetchTransactions();
                    addToast(`Pasangan menambahkan transaksi baru.`, 'info');
                }
            })
            .on('postgres_changes', {
                event: 'DELETE',
                schema: 'public',
                table: 'transactions'
            }, (payload) => {
                const oldTx = payload.old;
                if (oldTx.user_id !== session.user.id) {
                    fetchTransactions();
                    addToast(`Pasangan menghapus sebuah transaksi.`, 'warning');
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session, fetchTransactions, addToast]);

    // Refresh function — call after add/delete transaction
    const refreshTransactions = useCallback(async () => {
        await fetchTransactions();
    }, [fetchTransactions]);

    // Optimistic remove — update local state immediately without re-fetching
    const removeTransaction = useCallback((id) => {
        setTransactions(prev => prev.filter(t => t.id !== id));
    }, []);

    const value = {
        transactions,
        isLoading,
        lastFetched,
        toasts,
        addToast,
        removeToast,
        refreshTransactions,
        removeTransaction,
    };

    return (
        <TransactionContext.Provider value={value}>
            {children}
        </TransactionContext.Provider>
    );
};
