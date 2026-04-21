import { z } from 'zod';

// Acepta username o email. La validación de formato email se hace solo si contiene '@'.
export const loginSchema = z.object({
    email: z.string().trim().min(3, 'Ingresa tu usuario o email').refine((v) => {
        if (!v.includes('@')) return /^[a-zA-Z0-9._-]+$/.test(v);
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    }, 'Usuario o email inválido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const signupSchema = loginSchema.extend({
    fullName: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
    confirmPassword: z.string().min(6),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
});

export type LoginCredentials = z.infer<typeof loginSchema>;
export type SignupCredentials = z.infer<typeof signupSchema>;

export interface AuthUser {
    id: string;
    email?: string;
    fullName?: string;
    avatarUrl?: string;
}
