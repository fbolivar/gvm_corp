/**
 * Traduce mensajes de error de Supabase Auth a español legible.
 * Si el error no se reconoce, devuelve el mensaje original.
 */
export function translateAuthError(rawMessage: string): string {
    const msg = rawMessage.toLowerCase();

    // Password breach / leaked password protection
    if (msg.includes('known to be weak') || msg.includes('easy to guess') || msg.includes('pwned')) {
        return 'Esta contraseña fue detectada en bases de datos de filtraciones públicas. Elige una distinta — no uses contraseñas que ya usaste en otros sitios.';
    }

    // Password requirements
    if (msg.includes('password should be at least') || msg.includes('password length')) {
        return 'La contraseña es muy corta. Debe tener al menos 6 caracteres (recomendado 12+).';
    }
    if (msg.includes('password should contain')) {
        return 'La contraseña no cumple los requisitos. Debe combinar letras, números y símbolos.';
    }

    // Same password
    if (msg.includes('new password should be different') || msg.includes('same as the old password')) {
        return 'La nueva contraseña debe ser distinta a la actual.';
    }

    // Invalid credentials
    if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
        return 'Email o contraseña incorrectos.';
    }

    // Rate limit
    if (msg.includes('rate limit') || msg.includes('too many requests')) {
        return 'Demasiados intentos. Espera unos minutos antes de volver a intentar.';
    }

    // Email not confirmed
    if (msg.includes('email not confirmed')) {
        return 'El email no ha sido confirmado. Revisa tu bandeja de entrada.';
    }

    // User already registered
    if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('user already exists')) {
        return 'Ya existe un usuario con ese email.';
    }

    // Network / generic
    if (msg.includes('network') || msg.includes('failed to fetch')) {
        return 'Error de conexión. Verifica tu internet e intenta de nuevo.';
    }

    // Fallback: regresa el original
    return rawMessage;
}
