import { describe, it, expect } from 'vitest';
import { parseColombianPhone, isValidEmail, WHATSAPP_TEMPLATES, suggestedTemplate, whatsappLink, looksLikeCompany } from './contact';

describe('parseColombianPhone', () => {
    it('celular de 10 dígitos → tel y WhatsApp con +57', () => {
        expect(parseColombianPhone('3164329531')).toEqual({ tel: '+573164329531', whatsapp: '573164329531', display: '316 432 9531' });
    });
    it('limpia espacios y acepta indicativo ya incluido', () => {
        expect(parseColombianPhone(' 3 0 1 5 3 8 4 0 4 2')?.whatsapp).toBe('573015384042');
        expect(parseColombianPhone('+57 310 814 3779')?.whatsapp).toBe('573108143779');
    });
    it('fijos: llamada sí, WhatsApp no', () => {
        expect(parseColombianPhone('6018672389')).toEqual({ tel: '+576018672389', whatsapp: null, display: '(601) 8672389' });
        expect(parseColombianPhone('8665892')).toEqual({ tel: '8665892', whatsapp: null, display: '8665892' });
    });
    it('números incompletos o vacíos no generan botón', () => {
        expect(parseColombianPhone('311200669')).toBeNull();   // 9 dígitos
        expect(parseColombianPhone('')).toBeNull();
        expect(parseColombianPhone(null)).toBeNull();
    });
});

describe('correo y plantillas', () => {
    it('valida correos', () => {
        expect(isValidEmail('drodriguezmunevar@gmail.com')).toBe(true);
        expect(isValidEmail('sin-arroba')).toBe(false);
        expect(isValidEmail(null)).toBe(false);
    });

    it('la plantilla usa nombre, vendedor, última compra y producto', () => {
        const ctx = { client_name: 'POLLOS SAVICOL S A S', contact_name: null, salesperson_name: 'Carla Cristina Castro', last_purchase_date: '2026-07-20', top_product: 'FOSMYCINA' };
        const text = WHATSAPP_TEMPLATES.find(t => t.key === 'SEGUIMIENTO')!.body(ctx);
        expect(text).toContain('Hola, buen día, soy Carla de GVM');   // empresa: sin "Hola POLLOS"
        expect(text).not.toContain('POLLOS');
        expect(text).toContain('20 de jul');
        expect(text).toContain('FOSMYCINA');
    });

    it('saluda por nombre a personas y a contactos', () => {
        const t = WHATSAPP_TEMPLATES.find(x => x.key === 'LIBRE')!;
        expect(t.body({ client_name: 'RODRIGUEZ PULIDO LUIS EDUARDO', salesperson_name: 'LUISA FERNANDA ROMERO' })).toBe('Hola Rodriguez, soy Luisa de GVM. ');
        expect(t.body({ client_name: 'AGROAVICOLA EL MANZANO S.A.S', contact_name: 'julián pérez', salesperson_name: 'Carla' })).toBe('Hola Julián, soy Carla de GVM. ');
        expect(looksLikeCompany('INVERSIONES TRIBILIN S.A.S')).toBe(true);
        expect(looksLikeCompany('ANA MILENA BENAVIDES GIL')).toBe(false);
    });

    it('sugiere la plantilla según la alerta y arma el enlace', () => {
        expect(suggestedTemplate('EN_CAIDA').key).toBe('RECUPERACION');
        expect(suggestedTemplate('INACTIVO').key).toBe('REACTIVACION');
        expect(suggestedTemplate(null).key).toBe('SEGUIMIENTO');
        expect(whatsappLink('573164329531', 'Hola ¿cómo va?')).toBe('https://wa.me/573164329531?text=Hola%20%C2%BFc%C3%B3mo%20va%3F');
    });
});
