# PRP-007: Evaluación de Desempeño (Período de Prueba + Anual)

> **Estado**: EN PROGRESO — Fase 1 completa (criterios en BD). Fase 2 implementada y verificada en local (typecheck, 318 tests, schema audit, RLS probado); pendiente revisión de seguridad y despliegue
> **Fecha**: 2026-10-06
> **Proyecto**: GVM Corp ERP

---

## Objetivo

Dos evaluaciones de desempeño distintas en propósito pero sobre la misma base, con histórico completo e inmutable:

1. **Período de prueba**: a los ~2 meses de contratado un empleado, evaluar si cumple las condiciones y competencias del cargo para el que fue contratado.
2. **Anual (campaña)**: evaluación integral (competencias, cumplimiento de objetivos, aspectos del cargo) que alimenta una **recomendación** de incremento salarial, sujeta a aprobación separada.

## Por Qué

| Problema | Solución |
|----------|----------|
| No hay forma sistemática de evaluar si un nuevo empleado cumple su cargo antes de que venza el período de prueba. | Alerta automática con margen + formulario por criterios del cargo + resultado cumple / no cumple. |
| Los incrementos salariales no tienen soporte documentado ni presupuesto consolidado. | Campaña anual con ventana fija (diciembre) que consolida resultados y recomendaciones para presupuestar. |
| Sin histórico, no se sabe cómo le fue a una persona en evaluaciones anteriores. | Histórico append-only: cada evaluación es un registro nuevo; nada se sobrescribe. |

**Valor de negocio**: en Colombia, pasado el período de prueba, terminar un contrato exige justa causa — la decisión debe tomarse a tiempo. La campaña anual da a RRHH un solo momento de consolidación para el presupuesto de incrementos.

---

## Decisiones confirmadas (2026-10-06)

| # | Tema | Decisión |
|---|------|----------|
| 1 | ¿Quién evalúa? | Selección manual al crear la evaluación, limitada a personas autorizadas para evaluar. **Período de prueba**: un evaluador responsable específico. **Anual**: puede haber varios evaluadores, cada uno con un **peso de relevancia** en la calificación final. El modelo queda preparado para agregar jefe directo / estructura de reporte después sin rediseñar. |
| 2 | Criterios por cargo | Se definen **por cargo (rol)** y son reutilizables para todas las personas en ese cargo. Primero se propone una versión inicial para revisión y aprobación (Apéndice A); después, un **editor para RRHH** para crear/modificar criterios. Los dos tipos se diferencian: período de prueba enfocado en condiciones y competencias del cargo de contratación; anual en desempeño integral, objetivos y aspectos del cargo. |
| 3 | Cadencia anual | **Campaña** con ventana fija para toda la empresa: apertura y cierre en **diciembre**. Consolida resultados y presupuesto de incrementos. |
| 4 | Incremento salarial | La evaluación **no modifica el salario**. Genera una recomendación (% o valor). Flujo: evaluación → resultado → recomendación → revisión/aprobación → autorización → actualización del salario. **Quien evalúa no puede cambiar el salario desde el módulo de evaluación.** |
| 5 | Portal del empleado | El empleado consulta **su propia** evaluación desde su portal: resultado final, criterios evaluados, fortalezas, aspectos por mejorar, comentarios del evaluador; puede agregar una observación y dejar constancia de que conoció el resultado. **Solo cuando todos los evaluadores hayan terminado.** No puede modificar calificaciones ni respuestas del evaluador. No ve evaluaciones de otros ni información salarial o de aprobación interna. Firma formal: etapa posterior. |

### Requisitos adicionales
- **Histórico inmutable**: cada evaluación (período de prueba o anual) se guarda con evaluador(es), fecha, calificaciones, comentarios, resultado y recomendación de incremento. Una nueva evaluación crea un registro nuevo; **nunca se sobrescribe** una anterior. Correcciones posteriores quedan como registro de versión o auditoría, no reemplazo.

---

## Qué

### Criterios de Éxito
- [ ] Alerta automática ~15 días antes del vencimiento de los 2 meses de período de prueba, sin duplicarse.
- [ ] Evaluación de período de prueba con un evaluador responsable seleccionado y resultado cumple / no cumple.
- [ ] Campaña anual abierta en diciembre; por empleado, uno o más evaluadores con peso; calificación final ponderada.
- [ ] Recomendación de incremento generada, sin tocar `employees.salary`.
- [ ] Aprobación y aplicación del incremento como proceso separado, ejecutado por rol autorizado distinto del evaluador.
- [ ] Empleado ve solo su evaluación, solo tras cierre de evaluadores, en modo lectura (salvo su observación).
- [ ] Histórico completo y no sobrescribible por empleado.
- [ ] Criterios por cargo definidos, aprobados, y editables por RRHH.

### Comportamiento Esperado

**Período de prueba**: el sistema detecta empleados con ~45 días desde `start_date` y genera una alerta (`smartAlertService`, `alert_key = PROBATION_EVAL:<employee_id>`). Quien tenga permiso selecciona al evaluador responsable, completa los criterios del cargo, y registra cumple / no cumple antes de los 60 días. El resultado queda en el histórico del empleado.

**Anual**: RRHH abre la campaña en diciembre. Para cada empleado se asignan evaluadores con peso. Cada evaluador califica criterios del cargo y objetivos. El sistema calcula la calificación final ponderada y sugiere una recomendación. Cuando todos los evaluadores terminan, la evaluación pasa a "cerrada" y queda visible para el empleado en su portal. La recomendación entra a un flujo de aprobación; solo al autorizarla se aplica el cambio al salario, por una acción separada con su propia confirmación y auditoría.

---

## Contexto

### Referencias de código (patrones a seguir)
- `src/features/training/` — catálogo + registro por empleado con `scheduled_date`, `status`, `score`. Mismo esquema conceptual.
- `src/features/notifications/services/smartAlertService.ts` — alertas con `alert_key` estable (regla de Aprendizajes 2026-09-23 en `CLAUDE.md`).
- `src/features/support/utils/surveyScoring.ts` — ponderación por secciones; útil para la calificación ponderada por evaluador.
- `employees.start_date`, `employees.contract_type` (`src/features/payroll/types/index.ts`) — base del cálculo del período de prueba.
- Protección de salarios: `project_payroll_salary_rls.md` — la pantalla de aprobación de incrementos debe respetar esa RLS.
- Gobernanza: bajo el módulo `payroll` (como `training`/`academy`); permisos finos vía `can_admin` / `team_admins`, no un módulo nuevo.
- Auditoría: `audit_log` con actor real (no el service role). Cualquier cambio de salario debe quedar auditado con quien lo autorizó.

### Arquitectura Propuesta (Feature-First)

```
src/features/performance/
├── components/
│   ├── ProbationEvaluationForm.tsx
│   ├── AnnualCampaignPanel.tsx        # campaña, evaluadores, estado
│   ├── EvaluatorAssignment.tsx        # asignar evaluadores con peso
│   ├── EvaluationResultCard.tsx       # vista empleado (portal)
│   ├── SalaryRecommendationReview.tsx # aprobación (separada)
│   ├── CriteriaEditor.tsx             # fase posterior
├── services/
│   ├── performanceService.ts
│   ├── performanceScoring.ts          # ponderación pura + tests
│   └── probationAlertService.ts
├── actions/                           # Server Actions, separadas por flujo
├── types/index.ts
```

Rutas: `/payroll/performance` (tabs: Período de prueba | Anual), `/payroll/performance/[id]`, y una sección nueva en `/my-payroll` para el resultado del empleado.

### Modelo de Datos Propuesto

Principios: **append-only** (no `UPDATE` sobre evaluaciones cerradas; correcciones = registro nuevo enlazado), evaluador como tabla aparte para soportar varios con peso y para dejar la puerta abierta a jerarquía futura, y el resultado visible al empleado solo tras cierre.

```sql
-- Criterios por cargo (reutilizables)
CREATE TABLE performance_criteria (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role_id     uuid REFERENCES app_roles(id),           -- NULL = transversal (todos los cargos)
    eval_type   text NOT NULL CHECK (eval_type IN ('PROBATION', 'ANNUAL')),
    kind        text NOT NULL CHECK (kind IN ('COMPETENCY', 'JOB_CONDITION', 'OBJECTIVE')),
    criterion   text NOT NULL,
    weight      numeric NOT NULL DEFAULT 1,
    sort_order  int NOT NULL DEFAULT 0,
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- Campaña anual (ventana fija)
CREATE TABLE performance_campaigns (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name         text NOT NULL,                 -- "Evaluación Anual 2026"
    opens_on     date NOT NULL,
    closes_on    date NOT NULL,
    status       text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'OPEN', 'CLOSED')),
    created_at   timestamptz NOT NULL DEFAULT now(),
    CHECK (closes_on >= opens_on)
);

-- Evaluación individual (una por empleado por evento: período de prueba o campaña)
CREATE TABLE performance_evaluations (
    id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id                     uuid NOT NULL REFERENCES employees(id),
    eval_type                       text NOT NULL CHECK (eval_type IN ('PROBATION', 'ANNUAL')),
    campaign_id                     uuid REFERENCES performance_campaigns(id),  -- NULL en período de prueba
    role_id_snapshot                uuid REFERENCES app_roles(id),              -- cargo al momento de evaluar
    status                          text NOT NULL DEFAULT 'PENDING'
                                        CHECK (status IN ('PENDING', 'IN_PROGRESS', 'CLOSED')),
    due_date                        date NOT NULL,
    closed_at                       timestamptz,
    final_score                     numeric,                                    -- ponderado por evaluadores
    probation_outcome               text CHECK (probation_outcome IN ('MEETS', 'DOES_NOT_MEET')),
    salary_recommendation_pct       numeric,
    salary_recommendation_amount    numeric,
    supersedes_id                   uuid REFERENCES performance_evaluations(id), -- registro que reemplaza lógicamente a otro
    created_by                      uuid REFERENCES profiles(id),
    created_at                      timestamptz NOT NULL DEFAULT now(),
    CHECK (eval_type <> 'PROBATION' OR campaign_id IS NULL)
);

-- Evaluadores de cada evaluación, con peso (período de prueba: exactamente uno)
CREATE TABLE performance_evaluators (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id   uuid NOT NULL REFERENCES performance_evaluations(id) ON DELETE CASCADE,
    evaluator_id    uuid NOT NULL REFERENCES profiles(id),
    weight          numeric NOT NULL DEFAULT 1 CHECK (weight > 0),
    status          text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'DONE')),
    submitted_at    timestamptz,
    UNIQUE (evaluation_id, evaluator_id)
);

-- Calificación por criterio, por evaluador
CREATE TABLE performance_answers (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id   uuid NOT NULL REFERENCES performance_evaluations(id) ON DELETE CASCADE,
    evaluator_id    uuid NOT NULL REFERENCES profiles(id),
    criterion_id    uuid NOT NULL REFERENCES performance_criteria(id),
    score           numeric NOT NULL CHECK (score BETWEEN 1 AND 5),
    comment         text,
    strengths       text,
    improvements    text,
    UNIQUE (evaluation_id, evaluator_id, criterion_id)
);

-- Observación del empleado (no modifica calificaciones)
CREATE TABLE performance_employee_acks (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id   uuid NOT NULL REFERENCES performance_evaluations(id) ON DELETE CASCADE,
    employee_id     uuid NOT NULL REFERENCES employees(id),
    observation     text,
    acknowledged_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (evaluation_id)
);

-- Aprobación de incremento (separada de la evaluación)
CREATE TABLE salary_increase_approvals (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    evaluation_id   uuid NOT NULL REFERENCES performance_evaluations(id),
    employee_id     uuid NOT NULL REFERENCES employees(id),
    previous_salary numeric NOT NULL,
    new_salary      numeric,
    decision        text NOT NULL CHECK (decision IN ('PENDING', 'APPROVED', 'REJECTED', 'APPLIED')),
    decided_by      uuid REFERENCES profiles(id),
    decided_at      timestamptz,
    applied_at      timestamptz
);
-- Segregación evaluador ≠ aprobador: se valida en el servicio (un CHECK no puede consultar performance_evaluators).
```

**RLS y reglas de acceso**:
- `performance_evaluations`, `performance_answers`, `performance_evaluators`: lectura y escritura por rol con permiso `payroll` (y evaluadores asignados solo sobre sus propias calificaciones). Ningún `UPDATE` sobre una evaluación `CLOSED`.
- Empleado: `SELECT` solo sobre sus evaluaciones con `status = 'CLOSED'`, mediante políticas que cruzan `employees.user_id = auth.uid()`. Nunca ve `salary_increase_approvals` ni calificaciones de otros evaluadores que no le correspondan (ver Gotchas).
- `salary_increase_approvals`: solo roles con permiso explícito de aprobar salarios; el evaluador **no** puede aprobar su propia evaluación. Aplicar el cambio a `employees.salary` ocurre en una acción separada con guardas en el servicio, no en un trigger.
- Auditoría de cambios en `employees.salary` y de decisiones de aprobación (`fn_audit_log` con actor real).

**Pendiente de diseño**: `supersedes_id` modela correcciones como registro nuevo; si se quiere versionado más fino (historial por evaluador), se agrega después.

---

## Blueprint (Assembly Line)

### Fase 1: Criterios por cargo (aprobación primero)
**Objetivo**: revisar y aprobar el Apéndice A con RRHH; cargar los criterios aprobados en `performance_criteria`.
**Validación**: RRHH aprueba la estructura por cargo. Sin esto no se construye lo demás.

### Fase 2: Período de prueba
**Objetivo**: alerta con `alert_key` estable, selección de evaluador responsable, formulario por criterios del cargo, resultado MEETS / DOES_NOT_MEET, histórico.
**Validación**: empleado de prueba con `start_date` hace 45 días genera una sola alerta; evaluación completa y registrada; no se puede editar una vez cerrada.

### Fase 3: Campaña anual y evaluadores con peso
**Objetivo**: crear campaña (diciembre), asignar evaluadores con peso, calificar criterios y objetivos, calcular calificación final ponderada (`performanceScoring.ts` con tests), generar recomendación.
**Validación**: campaña de prueba con 2 evaluadores de pesos distintos produce la calificación ponderada esperada.

### Fase 4: Portal del empleado
**Objetivo**: vista de resultado en `/my-payroll` solo para evaluaciones cerradas; observación del empleado; sin edición de calificaciones.
**Validación**: un empleado ve su resultado, no ve el de otro, no ve salarios ni aprobaciones; con un evaluador pendiente, no aparece el resultado.

### Fase 5: Aprobación y aplicación de incremento
**Objetivo**: flujo de aprobación separado, segregación (evaluador ≠ aprobador), acción explícita que actualiza `employees.salary`, auditoría.
**Validación**: el cambio queda en `audit_log` con actor real; el evaluador no puede aprobar; un rol sin permiso de salarios no ve ni ejecuta la aplicación.

### Fase 6: Editor de criterios para RRHH
**Objetivo**: pantalla para crear/editar criterios por cargo sin tocar código.
**Validación**: RRHH modifica un criterio y la siguiente evaluación lo usa; las evaluaciones cerradas conservan el texto original.

### Fase 7: Validación final
- [ ] `npm run deploy` (preflight completo)
- [ ] `security-reviewer` sobre RLS del portal y de `salary_increase_approvals` antes de desplegar
- [ ] Prueba end-to-end con un empleado real en período de prueba y otro en campaña anual

---

## Gotchas

- [ ] **Sin jerarquía jefe↔empleado**: el evaluador se elige manualmente; cuando se agregue `employees.supervisor_id` será un cambio aparte (los datos migrados de WorldOffice no lo traen).
- [ ] **Publicación al empleado solo al cierre de todos los evaluadores**: el resultado no debe filtrarse parcialmente. La regla va en RLS/servicio, no solo en la UI.
- [ ] **Calificaciones de otros evaluadores**: el empleado nunca debe ver la fila de un evaluador por criterio si la política de RRHH es anonimizar; **decisión pendiente**: ¿el empleado ve quién lo evaluó o solo el resultado consolidado y comentarios?
- [ ] **Salario protegido por RLS**: la pantalla de aprobación de incrementos no debe mostrar salarios a roles sin permiso (`project_payroll_salary_rls.md`).
- [ ] **Plazo legal del período de prueba** (Colombia, ~2 meses): alerta a ~45 días; la decisión debe quedar registrada antes del día 60.
- [ ] **Alertas duplicadas**: `alert_key` estable desde el día uno (`PROBATION_EVAL:<employee_id>`).
- [ ] **Append-only**: ninguna política `UPDATE` sobre evaluaciones `CLOSED`; el "reemplazo" es un registro nuevo con `supersedes_id`.

## Anti-Patrones
- NO construir jerarquía organizacional en esta fase.
- NO aplicar el incremento salarial desde el formulario de evaluación.
- NO permitir que el evaluador apruebe su propio incremento.
- NO inventar criterios por cargo sin validación de RRHH (Apéndice A es propuesta).

---

## Apéndice A — Propuesta inicial de criterios por cargo (para revisión de RRHH)

Cargos con personal asignado hoy (28 roles en total; los demás quedan para la siguiente ronda). Cada criterio se califica de 1 a 5. **Tipos**: C = competencia transversal, J = condición del cargo (período de prueba), O = objetivo (anual).

**Competencias transversales (aplican a todos, ambos tipos)**: puntualidad y asistencia · trabajo en equipo · comunicación · cumplimiento de procesos y registros · manejo de la información y confidencialidad · actitud frente al cambio.

| Cargo | Usuarios | Condiciones del cargo (J) | Objetivos sugeridos (O) |
|-------|---------:|---------------------------|--------------------------|
| ADMINISTRADOR BODEGA | 5 | Registra entradas/salidas sin diferencias · Ejecuta conteos y reporta novedades · Cumple normas de manejo de producto | Exactitud de inventario físico vs. sistema · Tiempo de despacho |
| ASISTENTE LOGISTICO | 3 | Programa despachos según ruta · Confirma entregas en el sistema · Gestiona documentos de transporte | Cumplimiento de entregas a tiempo · Errores de documentación |
| AUXILIAR DE LOGISTICA | 6 | Prepara pedidos sin errores de referencia/cantidad · Cumple protocolo de empaque · Reporta faltantes al día | Pedidos preparados sin error · Productividad diaria |
| GESTOR LOGISTICO | 4 | Planea rutas y despachos · Controla costos de transporte · Coordina con clientes y conductores | Costo de transporte por despacho · Nivel de servicio |
| REPRESENTANTE COMERCIAL | 4 | Registra visitas y gestiona su cartera en CRM · Presenta cotizaciones en tiempos acordados · Cumple cuota de ventas | Cumplimiento de cuota · Cartera activa visitada · Recaudo oportuno |
| ASISTENTE COMERCIAL | 2 | Atiende solicitudes de clientes en tiempo · Mantiene datos de clientes actualizados · Gestiona pedidos sin errores | Tiempo de respuesta · Pedidos sin reproceso |
| ASISTENTE DE GERENCIA VENTAS | 1 | Organiza agenda y reuniones de ventas · Prepara informes de gestión · Hace seguimiento de compromisos | Informes entregados a tiempo · Compromisos cerrados |
| AUXILIAR CONTABLE | 2 | Registra documentos con soporte completo · Realiza conciliaciones en plazo · Cumple cierres mensuales | Conciliaciones al día · Errores de registro |
| AUXILIAR DE FACTURACION | 1 | Emite documentos electrónicos sin rechazo · Verifica datos del cliente antes de facturar | Documentos aceptados a la primera · Tiempo de facturación |
| CONTADOR GENERAL | 1 | Estados financieros en plazo · Cumplimiento tributario · Respuesta a requerimientos | Cierres en plazo · Hallazgos de auditoría |
| GESTOR DE TESORERIA Y CARTERA | 1 | Conciliación bancaria al día · Gestión de cartera vencida · Proyección de flujo de caja | Recaudo vs. meta · Cartera vencida reducida |
| ASISTENTE ADMINISTRATIVO | 1 | Gestiona documentación y archivo · Atiende requerimientos internos · Apoya nómina y RRHH en plazos | Trámites resueltos a tiempo |
| ASISTENTE TECNICO | 1 | Atiende soporte de campo con registro de visita · Cumple protocolos de seguridad · Documenta servicios | Servicios cerrados a tiempo · Reincidencias |
| CONDUCTOR | 1 | Cumple rutas y tiempos · Mantiene vehículo y documentos al día · Confirma entregas con soporte | Entregas a tiempo · Cero incidentes de tránsito |
| COORDINADOR DE ALMACEN | 1 | Supervisa recepción y despacho · Controla inventario y ubicaciones · Lidera al equipo de bodega | Exactitud de inventario · Cumplimiento de operación |
| COORDINADORA DE CALIDAD Y GESTION HUMANA | 1 | Gestiona hallazgos de calidad y acciones correctivas · Administra procesos de RRHH en plazo | Acciones correctivas cerradas · Procesos de RRHH en plazo |
| DIRECTOR DE COMPRAS Y COMERCIO EXTERIOR | 1 | Gestiona proveedores nacionales e internacionales · Cumple plazos de compra · Controla costos de importación | Ahorro en compras · Cumplimiento de entregas de proveedores |
| JEFE ADMINISTRATIVO | 3 | Lidera finanzas y RRHH · Aprueba solicitudes en plazo · Cumple cierres y obligaciones | Cierres en plazo · Gestión de equipo |
| JEFE DE BIOSEGURIDAD | 1 | Controla producción y calidad según normativa · Gestiona riesgos y registros · Responde auditorías | Hallazgos de auditoría · Cumplimiento de controles |
| OPERARIA DE SERVICIOS GENERALES | 1 | Cumple plan de aseo y mantenimiento · Reporta daños oportunamente · Usa elementos de seguridad | Cumplimiento del plan de aseo |
| SALES AND MARKETING MANAGER | 1 | Lidera plan comercial y de marketing · Cumple metas de ventas · Gestiona al equipo comercial | Meta de ventas · Crecimiento de cartera |
| TECHNICAL MANAGER | 1 | Lidera producción e inventario técnico · Cumple programación · Controla calidad del proceso | Cumplimiento de producción · Exactitud de inventario |
| APRENDIZ SENA | 1 | Cumple plan de formación y horario · Aprende y aplica las tareas asignadas · Entrega evidencias de la etapa | Cumplimiento del plan de formación |

**Roles sin personal hoy** (ADMINISTRADOR, ANALISTA DE COMPRAS, CONTADOR, GERENTE ADMINISTRATIVO, JEFE DE LOGISTICA, REPRESENTANTE TECNICO, GENERAL MANAGER con 1 usuario, SUPER ADMINISTRADOR): quedan fuera de la primera versión hasta que se contrate o se defina su perfil.

**Preguntas para RRHH al revisar**: ¿estos criterios reflejan lo que GVM espera? ¿Cuáles deben tener peso mayor? ¿Hay cargos que no deben tener objetivos cuantitativos?

---

*PRP pendiente de aprobación del Apéndice A y del Blueprint. No se ha modificado código.*
