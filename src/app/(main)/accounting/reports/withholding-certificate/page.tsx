import { createClient } from '@/lib/supabase/server';
import { legalReportService } from '@/features/accounting/services/legalReportService';
import { settingsService } from '@/features/settings/services/settingsService';
import { notFound, redirect } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PrintButton } from '@/features/accounting/components/PrintButton';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

interface PageProps {
    searchParams: Promise<{ party_id?: string; year?: string }>;
}

export default async function WithholdingCertificatePage({ searchParams }: PageProps) {
    const { party_id, year: yearStr } = await searchParams;

    if (!party_id) {
        // Lista de proveedores con retenciones
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) redirect('/login');

        const year = new Date().getFullYear();
        const registry = await legalReportService.getAnnualWithholdingRegistry(supabase, year);
        const tenant = await settingsService.getTenantInfo(supabase);

        return (
            <div className="page-container space-y-8 pb-20 animate-in fade-in duration-700">
                <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white">
                    <div className="flex items-center gap-4 mb-6">
                        <Link href="/accounting/reports" className="text-slate-400 hover:text-white transition-colors print:hidden">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div className="h-10 w-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                            <ShieldCheck className="h-5 w-5 text-indigo-300" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-tighter">Certificados de Retención</h1>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Art. 381 E.T. — Año {year}</p>
                        </div>
                    </div>
                    <p className="text-slate-400 text-sm font-medium">
                        Selecciona un proveedor para generar su certificado de retención en la fuente.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {registry.map((reg) => (
                        <Link
                            key={reg.party_id}
                            href={`/accounting/reports/withholding-certificate?party_id=${reg.party_id}&year=${year}`}
                            className="bg-white rounded-[2rem] p-6 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all border border-slate-50 group"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-black text-slate-900 text-sm uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                                        {reg.legal_name}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{reg.doc_number}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-slate-900">
                                        ${reg.total_tax.toLocaleString('es-CO')}
                                    </p>
                                    <p className="text-[9px] text-emerald-600 font-black uppercase tracking-widest">Retenido</p>
                                </div>
                            </div>
                        </Link>
                    ))}

                    {registry.length === 0 && (
                        <div className="col-span-2 text-center py-16 bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
                            <ShieldCheck className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-bold">Sin retenciones registradas para {year}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Vista de certificado individual para impresión
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const year = parseInt(yearStr ?? String(new Date().getFullYear()), 10);

    let certData;
    try {
        certData = await legalReportService.getCertificateFullData(supabase, party_id, year);
    } catch {
        notFound();
    }

    const { party, items, total_withheld, company_info } = certData;
    const today = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });

    return (
        <div className="max-w-4xl mx-auto p-8 print:p-0 print:max-w-none">
            {/* Botones de acción — solo en pantalla */}
            <div className="flex gap-3 mb-6 print:hidden">
                <Link href="/accounting/reports/withholding-certificate" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Volver
                </Link>
                <PrintButton label="Imprimir Certificado" className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all" />
            </div>

            {/* Certificado A4 */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden print:border-none print:rounded-none shadow-lg">
                {/* Header corporativo */}
                <div className="bg-slate-900 px-12 py-8 text-white">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Agente de Retención</p>
                            <h2 className="text-2xl font-black uppercase tracking-tight">{company_info?.name ?? 'GVM CORP'}</h2>
                            <p className="text-xs text-slate-400 mt-1">
                                NIT: {company_info?.nit ?? '—'}{company_info?.dv ? `-${company_info.dv}` : ''} &nbsp;·&nbsp;
                                {company_info?.address ?? ''} &nbsp;·&nbsp;
                                {company_info?.city ?? 'Bogotá D.C.'}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="inline-block bg-indigo-600 px-6 py-3 rounded-xl">
                                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-200">Año Fiscal</p>
                                <p className="text-3xl font-black text-white">{year}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cuerpo del certificado */}
                <div className="px-12 py-10 space-y-8">
                    {/* Título */}
                    <div className="text-center space-y-1">
                        <h1 className="text-xl font-black uppercase tracking-widest text-slate-900">
                            Certificado de Retención en la Fuente
                        </h1>
                        <p className="text-xs text-indigo-600 font-black uppercase tracking-widest">
                            Renta y Complementarios — Artículo 381 del Estatuto Tributario
                        </p>
                    </div>

                    {/* Cuerpo legal */}
                    <div className="bg-slate-50 rounded-2xl p-6 text-sm text-slate-700 leading-relaxed">
                        <p>
                            La sociedad <strong>{company_info?.name ?? 'GVM CORP'}</strong>, identificada con NIT{' '}
                            <strong>{company_info?.nit ?? '—'}{company_info?.dv ? `-${company_info.dv}` : ''}</strong>,
                            certifica que a{' '}
                            <strong>{party?.legal_name?.toUpperCase()}</strong>, identificado(a) con{' '}
                            {party?.doc_type ?? 'NIT'} número <strong>{party?.doc_number}</strong>
                            {party?.dv ? `-${party.dv}` : ''}, le practicó retenciones en la fuente a título de
                            Renta y Complementarios durante el año fiscal <strong>{year}</strong>, de acuerdo con
                            las disposiciones del Estatuto Tributario colombiano.
                        </p>
                    </div>

                    {/* Tabla de retenciones */}
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                            Detalle de Retenciones Practicadas
                        </p>
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="bg-slate-900 text-white">
                                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest">Concepto Tributario</th>
                                    <th className="px-5 py-3 text-right text-[10px] font-black uppercase tracking-widest">Base Gravable</th>
                                    <th className="px-5 py-3 text-center text-[10px] font-black uppercase tracking-widest">Tarifa</th>
                                    <th className="px-5 py-3 text-right text-[10px] font-black uppercase tracking-widest">Valor Retenido</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-5 py-8 text-center text-slate-400 font-medium">
                                            Sin retenciones registradas para este tercero en {year}
                                        </td>
                                    </tr>
                                ) : items.map((item, i) => (
                                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                        <td className="px-5 py-4 font-bold text-slate-900">{item.account_name}</td>
                                        <td className="px-5 py-4 text-right font-mono text-slate-600">
                                            ${item.base_amount.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-5 py-4 text-center text-slate-600">{item.rate}%</td>
                                        <td className="px-5 py-4 text-right font-black text-indigo-700">
                                            ${item.tax_amount.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-slate-900 text-white">
                                    <td colSpan={3} className="px-5 py-4 text-right font-black uppercase text-sm tracking-wide">
                                        Total Retenido
                                    </td>
                                    <td className="px-5 py-4 text-right font-black text-lg">
                                        ${total_withheld.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Pie del certificado */}
                    <div className="space-y-6 pt-4 border-t border-slate-100">
                        <p className="text-sm text-slate-600">
                            El presente certificado se expide en <strong>{company_info?.city ?? 'Bogotá D.C.'}</strong>,
                            el día <strong>{today}</strong>, para ser presentado donde se requiera ante las autoridades
                            tributarias y terceros interesados.
                        </p>

                        <div className="flex justify-between items-end pt-10">
                            <div className="text-center">
                                <div className="border-t-2 border-slate-900 w-48 mb-3" />
                                <p className="text-xs font-black uppercase text-slate-700">{company_info?.name ?? 'GVM Corp'}</p>
                                <p className="text-[10px] text-slate-400">Representante Legal</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] text-slate-300 font-mono">Generado: {today}</p>
                                <p className="text-[9px] text-slate-300 font-mono">Art. 381 E.T. · GVM ERP v3</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
