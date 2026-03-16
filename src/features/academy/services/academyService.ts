import { SupabaseClient } from '@supabase/supabase-js';
import { Course, Lesson, CourseWithMeta, LessonWithProgress } from '../types';

export interface AcademyMetrics {
    totalCourses: number;
    totalLessons: number;
    completedCourses: number;
    inProgressCourses: number;
    overallCompletion: number;
}

export const academyService = {
    // ─── COURSES (public) ────────────────────────────────────────────────
    async getCourses(
        client: SupabaseClient,
        userId: string,
        publishedOnly = true
    ): Promise<CourseWithMeta[]> {
        let query = client
            .from('academy_courses')
            .select('*, lessons:academy_lessons(id)')
            .order('sort_order', { ascending: true });

        if (publishedOnly) {
            query = query.eq('is_published', true);
        }

        const { data: courses, error } = await query;
        if (error) throw error;

        // Get user progress
        const { data: progress } = await client
            .from('academy_progress')
            .select('lesson_id, course_id')
            .eq('user_id', userId);

        const completedLessonIds = new Set((progress ?? []).map(p => p.lesson_id));

        return (courses ?? []).map(c => {
            const lessons = (c.lessons as { id: string }[]) ?? [];
            const lessonCount = lessons.length;
            const completedCount = lessons.filter(l => completedLessonIds.has(l.id)).length;
            const { lessons: _, ...course } = c;
            return { ...course, lesson_count: lessonCount, completed_count: completedCount } as CourseWithMeta;
        });
    },

    async getCourseBySlug(
        client: SupabaseClient,
        slug: string,
        userId: string
    ): Promise<{ course: Course; lessons: LessonWithProgress[] } | null> {
        const { data: course, error } = await client
            .from('academy_courses')
            .select('*')
            .eq('slug', slug)
            .maybeSingle();

        if (error) throw error;
        if (!course) return null;

        const { data: lessons, error: lessonsErr } = await client
            .from('academy_lessons')
            .select('*')
            .eq('course_id', course.id)
            .order('sort_order', { ascending: true });

        if (lessonsErr) throw lessonsErr;

        const { data: progress } = await client
            .from('academy_progress')
            .select('lesson_id')
            .eq('user_id', userId)
            .eq('course_id', course.id);

        const completedIds = new Set((progress ?? []).map(p => p.lesson_id));

        const lessonsWithProgress: LessonWithProgress[] = (lessons ?? []).map(l => ({
            ...l,
            is_completed: completedIds.has(l.id),
        }));

        return { course: course as Course, lessons: lessonsWithProgress };
    },

    async getLessonById(
        client: SupabaseClient,
        lessonId: string
    ): Promise<Lesson | null> {
        const { data, error } = await client
            .from('academy_lessons')
            .select('*')
            .eq('id', lessonId)
            .maybeSingle();

        if (error) throw error;
        return data as Lesson | null;
    },

    // ─── PROGRESS ────────────────────────────────────────────────────────
    async markLessonComplete(
        client: SupabaseClient,
        tenantId: string,
        userId: string,
        lessonId: string,
        courseId: string
    ): Promise<void> {
        const { error } = await client
            .from('academy_progress')
            .upsert({
                tenant_id: tenantId,
                user_id: userId,
                lesson_id: lessonId,
                course_id: courseId,
                completed_at: new Date().toISOString(),
            }, { onConflict: 'user_id,lesson_id' });

        if (error) throw error;
    },

    async unmarkLessonComplete(
        client: SupabaseClient,
        userId: string,
        lessonId: string
    ): Promise<void> {
        const { error } = await client
            .from('academy_progress')
            .delete()
            .eq('user_id', userId)
            .eq('lesson_id', lessonId);

        if (error) throw error;
    },

    // ─── METRICS ─────────────────────────────────────────────────────────
    async getMetrics(
        client: SupabaseClient,
        userId: string
    ): Promise<AcademyMetrics> {
        const courses = await this.getCourses(client, userId, true);
        const totalCourses = courses.length;
        const totalLessons = courses.reduce((sum, c) => sum + c.lesson_count, 0);
        const completedCourses = courses.filter(c => c.lesson_count > 0 && c.completed_count === c.lesson_count).length;
        const inProgressCourses = courses.filter(c => c.completed_count > 0 && c.completed_count < c.lesson_count).length;
        const totalCompleted = courses.reduce((sum, c) => sum + c.completed_count, 0);
        const overallCompletion = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;

        return { totalCourses, totalLessons, completedCourses, inProgressCourses, overallCompletion };
    },

    // ─── ADMIN CRUD ──────────────────────────────────────────────────────
    async createCourse(
        client: SupabaseClient,
        payload: Omit<Course, 'id' | 'created_at' | 'updated_at'>
    ): Promise<Course> {
        const { data, error } = await client
            .from('academy_courses')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        return data as Course;
    },

    async updateCourse(
        client: SupabaseClient,
        id: string,
        payload: Partial<Course>
    ): Promise<Course> {
        const { data, error } = await client
            .from('academy_courses')
            .update({ ...payload, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as Course;
    },

    async getCourseById(
        client: SupabaseClient,
        courseId: string
    ): Promise<{ course: Course; lessons: Lesson[] } | null> {
        const { data: course, error } = await client
            .from('academy_courses')
            .select('*')
            .eq('id', courseId)
            .maybeSingle();

        if (error) throw error;
        if (!course) return null;

        const { data: lessons } = await client
            .from('academy_lessons')
            .select('*')
            .eq('course_id', courseId)
            .order('sort_order', { ascending: true });

        return { course: course as Course, lessons: (lessons ?? []) as Lesson[] };
    },

    async createLesson(
        client: SupabaseClient,
        payload: Omit<Lesson, 'id' | 'created_at' | 'updated_at'>
    ): Promise<Lesson> {
        const { data, error } = await client
            .from('academy_lessons')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        return data as Lesson;
    },

    async updateLesson(
        client: SupabaseClient,
        id: string,
        payload: Partial<Lesson>
    ): Promise<Lesson> {
        const { data, error } = await client
            .from('academy_lessons')
            .update({ ...payload, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as Lesson;
    },

    async deleteLesson(
        client: SupabaseClient,
        id: string
    ): Promise<void> {
        const { error } = await client
            .from('academy_lessons')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // ─── REPORTS (admin) ─────────────────────────────────────────────────
    async getCourseCompletionReport(client: SupabaseClient): Promise<{
        courseId: string;
        title: string;
        lessonCount: number;
        usersStarted: number;
        usersCompleted: number;
        completionRate: number;
    }[]> {
        const { data: courses } = await client
            .from('academy_courses')
            .select('id, title, lessons:academy_lessons(id)')
            .eq('is_published', true)
            .order('sort_order');

        const { data: allProgress } = await client
            .from('academy_progress')
            .select('user_id, lesson_id, course_id');

        const progressMap = new Map<string, Set<string>>();
        for (const p of allProgress ?? []) {
            if (!progressMap.has(p.course_id)) progressMap.set(p.course_id, new Set());
            progressMap.get(p.course_id)!.add(`${p.user_id}:${p.lesson_id}`);
        }

        return (courses ?? []).map(c => {
            const lessons = (c.lessons as { id: string }[]) ?? [];
            const lessonCount = lessons.length;
            const courseProgress = progressMap.get(c.id);
            const userLessons = new Map<string, number>();

            if (courseProgress) {
                for (const entry of courseProgress) {
                    const userId = entry.split(':')[0];
                    userLessons.set(userId, (userLessons.get(userId) ?? 0) + 1);
                }
            }

            const usersStarted = userLessons.size;
            const usersCompleted = [...userLessons.values()].filter(count => count >= lessonCount).length;
            const completionRate = usersStarted > 0 ? Math.round((usersCompleted / usersStarted) * 100) : 0;

            return { courseId: c.id, title: c.title, lessonCount, usersStarted, usersCompleted, completionRate };
        });
    },
};
