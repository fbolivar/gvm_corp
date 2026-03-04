'use client';

import { useEffect } from 'react';

export function PWARegister() {
    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

        // En desarrollo, desregistrar SWs existentes para evitar cache stale
        if (process.env.NODE_ENV === 'development') {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                for (const reg of registrations) {
                    reg.unregister();
                    console.info('[PWA] SW desregistrado en dev mode');
                }
            }).catch(() => {});
            return;
        }

        // En producción, registrar normalmente
        navigator.serviceWorker
            .register('/sw.js', { scope: '/' })
            .then((reg) => console.info('[PWA] Service Worker registrado:', reg.scope))
            .catch((err) => console.warn('[PWA] Error al registrar SW:', err));
    }, []);

    return null;
}
