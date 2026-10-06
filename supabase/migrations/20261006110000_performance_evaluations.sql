-- PRP-007 Fase 2: evaluaciones de período de prueba (y base para la anual)
-- Append-only: una evaluación CERRADA no se modifica; las respuestas solo se
-- insertan mientras la evaluación está abierta.

CREATE TABLE IF NOT EXISTS performance_evaluations (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id        uuid NOT NULL REFERENCES employees(id),
    eval_type          text NOT NULL CHECK (eval_type IN ('PROBATION', 'ANNUAL')),
    role_id_snapshot   uuid REFERENCES app_roles(id),
    status             text NOT NULL DEFAULT 'PENDING'
                           CHECK (status IN ('PENDING', 'IN_PROGRESS', 'CLOSED')),
    due_date           date NOT NULL,
    closed_at          timestamptz,
    probation_outcome  text CHECK (probation_outcome IN ('MEETS', 'DOES_NOT_MEET')),
    outcome_comments   text,
    created_by         uuid REFERENCES profiles(id),
    created_at         timestamptz NOT NULL DEFAULT now(),
    CHECK ((probation_outcome IS NULL) = (status <> 'CLOSED'))
);

CREATE INDEX IF NOT EXISTS idx_performance_evaluations_employee
    ON performance_evaluations (tenant_id, employee_id, eval_type);

CREATE TABLE IF NOT EXISTS performance_evaluators (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    evaluation_id   uuid NOT NULL REFERENCES performance_evaluations(id) ON DELETE CASCADE,
    evaluator_id    uuid NOT NULL REFERENCES profiles(id),
    weight          numeric NOT NULL DEFAULT 1 CHECK (weight > 0),
    status          text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'DONE')),
    submitted_at    timestamptz,
    UNIQUE (evaluation_id, evaluator_id)
);

CREATE TABLE IF NOT EXISTS performance_answers (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    evaluation_id   uuid NOT NULL REFERENCES performance_evaluations(id) ON DELETE CASCADE,
    evaluator_id    uuid NOT NULL REFERENCES profiles(id),
    criterion_id    uuid NOT NULL REFERENCES performance_criteria(id),
    score           int NOT NULL CHECK (score BETWEEN 1 AND 5),
    comment         text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (evaluation_id, evaluator_id, criterion_id)
);

ALTER TABLE performance_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_evaluators ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pe_tenant_select" ON performance_evaluations FOR SELECT USING (tenant_id = get_my_tenant_id());
CREATE POLICY "pe_tenant_insert" ON performance_evaluations FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id());
CREATE POLICY "pe_open_update" ON performance_evaluations FOR UPDATE
    USING (tenant_id = get_my_tenant_id() AND status <> 'CLOSED');

CREATE POLICY "pev_tenant_select" ON performance_evaluators FOR SELECT USING (tenant_id = get_my_tenant_id());
CREATE POLICY "pev_tenant_insert" ON performance_evaluators FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id());
CREATE POLICY "pev_own_update" ON performance_evaluators FOR UPDATE
    USING (tenant_id = get_my_tenant_id() AND evaluator_id = auth.uid());

CREATE POLICY "pa_tenant_select" ON performance_answers FOR SELECT USING (tenant_id = get_my_tenant_id());
CREATE POLICY "pa_own_insert" ON performance_answers FOR INSERT WITH CHECK (
    tenant_id = get_my_tenant_id()
    AND evaluator_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM performance_evaluators ev
        JOIN performance_evaluations e ON e.id = ev.evaluation_id
        WHERE ev.evaluation_id = performance_answers.evaluation_id
          AND ev.evaluator_id = auth.uid()
          AND e.status <> 'CLOSED'
    )
);
