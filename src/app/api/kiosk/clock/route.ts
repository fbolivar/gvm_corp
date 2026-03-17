import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { attendanceService } from '@/features/payroll/services/attendanceService';
import { kioskService } from '@/features/payroll/services/kioskService';

const clockSchema = z.object({
    token: z.string().min(1),
    employee_id: z.string().uuid(),
    hmac_signature: z.string().min(1),
    geo: z.object({
        lat: z.number(),
        lng: z.number(),
    }).optional(),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = clockSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Datos invalidos', details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { token, employee_id, hmac_signature, geo } = parsed.data;
        const adminClient = createAdminClient();

        // 1. Validate terminal token
        const { data: terminal } = await adminClient
            .from('kiosk_terminals')
            .select('id, tenant_id, name, is_active, expires_at')
            .eq('token', token)
            .maybeSingle();

        if (!terminal) {
            return NextResponse.json({ error: 'Terminal no encontrado' }, { status: 404 });
        }

        if (!terminal.is_active) {
            return NextResponse.json({ error: 'Terminal desactivado' }, { status: 403 });
        }

        if (terminal.expires_at && new Date(terminal.expires_at) < new Date()) {
            return NextResponse.json({ error: 'Terminal expirado' }, { status: 403 });
        }

        // 2. Verify QR HMAC signature
        const secret = process.env.KIOSK_QR_SECRET;
        if (!secret) {
            return NextResponse.json({ error: 'Configuracion del servidor incompleta' }, { status: 500 });
        }

        if (!kioskService.verifyQrSignature(employee_id, hmac_signature, secret)) {
            return NextResponse.json({ error: 'Codigo QR invalido o falsificado' }, { status: 403 });
        }

        // 3. Verify employee belongs to same tenant
        const { data: employee } = await adminClient
            .from('employees')
            .select('id, tenant_id, status, party:parties(legal_name)')
            .eq('id', employee_id)
            .maybeSingle();

        if (!employee) {
            return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
        }

        if (employee.tenant_id !== terminal.tenant_id) {
            return NextResponse.json({ error: 'Empleado no pertenece a esta empresa' }, { status: 403 });
        }

        if (employee.status !== 'ACTIVE') {
            return NextResponse.json({ error: 'Empleado inactivo' }, { status: 403 });
        }

        // 4. Get today's attendance status
        const today = new Date().toISOString().split('T')[0];
        const { data: todayRecord } = await adminClient
            .from('payroll_attendance')
            .select('*')
            .eq('employee_id', employee_id)
            .eq('work_date', today)
            .maybeSingle();

        // 5. Rate limit: no action within 5 minutes
        if (todayRecord) {
            const lastAction = todayRecord.check_out || todayRecord.check_in;
            if (lastAction) {
                const diff = Date.now() - new Date(lastAction).getTime();
                if (diff < 5 * 60 * 1000) {
                    const waitMin = Math.ceil((5 * 60 * 1000 - diff) / 60000);
                    return NextResponse.json(
                        { error: `Debe esperar ${waitMin} minuto(s) antes de escanear de nuevo` },
                        { status: 429 }
                    );
                }
            }
        }

        // 6. Auto-detect action
        const partyData = employee.party as unknown as { legal_name: string } | { legal_name: string }[] | null;
        const employeeName = Array.isArray(partyData) ? partyData[0]?.legal_name : partyData?.legal_name;

        let action: 'clock_in' | 'clock_out';
        let resultData: Record<string, unknown>;

        if (!todayRecord || !todayRecord.check_in) {
            // No record today or no check-in → CLOCK IN
            action = 'clock_in';
            resultData = await attendanceService.clockIn(adminClient, employee_id, terminal.tenant_id, geo);
        } else if (todayRecord.check_in && !todayRecord.check_out) {
            // Has check-in but no check-out → CLOCK OUT
            action = 'clock_out';
            resultData = await attendanceService.clockOut(adminClient, employee_id, geo);
        } else {
            // Both check-in and check-out exist → already completed
            return NextResponse.json(
                { error: 'Jornada completa. Ya se registro entrada y salida hoy.' },
                { status: 409 }
            );
        }

        // 7. Update terminal last_ping
        void adminClient
            .from('kiosk_terminals')
            .update({ last_ping_at: new Date().toISOString() })
            .eq('id', terminal.id);

        return NextResponse.json({
            success: true,
            action,
            employee_name: employeeName || 'Empleado',
            time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
            data: {
                status: resultData.status,
                late_minutes: resultData.late_minutes || 0,
                total_worked_hours: resultData.total_worked_hours || 0,
                overtime_hours: resultData.overtime_hours || 0,
            },
        });

    } catch (error: unknown) {
        console.error('[kiosk/clock] Error:', error);
        const message = error instanceof Error ? error.message : 'Error interno del servidor';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
