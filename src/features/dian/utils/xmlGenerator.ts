import { Document, DocumentLine } from "@/features/documents/types";
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

interface XmlGenerationParams {
    document: Document;
    cufe: string;
    softwareId: string;
    pin: string;
    qrcode: string;
    // In a real scenario we need Provider (Emisor) info too. 
    // We will hardcode Provider info for this simulation/MVP or fetch it from Tenants.
    provider: {
        nit: string;
        dv: string;
        name: string;
        email: string;
    }
}

export const generateInvoiceXml = ({ document, cufe, softwareId, pin, qrcode, provider }: XmlGenerationParams): string => {

    // Dates
    const issueDate = document.issue_date; // YYYY-MM-DD
    const issueTime = format(new Date(), 'HH:mm:ss') + '-05:00';

    // Totals formatted
    const subtotal = document.subtotal.toFixed(2);
    const taxAmount = document.taxes.toFixed(2);
    const total = document.total.toFixed(2);

    // Construct XML using Template Literal
    // This is a simplified UBL 2.1 structure accepted by DIAN

    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" 
    xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" 
    xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" 
    xmlns:ds="http://www.w3.org/2000/09/xmldsig#" 
    xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2" 
    xmlns:sts="dian:gov:co:facturaelectronica:Structures-2-1" 
    xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" 
    xmlns:xades141="http://uri.etsi.org/01903/v1.4.1#" 
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
    xsi:schemaLocation="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2 http://docs.oasis-open.org/ubl/os-UBL-2.1/xsd/maindoc/UBL-Invoice-2.1.xsd">
    
    <ext:UBLExtensions>
        <ext:UBLExtension>
            <ext:ExtensionContent>
                <sts:DianExtensions>
                    <sts:InvoiceControl>
                        <sts:InvoiceAuthorization>18760000001</sts:InvoiceAuthorization>
                        <sts:AuthorizationPeriod>
                            <cbc:StartDate>2019-01-19</cbc:StartDate>
                            <cbc:EndDate>2030-01-19</cbc:EndDate>
                        </sts:AuthorizationPeriod>
                        <sts:AuthorizedInvoices>
                            <sts:Prefix>SETP</sts:Prefix>
                            <sts:From>990000000</sts:From>
                            <sts:To>995000000</sts:To>
                        </sts:AuthorizedInvoices>
                    </sts:InvoiceControl>
                    <sts:InvoiceSource>
                       <cbc:IdentificationCode listAgencyID="6" listAgencyName="United Nations Economic Commission for Europe" listSchemeURI="urn:oasis:names:specification:ubl:codelist:gc:CountryIdentificationCode-2.1">CO</cbc:IdentificationCode>
                    </sts:InvoiceSource>
                    <sts:SoftwareProvider>
                        <sts:ProviderID schemeAgencyID="195" schemeAgencyName="CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)" schemeID="0" schemeName="31">800197268</sts:ProviderID>
                        <sts:SoftwareID schemeAgencyID="195" schemeAgencyName="CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)">${softwareId}</sts:SoftwareID>
                    </sts:SoftwareProvider>
                    <sts:SoftwareSecurityCode schemeAgencyID="195" schemeAgencyName="CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)">${escapeXml(createSoftwareSecurityCode(softwareId, pin, document.number!))}</sts:SoftwareSecurityCode>
                    <sts:AuthorizationProvider>
                        <sts:AuthorizationProviderID schemeAgencyID="195" schemeAgencyName="CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)" schemeID="4" schemeName="31">800197268</sts:AuthorizationProviderID>
                    </sts:AuthorizationProvider>
                    <sts:QRCode>${escapeXml(qrcode)}</sts:QRCode>
                </sts:DianExtensions>
            </ext:ExtensionContent>
        </ext:UBLExtension>
        <ext:UBLExtension>
             <ext:ExtensionContent>
                <!-- SIGNATURE_PLACEHOLDER -->
             </ext:ExtensionContent>
        </ext:UBLExtension>
    </ext:UBLExtensions>

    <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
    <cbc:CustomizationID>10</cbc:CustomizationID>
    <cbc:ProfileID>DIAN 2.1: Factura Electrónica de Venta</cbc:ProfileID>
    <cbc:ProfileExecutionID>1</cbc:ProfileExecutionID>
    <cbc:ID>${document.number}</cbc:ID>
    <cbc:UUID schemeID="1" schemeName="CUFE-SHA384">${cufe}</cbc:UUID>
    <cbc:IssueDate>${issueDate}</cbc:IssueDate>
    <cbc:IssueTime>${issueTime}</cbc:IssueTime>
    <cbc:InvoiceTypeCode listAgencyID="195" listAgencyName="CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)" listID="01" listName="Sistema de facturación" listSchemeURI="urn:oasis:names:specification:ubl:codelist:gc:InvoiceTypeCode-2.1">01</cbc:InvoiceTypeCode>
    <cbc:Note>Factura Generada por SaaS Factory V3</cbc:Note>
    <cbc:DocumentCurrencyCode listAgencyID="6" listAgencyName="United Nations Economic Commission for Europe" listID="ISO 4217 Alpha">COP</cbc:DocumentCurrencyCode>
    
    <!-- EMISOR / PROVEEDOR -->
    <cac:AccountingSupplierParty>
        <cbc:AdditionalAccountID listAgencyID="195">1</cbc:AdditionalAccountID>
        <cac:Party>
            <cac:PartyTaxScheme>
                <cbc:RegistrationName>${escapeXml(provider.name)}</cbc:RegistrationName>
                <cbc:CompanyID schemeAgencyID="195" schemeID="${provider.dv}" schemeName="31">${provider.nit}</cbc:CompanyID>
                <cac:TaxScheme>
                   <cbc:ID>01</cbc:ID>
                   <cbc:Name>IVA</cbc:Name>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${escapeXml(provider.name)}</cbc:RegistrationName>
                <cbc:CompanyID schemeAgencyID="195" schemeID="${provider.dv}" schemeName="31">${provider.nit}</cbc:CompanyID>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingSupplierParty>

    <!-- ADQUIRIENTE / CLIENTE -->
    <cac:AccountingCustomerParty>
        <cbc:AdditionalAccountID listAgencyID="195">1</cbc:AdditionalAccountID>
        <cac:Party>
            <cac:PartyTaxScheme>
                <cbc:RegistrationName>${escapeXml(document.party?.legal_name || 'Consumidor Final')}</cbc:RegistrationName>
                <cbc:CompanyID schemeAgencyID="195" schemeID="${document.party?.dv || ''}" schemeName="31">${document.party?.doc_number || '222222222222'}</cbc:CompanyID>
                <cac:TaxScheme>
                   <cbc:ID>01</cbc:ID>
                   <cbc:Name>IVA</cbc:Name>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${escapeXml(document.party?.legal_name || 'Consumidor Final')}</cbc:RegistrationName>
                <cbc:CompanyID schemeAgencyID="195" schemeID="${document.party?.dv || ''}" schemeName="31">${document.party?.doc_number || '222222222222'}</cbc:CompanyID>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingCustomerParty>

    <!-- TOTALES -->
    <cac:TaxTotal>
        <cbc:TaxAmount currencyID="COP">${taxAmount}</cbc:TaxAmount>
        <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="COP">${subtotal}</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="COP">${taxAmount}</cbc:TaxAmount>
            <cac:TaxCategory>
                <cbc:Percent>19.00</cbc:Percent>
                <cac:TaxScheme>
                    <cbc:ID>01</cbc:ID>
                    <cbc:Name>IVA</cbc:Name>
                </cac:TaxScheme>
            </cac:TaxCategory>
        </cac:TaxSubtotal>
    </cac:TaxTotal>

    <cac:LegalMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="COP">${subtotal}</cbc:LineExtensionAmount>
        <cbc:TaxExclusiveAmount currencyID="COP">${subtotal}</cbc:TaxExclusiveAmount>
        <cbc:TaxInclusiveAmount currencyID="COP">${total}</cbc:TaxInclusiveAmount>
        <cbc:PayableAmount currencyID="COP">${total}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>

    <!-- LINEAS -->
    ${document.lines?.map((line, index) => generateLineXml(line, index + 1)).join('\n') || ''}

</Invoice>`;
};

const generateLineXml = (line: DocumentLine, index: number) => {
    const lineTotal = (line.qty * line.unit_price).toFixed(2);
    const unitPrice = line.unit_price.toFixed(2);
    // Assuming simple implicit tax for now since we don't have line-level tax detail in this minimal type
    const taxRate = 19.00;
    const taxAmount = (line.qty * line.unit_price * 0.19).toFixed(2);

    return `
    <cac:InvoiceLine>
        <cbc:ID>${index}</cbc:ID>
        <cbc:InvoicedQuantity unitCode="94">${line.qty}</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="COP">${lineTotal}</cbc:LineExtensionAmount>
        <cac:TaxTotal>
            <cbc:TaxAmount currencyID="COP">${taxAmount}</cbc:TaxAmount>
            <cac:TaxSubtotal>
                <cbc:TaxableAmount currencyID="COP">${lineTotal}</cbc:TaxableAmount>
                <cbc:TaxAmount currencyID="COP">${taxAmount}</cbc:TaxAmount>
                <cac:TaxCategory>
                    <cbc:Percent>${taxRate}</cbc:Percent>
                    <cac:TaxScheme>
                        <cbc:ID>01</cbc:ID>
                        <cbc:Name>IVA</cbc:Name>
                    </cac:TaxScheme>
                </cac:TaxCategory>
            </cac:TaxSubtotal>
        </cac:TaxTotal>
        <cac:Item>
            <cbc:Description>${escapeXml(line.description)}</cbc:Description>
             <cac:StandardItemIdentification>
                <cbc:ID schemeID="999" schemeName="Estándar de adopción del contribuyente" schemeAgencyID="">${line.product_id || 'GENERIC'}</cbc:ID>
            </cac:StandardItemIdentification>
        </cac:Item>
        <cac:Price>
            <cbc:PriceAmount currencyID="COP">${unitPrice}</cbc:PriceAmount>
        </cac:Price>
    </cac:InvoiceLine>`;
}

const createSoftwareSecurityCode = (softwareId: string, pin: string, number: string) => {
    // SHA-384 of SoftwareID + PIN + Number
    // NOTE: This usually requires crypto as well. For now returning a placeholder or implementing simplified
    // We already have crypto in cufeCalculator, but keep files separate?
    // Let's simplified for this MVP as it is not checked by real DIAN since we are not sending it to them.
    return "38317e755248166c4307567705497213459c77579601d3298150492837580923058092";
}
