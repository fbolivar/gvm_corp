'use client';

import { useEffect } from 'react';

export function PWARegister() {
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js', { scope: '/' })
                .then((reg) => console.info('[PWA] Service Worker registrado:', reg.scope))
                .catch((err) => console.warn('[PWA] Error al registrar SW:', err));
        }
    }, []);

    return null;
}
