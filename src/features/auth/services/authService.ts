import { createClient } from '@/lib/supabase/client';
import { LoginCredentials, SignupCredentials } from '../types/index';

export const authService = {
    /**
     * Login que acepta email corporativo O username:
     * - Si el identificador contiene '@' se usa tal cual como email.
     * - Si no, se resuelve vía RPC get_email_by_username → email real de Supabase Auth.
     * Esto permite a empleados sin correo corporativo entrar con usuario + clave,
     * y al super admin seguir entrando con su email de siempre.
     */
    async signIn({ email, password }: LoginCredentials) {
        const supabase = createClient();
        const identifier = (email || '').trim();

        let loginEmail = identifier;

        if (!identifier.includes('@')) {
            const { data: resolvedEmail, error: rpcError } = await supabase
                .rpc('get_email_by_username', { p_username: identifier });

            if (rpcError) {
                throw new Error(`Error resolviendo usuario: ${rpcError.message}`);
            }
            if (!resolvedEmail) {
                throw new Error('Usuario no encontrado');
            }
            loginEmail = resolvedEmail as string;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email: loginEmail,
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
