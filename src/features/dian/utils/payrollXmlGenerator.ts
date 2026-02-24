import { Document } from "@/features/documents/types";
import { format } from "date-fns";

/**
 * Helper to escape XML special characters
 */
const escapeXml = (unsafe: string) => {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
};

interface PayrollXmlParams {
    document: Document;
    cune: string;
    softwareId: string;
    pin: string;
    provider: {
        nit: string;
        dv: string;
        name: string;
        email: string;
    }
}

/**
 * Generates a compliant Payroll XML (Nomina Electronica) UBL 2.1
 * Maps categories to specific DIAN tags according to Annex 1.0
 */
export const generatePayrollXml = ({ document, cune, softwareId, pin, provider }: PayrollXmlParams): string => {
    const issueDate = document.issue_date;
    const issueTime = format(new Date(), 'HH:mm:ss') + '-05:00';

    // Totals logic
    const devengadosTotal = document.lines?.filter(l => l.unit_price > 0).reduce((sum, l) => sum + l.line_total, 0) || 0;
    const deduccionesTotal = Math.abs(document.lines?.filter(l => l.unit_price < 0).reduce((sum, l) => sum + l.line_total, 0) || 0);
    const neto = document.total;

    // Specific Concepts extraction for XML tags
    // Usually, we identify these by description or a metadata field if we had one.
    // For now, let's use name-based matching or simple categorized filtering if we had and RPC.
    // In our implementation, we'll look at the lines.
    const basico = document.lines?.find(l => l.description === 'Sueldo Básico')?.line_total || 0;
    const transporte = document.lines?.find(l => l.description === 'Auxilio de Transporte')?.line_total || 0;
    const salud = Math.abs(document.lines?.find(l => l.description?.includes('Salud'))?.line_total || 0);
    const pension = Math.abs(document.lines?.find(l => l.description?.includes('Pensión'))?.line_total || 0);

    return `<?xml version="1.0" encoding="UTF-8"?>
<NominaElectronica xmlns="dian:gov:co:facturaelectronica:NominaElectronica" 
    xmlns:xs="http://www.w3.org/2001/XMLSchema-instance" 
    xmlns:ds="http://www.w3.org/2000/09/xmldsig#" 
    xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2" 
    xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" 
    xmlns:xades141="http://uri.etsi.org/01903/v1.4.1#" 
    xsi:schemaLocation="dian:gov:co:facturaelectronica:NominaElectronica NominaElectronicaXSD.xsd">
    
    <ext:UBLExtensions>
        <ext:UBLExtension>
            <ext:ExtensionContent>
                <!-- SIGNATURE_PLACEHOLDER -->
            </ext:ExtensionContent>
        </ext:UBLExtension>
    </ext:UBLExtensions>

    <UnidadTiempo>1</UnidadTiempo>
    <TipoXML>102</TipoXML>
    <Numero>${document.number}</Numero>
    <CUNE>${cune}</CUNE>
    <FechaGen>${issueDate}</FechaGen>
    <HoraGen>${issueTime}</HoraGen>
    
    <InformacionGeneral>
        <Version>V1.0: Documento Soporte de Pago de Nómina Electrónica</Version>
        <Ambiente>2</Ambiente>
        <TipoTransmision>1</TipoTransmision>
    </InformacionGeneral>

    <Empleador>
        <RazonSocial>${escapeXml(provider.name)}</RazonSocial>
        <NIT>${provider.nit}</NIT>
        <DV>${provider.dv}</DV>
    </Empleador>

    <Trabajador>
        <TipoTrabajador>01</TipoTrabajador>
        <PrimerApellido>TEST</PrimerApellido>
        <PrimerNombre>${escapeXml(document.party?.legal_name || 'Empleado')}</PrimerNombre>
        <TipoDocumento>13</TipoDocumento>
        <NumeroDocumento>${document.party?.doc_number || ''}</NumeroDocumento>
    </Trabajador>
    
    <Pago>
        <Forma>1</Forma>
        <Metodo>10</Metodo>
    </Pago>

    <Devengados>
        <Basico DiasTrabajados="30" SueldoTrabajado="${basico.toFixed(2)}" />
        ${transporte > 0 ? `<Transporte AuxilioTransporte="${transporte.toFixed(2)}" />` : ''}
    </Devengados>
    
    <Deducciones>
        <Salud Porcentaje="4.00" Deduccion="${salud.toFixed(2)}" />
        <Pension Porcentaje="4.00" Deduccion="${pension.toFixed(2)}" />
    </Deducciones>

    <DevengadosTotal>${devengadosTotal.toFixed(2)}</DevengadosTotal>
    <DeduccionesTotal>${deduccionesTotal.toFixed(2)}</DeduccionesTotal>
    <ComprobanteTotal>${neto.toFixed(2)}</ComprobanteTotal>

</NominaElectronica>`;
};
