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

        // Use unique channel name to force re-subscribe on session changes
        const channelName = `realtime-tx-${session.user.id}-${Date.now()}`;
        const channel = supabase
            .channel(channelName)
            .on('postgres_changes', {
                event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
                schema: 'public',
                table: 'transactions'
            }, (payload) => {
                const relevantTx = payload.new || payload.old;
                const isOwnTransaction = relevantTx?.user_id === session.user.id;
                
                // Always refresh data to stay in sync
                fetchTransactions();
                
                // Show notification only for partner's actions
                if (!isOwnTransaction) {
                    const messages = {
                        INSERT: 'Pasangan menambahkan transaksi baru.',
                        UPDATE: 'Pasangan mengedit sebuah transaksi.',
                        DELETE: 'Pasangan menghapus sebuah transaksi.'
                    };
                    const types = { INSERT: 'info', UPDATE: 'info', DELETE: 'warning' };
                    addToast(messages[payload.eventType] || 'Data diperbarui.', types[payload.eventType] || 'info');
                }
            })
            .subscribe();

        // Refetch when app regains focus (handles PWA background resume)
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                fetchTransactions();
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            supabase.removeChannel(channel);
            document.removeEventListener('visibilitychange', handleVisibility);
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
