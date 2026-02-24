# PRP: Modernización del Módulo de Tesorería (Fábrica V3)

> **Estado**: 📝 En Revisión (Auto-Propuesta)
> **Versión**: 1.0
> **Objetivo**: Elevar el módulo de Tesorería al estándar visual "Cybertruck Industrial", priorizando la claridad en la liquidez y la eficiencia en la conciliación.

---

## 🎨 Estética: "Liquidez de Alta Precisión"

Tesorería no es solo dinero; es la **energía vital** de la fábrica. El diseño debe sentirse seguro, preciso y robusto.

- **Header**: Ultra-impactante con visualización del "Capital de Trabajo" como el KPI maestro.
- **Tarjetas de Cuenta**: Diseño estilo "Pod Industrial" con información técnica (números de cuenta, bancos) y visualización clara del disponible.
- **Tablas de Movimientos**: Filas de alta densidad con tipografía mono para montos, facilitando la auditoría visual rápida.
- **Micro-interacciones**: Efectos de rotación en iconos de banco al hacer hover, barras de progreso para metas de recaudo.

---

## 🏗️ Fases de Ejecución

### Fase 1: Terminal Maestro (Dashboard)
- **Archivo**: `src/app/(main)/treasury/page.tsx`
- **Acción**: Refactorizar para incluir el Header V3, transformar las tarjetas de liquidez en elementos de alto impacto y modernizar la tabla de movimientos recientes.
- **Key Feature**: "Radar de Liquidez" (Visualización clara de ingresos vs egresos proyectados).

### Fase 2: Control de Cartera (Cuentas por Cobrar/Pagar)
- **Archivo**: `src/features/treasury/components/CarteraList.tsx`
- **Acción**: Modernizar la visualización de la cartera con badges de morosidad y progreso de recaudo.
- **Estilo**: Tabla industrial ultra-redondeada.

### Fase 3: Protocolo de Registro (Formularios)
- **Archivo**: `src/features/treasury/components/TreasuryTransactionForm.tsx`
- **Acción**: Mejorar la UI del formulario de registro de movimientos (Recibos de Caja, Comprobantes de Egreso).
- **Enfoque**: User experience sin fricción, validación visual instantánea.

---

## 🔒 Seguridad y Auditoría
- Todos los movimientos deben mostrar claramente su estado de conciliación.
- Badges de "Auditado" para transacciones confirmadas.
- RLS activo en todas las consultas de saldos.

---

## 🚀 Próximos Pasos
1. Ejecutar Fase 1: Dashboard Maestro.
2. Ejecutar Fase 2: Cartera Industrial.
3. Ejecutar Fase 3: Formularios de Alta Fricción.
