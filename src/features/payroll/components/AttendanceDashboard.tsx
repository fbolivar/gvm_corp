'use client';

import { useState, useTransition, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Users, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/shared/lib/utils';
import { AttendanceRecord } from '../services/attendanceService';
import { upsertAttendanceAction } from '../actions/attendanceActions';

// ─── Types ────────────────────────────────────────────────────────────────────

type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'HOLIDAY';

interface EmployeeSummary {
    id: string;
    full_name: string;
    position: string;
    department: string;
}

interface CellEditState {
    employeeId: string;
    day: number;
    status: AttendanceStatus;
    overtime_hours: number;
    notes: string;
}

interface Props {
    employees: EmployeeSummary[];
    records: AttendanceRecord[];
    year: number;
    month: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<AttendanceStatus, string> = {
    PRESENT: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
    LATE: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
    ABSENT: 'bg-rose-100 text-rose-700 hover:bg-rose-200',
    HOLIDAY: 'bg-slate-100 text-slate-500 hover:bg-slate-200',
};

const STATUS_LABELS: Record<AttendanceStatus, string> = {
    PRESENT: 'Presente',
    LATE: 'Tarde',
    ABSENT: 'Ausente',
    HOLIDAY: 'Festivo',
};

const STATUS_DOT: Record<AttendanceStatus, string> = {
    PRESENT: 'bg-emerald-500',
    LATE: 'bg-amber-500',
    ABSENT: 'bg-rose-500',
    HOLIDAY: 'bg-slate-400',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
}

function toDateString(year: number, month: number, day: number): string {
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
}

const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// ─── Component ────────────────────────────────────────────────────────────────

export function AttendanceDashboard({ employees, records: initialRecords, year: initYear, month: initMonth }: Props) {
    const [year, setYear] = useState(initYear);
    const [month, setMonth] = useState(initMonth);
    const [records, setRecords] = useState<AttendanceRecord[]>(initialRecords);
    const [editCell, setEditCell] = useState<CellEditState | null>(null);
    const [isPending, startTransition] = useTransition();

    const totalDays = daysInMonth(year, month);
    const days = Array.from({ length: totalDays }, (_, i) => i + 1);

    // Index records for O(1) lookup: "employeeId|YYYY-MM-DD" -> record
    const recordIndex = useMemo(() => {
        const map = new Map<string, AttendanceRecord>();
        for (const r of records) {
            map.set(`${r.employee_id}|${r.work_date}`, r);
        }
        return map;
    }, [records]);

    // Stats derived from records for today's date
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = records.filter((r) => r.work_date === today);
    const presentToday = todayRecords.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
    const absentToday = employees.length - presentToday;
    const totalOvertimeMonth = records.reduce((acc, r) => acc + Number(r.overtime_hours ?? 0), 0);

    // Month navigation
    const prevMonth = useCallback(() => {
        setMonth((m) => {
            if (m === 1) { setYear((y) => y - 1); return 12; }
            return m - 1;
        });
    }, []);

    const nextMonth = useCallback(() => {
        setMonth((m) => {
            if (m === 12) { setYear((y) => y + 1); return 1; }
            return m + 1;
        });
    }, []);

    // Open edit popover
    const openEdit = useCallback((employeeId: string, day: number) => {
        const key = `${employeeId}|${toDateString(year, month, day)}`;
        const existing = recordIndex.get(key);
        setEditCell({
            employeeId,
            day,
            status: existing?.status ?? 'PRESENT',
            overtime_hours: Number(existing?.overtime_hours ?? 0),
            notes: existing?.notes ?? '',
        });
    }, [year, month, recordIndex]);

    // Save record via server action
    const handleSave = useCallback(() => {
        if (!editCell) return;
        const work_date = toDateString(year, month, editCell.day);

        startTransition(async () => {
            const result = await upsertAttendanceAction({
                employee_id: editCell.employeeId,
                work_date,
                status: editCell.status,
                overtime_hours: editCell.overtime_hours,
                night_hours: 0,
                sunday_hours: 0,
                notes: editCell.notes || null,
            });

            if (!result.success) {
                toast.error(`Error: ${result.error}`);
                return;
            }

            // Optimistic update to local state
            setRecords((prev) => {
                const updated: AttendanceRecord = {
                    id: result.id,
                    employee_id: editCell.employeeId,
                    work_date,
                    status: editCell.status,
                    overtime_hours: editCell.overtime_hours,
                    night_hours: 0,
                    sunday_hours: 0,
                    notes: editCell.notes || undefined,
                };
                const filtered = prev.filter(
                    (r) => !(r.employee_id === editCell.employeeId && r.work_date === work_date)
                );
                return [...filtered, updated];
            });

            toast.success('Asistencia guardada');
            setEditCell(null);
        });
    }, [editCell, year, month]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic mb-2">
                        Talento Humano
                    </p>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight italic uppercase">
                        Control de Asistencia
                    </h1>
                </div>

                {/* Month Selector */}
                <div className="flex items-center gap-3 bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-3">
                    <button
                        onClick={prevMonth}
                        className="h-8 w-8 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-colors"
                        aria-label="Mes anterior"
                    >
                        <ChevronLeft className="h-4 w-4 text-slate-600" />
                    </button>
                    <span className="text-sm font-black text-slate-900 italic uppercase tracking-widest min-w-[140px] text-center">
                        {MONTH_NAMES[month - 1]} {year}
                    </span>
                    <button
                        onClick={nextMonth}
                        className="h-8 w-8 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-colors"
                        aria-label="Mes siguiente"
                    >
                        <ChevronRight className="h-4 w-4 text-slate-600" />
                    </button>
                </div>
            </div>

            {/* Stats Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total empleados', value: employees.length, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Presentes hoy', value: presentToday, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Ausentes hoy', value: absentToday, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
                    { label: 'Horas extra (mes)', value: `${totalOvertimeMonth.toFixed(1)}h`, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-5 rounded-xl shadow-sm flex items-center gap-4 border border-slate-50">
                        <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0', stat.bg, stat.color)}>
                            <stat.icon className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">{stat.label}</p>
                            <p className="text-xl font-black text-slate-900 tracking-tighter italic">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3">
                {(Object.entries(STATUS_LABELS) as [AttendanceStatus, string][]).map(([status, label]) => (
                    <span key={status} className={cn('text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full', STATUS_STYLES[status].split(' ').slice(0, 2).join(' '))}>
                        {label}
                    </span>
                ))}
                <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-slate-50 text-slate-400">
                    Sin registro
                </span>
            </div>

            {/* Attendance Grid */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-auto">
                <table className="w-full text-xs border-collapse" role="grid" aria-label="Tabla de asistencia mensual">
                    <thead>
                        <tr className="border-b border-slate-100">
                            <th className="text-left py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest sticky left-0 bg-white z-10 min-w-[200px]">
                                Empleado
                            </th>
                            {days.map((day) => (
                                <th
                                    key={day}
                                    className="py-3 px-1 text-[9px] font-black text-slate-400 uppercase text-center min-w-[32px]"
                                >
                                    {day}
                                </th>
                            ))}
                            <th className="py-3 px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right min-w-[80px]">
                                Resumen
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {employees.map((emp) => {
                            const empRecords = records.filter((r) => r.employee_id === emp.id);
                            const presentDays = empRecords.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
                            const totalOT = empRecords.reduce((acc, r) => acc + Number(r.overtime_hours ?? 0), 0);

                            return (
                                <tr key={emp.id} className="border-b border-slate-50 hover:bg-slate-50/40 transition-colors group">
                                    {/* Employee name - sticky */}
                                    <td className="py-2 px-4 sticky left-0 bg-white group-hover:bg-slate-50/40 transition-colors z-10">
                                        <div>
                                            <p className="font-black text-slate-900 text-[10px] italic uppercase tracking-tight truncate max-w-[180px]">
                                                {emp.full_name}
                                            </p>
                                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider truncate max-w-[180px]">
                                                {emp.department}
                                            </p>
                                        </div>
                                    </td>

                                    {/* Day cells */}
                                    {days.map((day) => {
                                        const dateStr = toDateString(year, month, day);
                                        const record = recordIndex.get(`${emp.id}|${dateStr}`);
                                        const isEditing = editCell?.employeeId === emp.id && editCell?.day === day;

                                        return (
                                            <td key={day} className="py-2 px-1 text-center relative">
                                                <button
                                                    onClick={() => openEdit(emp.id, day)}
                                                    className={cn(
                                                        'h-6 w-6 rounded-md mx-auto flex items-center justify-center transition-all',
                                                        record
                                                            ? cn(STATUS_STYLES[record.status], 'font-black text-[8px]')
                                                            : 'bg-slate-50 text-slate-300 hover:bg-slate-100',
                                                        isEditing && 'ring-2 ring-indigo-400 ring-offset-1'
                                                    )}
                                                    aria-label={`Asistencia de ${emp.full_name} el día ${day}`}
                                                    title={record ? STATUS_LABELS[record.status] : 'Sin registro'}
                                                >
                                                    {record ? (
                                                        <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[record.status])} />
                                                    ) : (
                                                        <span className="h-1 w-1 rounded-full bg-slate-200" />
                                                    )}
                                                </button>
                                            </td>
                                        );
                                    })}

                                    {/* Summary */}
                                    <td className="py-2 px-3 text-right">
                                        <p className="text-[9px] font-black text-slate-900 italic">{presentDays}d</p>
                                        {totalOT > 0 && (
                                            <p className="text-[8px] font-bold text-amber-600">{totalOT.toFixed(1)}h OT</p>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {employees.length === 0 && (
                    <div className="py-16 text-center">
                        <Users className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                            No hay empleados activos
                        </p>
                    </div>
                )}
            </div>

            {/* Inline Edit Modal */}
            {editCell && (
                <div
                    className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/30 backdrop-blur-sm"
                    onClick={() => setEditCell(null)}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Editar asistencia"
                >
                    <div
                        className="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">
                                {MONTH_NAMES[month - 1]} {editCell.day}, {year}
                            </p>
                            <h3 className="text-base font-black text-slate-900 italic uppercase tracking-tight mt-1">
                                {employees.find((e) => e.id === editCell.employeeId)?.full_name}
                            </h3>
                        </div>

                        {/* Status Select */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest" htmlFor="att-status">
                                Estado
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {(Object.entries(STATUS_LABELS) as [AttendanceStatus, string][]).map(([s, label]) => (
                                    <button
                                        key={s}
                                        onClick={() => setEditCell((prev) => prev ? { ...prev, status: s } : null)}
                                        className={cn(
                                            'py-2 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border-2',
                                            editCell.status === s
                                                ? cn(STATUS_STYLES[s].split(' ').slice(0, 2).join(' '), 'border-current')
                                                : 'border-transparent bg-slate-50 text-slate-500 hover:bg-slate-100'
                                        )}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Overtime hours */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest" htmlFor="att-overtime">
                                Horas extra
                            </label>
                            <input
                                id="att-overtime"
                                type="number"
                                min={0}
                                max={24}
                                step={0.5}
                                value={editCell.overtime_hours}
                                onChange={(e) => setEditCell((prev) => prev ? { ...prev, overtime_hours: parseFloat(e.target.value) || 0 } : null)}
                                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                        </div>

                        {/* Notes */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest" htmlFor="att-notes">
                                Notas
                            </label>
                            <textarea
                                id="att-notes"
                                rows={2}
                                value={editCell.notes}
                                onChange={(e) => setEditCell((prev) => prev ? { ...prev, notes: e.target.value } : null)}
                                placeholder="Observación opcional..."
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-1">
                            <button
                                onClick={() => setEditCell(null)}
                                className="flex-1 h-10 rounded-xl border border-slate-200 text-[9px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isPending}
                                className="flex-1 h-10 rounded-xl bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                            >
                                {isPending ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
