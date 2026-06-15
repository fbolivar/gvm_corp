import { describe, it, expect } from 'vitest'
import {
    contractLabel,
    resolvePartyRow,
    resolveEmployeeName,
    formatDocNumber,
    getInitials,
    splitName,
    DEFAULT_CARGO,
    NO_NAME,
} from './carnetHelpers'

describe('contractLabel', () => {
    it('mapea claves en inglés (enum)', () => {
        expect(contractLabel('INDEFINITE')).toBe('Contrato Indefinido')
        expect(contractLabel('FREELANCE')).toBe('Prestación de Servicios')
    })

    it('mapea claves en español (valores reales en BD)', () => {
        // Auto-Blindaje: este era el bug — INDEFINIDO caía al fallback
        expect(contractLabel('INDEFINIDO')).toBe('Contrato Indefinido')
        expect(contractLabel('TEMPORAL')).toBe('Contrato Temporal')
        expect(contractLabel('APRENDIZ')).toBe('Aprendiz')
    })

    it('normaliza mayúsculas/minúsculas', () => {
        expect(contractLabel('indefinido')).toBe('Contrato Indefinido')
    })

    it('cae a DEFAULT_CARGO con tipo desconocido, null o vacío', () => {
        expect(contractLabel('CUALQUIERA')).toBe(DEFAULT_CARGO)
        expect(contractLabel(null)).toBe(DEFAULT_CARGO)
        expect(contractLabel(undefined)).toBe(DEFAULT_CARGO)
        expect(contractLabel('')).toBe(DEFAULT_CARGO)
    })
})

describe('resolvePartyRow', () => {
    it('devuelve el objeto cuando viene como objeto', () => {
        const p = { legal_name: 'ACME', doc_number: '900' }
        expect(resolvePartyRow(p)).toEqual(p)
    })

    it('devuelve el primer elemento cuando viene como array (quirk PostgREST)', () => {
        const p = { legal_name: 'ACME', doc_number: '900' }
        expect(resolvePartyRow([p])).toEqual(p)
    })

    it('devuelve null para null, undefined o array vacío', () => {
        expect(resolvePartyRow(null)).toBeNull()
        expect(resolvePartyRow(undefined)).toBeNull()
        expect(resolvePartyRow([])).toBeNull()
    })
})

describe('resolveEmployeeName', () => {
    it('prioriza el nombre del tercero (party)', () => {
        expect(resolveEmployeeName({ legal_name: 'LAURA VALENTINA' }, 'Otro Nombre')).toBe('LAURA VALENTINA')
    })

    it('usa profiles.full_name cuando no hay party', () => {
        // Auto-Blindaje: este era el bug — salía "Sin nombre" en vez del perfil
        expect(resolveEmployeeName(null, 'MARTIN BARRETO WILMAR FERNANDO')).toBe('MARTIN BARRETO WILMAR FERNANDO')
        expect(resolveEmployeeName({ legal_name: '' }, 'Fernando Bolivar')).toBe('Fernando Bolivar')
        expect(resolveEmployeeName({ legal_name: '   ' }, 'Fernando Bolivar')).toBe('Fernando Bolivar')
    })

    it('cae a "Sin nombre" cuando no hay ninguna fuente', () => {
        expect(resolveEmployeeName(null, null)).toBe(NO_NAME)
        expect(resolveEmployeeName(null, undefined)).toBe(NO_NAME)
        expect(resolveEmployeeName({ legal_name: '' }, '')).toBe(NO_NAME)
    })
})

describe('formatDocNumber', () => {
    it('agrega separador de miles', () => {
        expect(formatDocNumber('1039293456')).toBe('1.039.293.456')
        expect(formatDocNumber('900123')).toBe('900.123')
    })

    it('devuelve guion para vacío o null', () => {
        expect(formatDocNumber('')).toBe('—')
        expect(formatDocNumber(null)).toBe('—')
        expect(formatDocNumber(undefined)).toBe('—')
    })
})

describe('getInitials', () => {
    it('toma máximo 2 iniciales en mayúscula', () => {
        expect(getInitials('laura valentina bolivar')).toBe('LV')
        expect(getInitials('Fernando')).toBe('F')
    })

    it('tolera nombre vacío sin lanzar', () => {
        expect(getInitials('')).toBe('')
        expect(getInitials('   ')).toBe('')
    })
})

describe('splitName', () => {
    it('parte en dos líneas (2 + 2 palabras)', () => {
        expect(splitName('BOLIVAR ARBELAEZ LAURA VALENTINA')).toEqual({
            line1: 'BOLIVAR ARBELAEZ',
            line2: 'LAURA VALENTINA',
        })
    })

    it('una sola palabra deja line2 vacío', () => {
        expect(splitName('Fernando')).toEqual({ line1: 'Fernando', line2: '' })
    })

    it('tolera nombre vacío', () => {
        expect(splitName('')).toEqual({ line1: '', line2: '' })
    })
})
