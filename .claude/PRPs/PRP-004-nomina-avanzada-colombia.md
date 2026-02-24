# PRP-004: Nómina Avanzada Pro (Colombia Edition)

> **Estado**: ✅ COMPLETADO
> **Fecha**: 2026-02-18
> **Proyecto**: GVM Corp SaaS

---

## Objetivo

Transformar el módulo de nómina básico en una solución integral de **HCM (Human Capital Management)** adaptada a la normativa colombiana, automatizando desde el cumplimiento legal (PILA, Parafiscales) hasta la experiencia del empleado (Portal, Onboarding, Fintech).

## Por Qué

| Problema | Solución |
|----------|----------|
| Cálculo manual de seguridad social y parafiscales | Automatización basada en UVT y porcentajes de ley (Salud, Pensión, ARL, CCF). |
| Alta carga administrativa en certificados y desprendibles | Autoservicio (Portal del Empleado) con generación "On-the-fly". |
| Desconexión entre asistencia y pago de extras | Integración de control de tiempos (reloj digital) con motor de nómina. |
| Gestión informal de préstamos y anticipos | Módulo de Libranzas y "On-Demand Pay" con descuentos automáticos. |
| Falta de visibilidad estratégica (rotación/costos) | Simuladores de contratación y dashboards de analítica de RRHH. |

**Valor de negocio**: Reducción del 70% en tiempo de procesamiento de nómina, eliminación de errores en aportes legales y mejora del "Employee branding" mediante herramientas fintech.

## Qué

### Criterios de Éxito
- [x] Liquidación automática de Seguridad Social y Parafiscales (Exportable a PILA).
- [x] Generación de archivos planos de dispersión para bancos (Bancolombia/Davivienda).
- [x] Portal del empleado funcional para descarga de documentos y solicitudes.
- [x] Simulador de costos laborales preciso (+/- 0.1% de error).

### Comportamiento Esperado
El administrador configura los parámetros anuales (UVT, Salario Mínimo). El sistema calcula automáticamente la nómina mensual integrando: Horas extras (asistencia), Descuentos (préstamos), y Beneficios (auxilios). Al finalizar, genera el archivo para el banco y habilita los desprendibles en el portal del empleado.

---

## Contexto

### Referencias
- `src/features/payroll/` - Base actual de empleados y liquidación.
- `src/features/accounting/` - Para integración de asientos contables de nómina.
- [Normativa DIAN/PILA] - Tasas vigentes 2026.

### Arquitectura Propuesta (HCM Extension)
```
src/features/payroll/
├── components/
│   ├── advanced/          # Préstamos, Beneficios, Asistencia
│   ├── portal/            # Componentes del Employee View
│   └── simulator/         # Herramientas de cálculo
├── hooks/
│   ├── useAttendance.ts
│   └── useLoans.ts
├── services/
│   ├── pilaService.ts     # Lógica de Seguridad Social
│   ├── bankService.ts     # Archivos batch bancarios
│   └── certificateService.ts
└── store/
    └── portalStore.ts
```

### Modelo de Datos (Nuevas Tablas)
```sql
-- Gestión de Préstamos
CREATE TABLE payroll_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES payroll_employees(id),
  total_amount DECIMAL(15,2),
  remaining_amount DECIMAL(15,2),
  installment_amount DECIMAL(15,2),
  state TEXT DEFAULT 'ACTIVE', -- ACTIVE, PAID, CANCELLED
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Control de Asistencia
CREATE TABLE payroll_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES payroll_employees(id),
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status TEXT, -- ON_TIME, LATE, ABSENT
  overtime_hours DECIMAL(5,2) DEFAULT 0
);

-- Beneficios y Auxilios
CREATE TABLE payroll_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES payroll_employees(id),
  type TEXT, -- FOOD, GAS, TELEWORK
  amount DECIMAL(15,2),
  is_salary_based BOOLEAN DEFAULT false,
  recurrence TEXT DEFAULT 'MONTHLY'
);

-- RLS habilitado para todas las tablas
```

---

## Blueprint (Assembly Line)

### Fase 1: Motor Legal y Seguridad Social (Colombia) ✅
**Objetivo**: Automatizar cálculos de Salud, Pensión, ARL, Caja Compensación e ICBF/SENA.
**Validación**: Generación de reporte de aportes que coincida con la planilla de liquidación legal. ✅

### Fase 2: Módulo Financiero (Préstamos + Beneficios + Anticipos) ✅
**Objetivo**: Controlar deudas de empleados y auxilios extralegales con impacto tributario.
**Validación**: Los descuentos de préstamos se reflejan automáticamente en la liquidación de nómina. ✅

### Fase 3: Portal del Empleado y Onboarding ✅
**Objetivo**: Dashboard para empleados (desprendibles, certificados, carga de documentos).
**Validación**: Un empleado puede entrar y descargar su certificado laboral sin intervención del admin. ✅

### Fase 4: Inteligencia de Negocio y Simulación ✅
**Objetivo**: Herramientas de "What-if" y alertas de anomalías en pagos.
**Validación**: Simulador que calcula liquidación por renuncia con fecha futura exacta. ✅

### Fase 5: Integración Bancaria y Cierre ✅
**Objetivo**: Generación unificada de archivo de pago para bancos (Excel/CSV para Bancolombia/Davivienda).
**Validación**: Descarga de archivo plano que cumple con la estructura de dispersión masiva. ✅

---

## 🧠 Aprendizajes (Self-Annealing)

### 2026-02-18: Estructura de PILA
- **Nota**: El archivo plano de la PILA tiene posiciones fijas. No usar delimitadores, usar padding de espacios/ceros.

---

## Gotchas
- [ ] La normativa de horas extra en Colombia cambió recientemente (Reducción Jornada Laboral a 42h gradual).
- [ ] El redondeo en seguridad social debe ser al peso más cercano (o según especificación PILA).
- [ ] Manejo de múltiples contratos para un mismo empleado (Historial).

## Anti-Patrones
- NO calcular impuestos directamente en componentes UI; usar `payrollService`.
- NO almacenar documentos sensibles (cédulas) sin encriptación o acceso restringido vía RLS.

---

*PRP completado exitosamente. Todos los módulos operativos.*
