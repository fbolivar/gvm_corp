import { createClient } from '@/lib/supabase/client';
import { LoginCredentials, SignupCredentials } from '../types/index';

export const authService = {
    async signIn({ email, password }: LoginCredentials) {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    },

    async signUp({ email, password, fullName }: SignupCredentials) {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        });
        if (error) throw error;
        return data;
    },

    async signOut() {
        const supabase = createClient();
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    async getSession() {
        const supabase = createClient();
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return session;
    },
};
