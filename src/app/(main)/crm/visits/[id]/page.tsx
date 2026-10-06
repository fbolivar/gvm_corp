import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarCheck, Building2, Briefcase, History } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/page-header';
import { formatLocalDate } from '@/shared/lib/dateFmt';
import { loadVisitPageContext } from '@/features/crm/services/visitPageContext';
import { visitService } from '@/features/crm/services/visitService';
import { VisitOutcomeForm } from '@/features/crm/components/VisitOutcomeForm';
import { VisitDetailActions } from '@/features/crm/components/VisitDetailActions';
import { PartySnapshotCard } from '@/features/crm/components/PartySnapshotCard';
import { StatusBadge } from '@/features/crm/components/VisitList';
import { ContactActions } from '@/features/crm/components/ContactActions';
import { InteractionList } from '@/features/crm/components/InteractionList';
import { getPartyInteractionsAction } from '@/features/crm/actions/interactionActions';
import { MANAGEMENT_TYPES, MEETING_TYPES, PRIORITY_LABELS, VISIT_RESULTS } from '@/features/crm/types/visits';

export const metadata = { title: 'Visita — GVM Corp' };

interface PageProps { params: Promise<{ id: string }> }

function Field({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="min-w-0">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
            <div className="text-sm text-slate-800 font-medium break-words">{value ?? '—'}</div>
        </div>
    );
}

export default async function VisitDetailPage({ params }: PageProps) {
    const { id } = await params;
    const { supabase, userId, userName, isManager, today } = await loadVisitPageContext();

    const visit = await visitService.getById(supabase, id);
    if (!visit) notFound();
    // Las visitas de otros comerciales no existen para quien no es gerente.
    if (!isManager && visit.salesperson_id !== userId) notFound();

    const [snapshot, history, interactions] = await Promise.all([
        visit.party_id ? visitService.getPartySnapshot(supabase, visit.party_id, today) : Promise.resolve(null),
        visit.party_id ? visitService.list(supabase, { partyId: visit.party_id }) : Promise.resolve([]),
        visit.party_id ? getPartyInteractionsAction(visit.party_id, 8) : Promise.resolve([]),
    ]);
    const previous = history.filter(h => h.id !== visit.id);

    const title = visit.is_internal ? visit.title ?? 'Actividad interna' : visit.party_name ?? 'Cliente';

    return (
        <div className="page-container space-y-6 pb-16 animate-in fade-in duration-500">
            <PageHeader
                title={title}
                description={`${MANAGEMENT_TYPES[visit.management_type]} · ${formatLocalDate(visit.planned_date, { weekday: 'long', day: '2-digit', month: 'long' })}`}
                icon={visit.is_internal ? Briefcase : CalendarCheck}
                breadcrumbs={[{ label: 'Inicio', href: '/dashboard' }, { label: 'CRM', href: '/crm' }, { label: 'Visitas', href: '/crm/visits' }, { label: 'Detalle' }]}
                actions={<VisitDetailActions id={visit.id} canDelete={visit.status !== 'REALIZADA'} />}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-5">
                    <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 md:p-6 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Planeación</h3>
                            <StatusBadge status={visit.status} />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <Field label="Comercial" value={visit.salesperson_name} />
                            <Field label="Fecha planeada" value={formatLocalDate(visit.planned_date)} />
                            <Field label="Prioridad" value={PRIORITY_LABELS[visit.priority]} />
                            <Field label="Tipo de gestión" value={MANAGEMENT_TYPES[visit.management_type]} />
                            <Field label="Tipo de reunión" value={MEETING_TYPES[visit.meeting_type]} />
                            {visit.party_city && <Field label="Ciudad" value={visit.party_city} />}
                        </div>
                        <Field label="Objetivo" value={<p className="whitespace-pre-line">{visit.objective}</p>} />
                        {visit.party_id && (
                            <div className="flex flex-wrap items-center gap-3 pt-1">
                                <ContactActions
                                    size="full"
                                    party={{ id: visit.party_id, legal_name: visit.party_name ?? 'Cliente', phone: visit.party_phone, email: visit.party_email }}
                                    context={{ salesperson_name: userName, contact_name: visit.party_contact, last_purchase_date: snapshot?.last_purchase_date, top_product: snapshot?.top_product, planned_date: visit.planned_date }}
                                    suggest={visit.status === 'REALIZADA' ? null : 'VISITA'}
                                    visitId={visit.id}
                                />
                                <Link href={`/parties/${visit.party_id}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline">
                                    <Building2 className="h-3.5 w-3.5" /> Ver ficha del tercero
                                </Link>
                            </div>
                        )}
                    </section>

                    {visit.status === 'REALIZADA' && (
                        <section className="bg-emerald-50/50 rounded-3xl border border-emerald-100 p-5 md:p-6 space-y-4">
                            <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Resultado registrado</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <Field label="Fecha realizada" value={formatLocalDate(visit.done_date)} />
                                <Field label="Resultado" value={visit.result ? VISIT_RESULTS[visit.result] : '—'} />
                                <Field label="Próximo seguimiento" value={formatLocalDate(visit.next_followup_date)} />
                            </div>
                            <Field label="Conclusiones" value={<p className="whitespace-pre-line">{visit.conclusions}</p>} />
                            <Field label="Compromisos" value={<p className="whitespace-pre-line">{visit.commitments || '—'}</p>} />
                        </section>
                    )}

                    <VisitOutcomeForm visit={visit} today={today} />
                </div>

                <aside className="space-y-5">
                    {visit.party_id && <PartySnapshotCard partyId={visit.party_id} initial={snapshot} compact />}
                    {visit.party_id && <InteractionList items={interactions} />}

                    {visit.party_id && (
                        <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-3">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <History className="h-3.5 w-3.5" /> Otras visitas a este cliente ({previous.length})
                            </h3>
                            {previous.length === 0 ? (
                                <p className="text-xs text-slate-400">Es la primera visita registrada.</p>
                            ) : (
                                <ul className="space-y-2">
                                    {previous.slice(0, 8).map(h => (
                                        <li key={h.id}>
                                            <Link href={`/crm/visits/${h.id}`} className="block rounded-xl border border-slate-100 px-3 py-2 hover:border-indigo-200">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-xs font-semibold text-slate-700 tabular-nums">{formatLocalDate(h.done_date ?? h.planned_date)}</span>
                                                    <StatusBadge status={h.status} />
                                                </div>
                                                <p className="text-[11px] text-slate-500 truncate">{MANAGEMENT_TYPES[h.management_type]} · {h.salesperson_name}</p>
                                                {h.result && <p className="text-[11px] text-emerald-700 font-semibold">{VISIT_RESULTS[h.result]}</p>}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    )}
                </aside>
            </div>
        </div>
    );
}
