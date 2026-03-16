-- ============================================================
-- Academia GVM: LMS interno para aprendizaje del ERP
-- ============================================================

-- 1. TABLA: academy_courses
CREATE TABLE IF NOT EXISTS academy_courses (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title            TEXT NOT NULL,
    description      TEXT,
    module_key       TEXT,
    slug             TEXT NOT NULL,
    difficulty       TEXT NOT NULL DEFAULT 'BEGINNER' CHECK (difficulty IN ('BEGINNER','INTERMEDIATE','ADVANCED')),
    estimated_minutes INT DEFAULT 15,
    is_published     BOOLEAN DEFAULT false,
    sort_order       INT DEFAULT 0,
    created_by       UUID REFERENCES profiles(id),
    created_at       TIMESTAMPTZ DEFAULT now(),
    updated_at       TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, slug)
);

-- 2. TABLA: academy_lessons
CREATE TABLE IF NOT EXISTS academy_lessons (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_id        UUID NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
    title            TEXT NOT NULL,
    content          TEXT DEFAULT '',
    sort_order       INT DEFAULT 0,
    estimated_minutes INT DEFAULT 5,
    created_at       TIMESTAMPTZ DEFAULT now(),
    updated_at       TIMESTAMPTZ DEFAULT now()
);

-- 3. TABLA: academy_progress
CREATE TABLE IF NOT EXISTS academy_progress (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    lesson_id        UUID NOT NULL REFERENCES academy_lessons(id) ON DELETE CASCADE,
    course_id        UUID NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
    completed_at     TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, lesson_id)
);

-- ─── INDICES ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_academy_courses_tenant ON academy_courses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_academy_courses_module ON academy_courses(tenant_id, module_key);
CREATE INDEX IF NOT EXISTS idx_academy_lessons_course ON academy_lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_academy_lessons_tenant ON academy_lessons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_academy_progress_user ON academy_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_academy_progress_course ON academy_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_academy_progress_tenant ON academy_progress(tenant_id);

-- ─── RLS ─────────────────────────────────────────────────────
ALTER TABLE academy_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_progress ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='academy_courses' AND policyname='academy_courses_tenant_select') THEN
  CREATE POLICY academy_courses_tenant_select ON academy_courses FOR SELECT USING (tenant_id = get_my_tenant_id());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='academy_courses' AND policyname='academy_courses_tenant_insert') THEN
  CREATE POLICY academy_courses_tenant_insert ON academy_courses FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='academy_courses' AND policyname='academy_courses_tenant_update') THEN
  CREATE POLICY academy_courses_tenant_update ON academy_courses FOR UPDATE USING (tenant_id = get_my_tenant_id());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='academy_courses' AND policyname='academy_courses_tenant_delete') THEN
  CREATE POLICY academy_courses_tenant_delete ON academy_courses FOR DELETE USING (tenant_id = get_my_tenant_id());
END IF;

IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='academy_lessons' AND policyname='academy_lessons_tenant_select') THEN
  CREATE POLICY academy_lessons_tenant_select ON academy_lessons FOR SELECT USING (tenant_id = get_my_tenant_id());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='academy_lessons' AND policyname='academy_lessons_tenant_insert') THEN
  CREATE POLICY academy_lessons_tenant_insert ON academy_lessons FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='academy_lessons' AND policyname='academy_lessons_tenant_update') THEN
  CREATE POLICY academy_lessons_tenant_update ON academy_lessons FOR UPDATE USING (tenant_id = get_my_tenant_id());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='academy_lessons' AND policyname='academy_lessons_tenant_delete') THEN
  CREATE POLICY academy_lessons_tenant_delete ON academy_lessons FOR DELETE USING (tenant_id = get_my_tenant_id());
END IF;

IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='academy_progress' AND policyname='academy_progress_tenant_select') THEN
  CREATE POLICY academy_progress_tenant_select ON academy_progress FOR SELECT USING (tenant_id = get_my_tenant_id());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='academy_progress' AND policyname='academy_progress_tenant_insert') THEN
  CREATE POLICY academy_progress_tenant_insert ON academy_progress FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='academy_progress' AND policyname='academy_progress_tenant_delete') THEN
  CREATE POLICY academy_progress_tenant_delete ON academy_progress FOR DELETE USING (tenant_id = get_my_tenant_id());
END IF;
END $$;
