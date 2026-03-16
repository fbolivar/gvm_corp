'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { settingsService } from '@/features/settings/services/settingsService';
import { academyService } from './services/academyService';
import { DifficultyEnum } from './types';

function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

// ─── COURSES ─────────────────────────────────────────────────────────────────

export async function createCourseAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const tenant = await settingsService.getTenantInfo(supabase);
    if (!tenant) throw new Error('Tenant no encontrado');

    const title = (formData.get('title') as string)?.trim();
    const description = (formData.get('description') as string)?.trim() || null;
    const module_key = (formData.get('module_key') as string)?.trim() || null;
    const difficulty = formData.get('difficulty') as string;
    const estimated_minutes = parseInt(formData.get('estimated_minutes') as string) || 15;

    if (!title || title.length < 3) throw new Error('Titulo requerido (min 3 caracteres)');

    const parsed = DifficultyEnum.safeParse(difficulty);
    if (!parsed.success) throw new Error('Dificultad invalida');

    const slug = slugify(title) + '-' + Date.now().toString(36);

    await academyService.createCourse(supabase, {
        tenant_id: tenant.id,
        title,
        description,
        module_key,
        slug,
        difficulty: parsed.data,
        estimated_minutes,
        is_published: false,
        sort_order: 0,
        created_by: user.id,
    });

    revalidatePath('/academy');
    revalidatePath('/academy/manage');
    return { success: true };
}

export async function updateCourseAction(courseId: string, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const title = (formData.get('title') as string)?.trim();
    const description = (formData.get('description') as string)?.trim() || null;
    const module_key = (formData.get('module_key') as string)?.trim() || null;
    const difficulty = formData.get('difficulty') as string;
    const estimated_minutes = parseInt(formData.get('estimated_minutes') as string) || 15;

    if (!title || title.length < 3) throw new Error('Titulo requerido');

    await academyService.updateCourse(supabase, courseId, {
        title,
        description,
        module_key,
        difficulty: difficulty as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
        estimated_minutes,
    });

    revalidatePath('/academy');
    revalidatePath('/academy/manage');
    return { success: true };
}

export async function togglePublishAction(courseId: string, isPublished: boolean) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    await academyService.updateCourse(supabase, courseId, { is_published: isPublished });

    revalidatePath('/academy');
    revalidatePath('/academy/manage');
    return { success: true };
}

// ─── LESSONS ─────────────────────────────────────────────────────────────────

export async function createLessonAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const tenant = await settingsService.getTenantInfo(supabase);
    if (!tenant) throw new Error('Tenant no encontrado');

    const course_id = (formData.get('course_id') as string)?.trim();
    const title = (formData.get('title') as string)?.trim();
    const content = (formData.get('content') as string) || '';
    const sort_order = parseInt(formData.get('sort_order') as string) || 0;
    const estimated_minutes = parseInt(formData.get('estimated_minutes') as string) || 5;

    if (!course_id) throw new Error('Curso requerido');
    if (!title) throw new Error('Titulo requerido');

    await academyService.createLesson(supabase, {
        tenant_id: tenant.id,
        course_id,
        title,
        content,
        sort_order,
        estimated_minutes,
    });

    revalidatePath('/academy');
    revalidatePath('/academy/manage');
    return { success: true };
}

export async function updateLessonAction(lessonId: string, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const title = (formData.get('title') as string)?.trim();
    const content = (formData.get('content') as string) || '';
    const sort_order = parseInt(formData.get('sort_order') as string) || 0;
    const estimated_minutes = parseInt(formData.get('estimated_minutes') as string) || 5;

    if (!title) throw new Error('Titulo requerido');

    await academyService.updateLesson(supabase, lessonId, {
        title,
        content,
        sort_order,
        estimated_minutes,
    });

    revalidatePath('/academy');
    revalidatePath('/academy/manage');
    return { success: true };
}

export async function deleteLessonAction(lessonId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    await academyService.deleteLesson(supabase, lessonId);

    revalidatePath('/academy');
    revalidatePath('/academy/manage');
    return { success: true };
}

// ─── PROGRESS ────────────────────────────────────────────────────────────────

export async function markLessonCompleteAction(lessonId: string, courseId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const tenant = await settingsService.getTenantInfo(supabase);
    if (!tenant) throw new Error('Tenant no encontrado');

    await academyService.markLessonComplete(supabase, tenant.id, user.id, lessonId, courseId);

    revalidatePath('/academy');
    return { success: true };
}
