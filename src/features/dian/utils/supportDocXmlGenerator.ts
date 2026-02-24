import { Document, DocumentLine } from "@/features/documents/types";
import { format } from "date-fns";

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

interface SupportDocXmlParams {
    document: Document;
    cufe: string; // Called CUDS for support document
    softwareId: string;
    pin: string;
    qrcode: string;
    provider: { // Emisor matches the buyer in this case
        nit: string;
        dv: string;
        name: string;
        email: string;
    }
}

export const generateSupportDocXml = ({ document, cufe, softwareId, pin, qrcode, provider }: SupportDocXmlParams): string => {
    const issueDate = document.issue_date;
    const issueTime = format(new Date(), 'HH:mm:ss') + '-05:00';
    const subtotal = document.subtotal.toFixed(2);
    const taxAmount = document.taxes.toFixed(2);
    const total = document.total.toFixed(2);

    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" 
    xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" 
    xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" 
    xmlns:ds="http://www.w3.org/2000/09/xmldsig#" 
    xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2" 
    xmlns:sts="dian:gov:co:facturaelectronica:Structures-2-1" 
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
    xsi:schemaLocation="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2 http://docs.oasis-open.org/ubl/os-UBL-2.1/xsd/maindoc/UBL-Invoice-2.1.xsd">
    
    <ext:UBLExtensions>
        <ext:UBLExtension>
            <ext:ExtensionContent>
                <sts:DianExtensions>
                    <sts:SoftwareProvider>
                        <sts:ProviderID schemeAgencyID="195" schemeID="0" schemeName="31">800197268</sts:ProviderID>
                        <sts:SoftwareID>${softwareId}</sts:SoftwareID>
                    </sts:SoftwareProvider>
                    <sts:SoftwareSecurityCode>placeholder-security-code</sts:SoftwareSecurityCode>
                    <sts:QRCode>${escapeXml(qrcode)}</sts:QRCode>
                </sts:DianExtensions>
            </ext:ExtensionContent>
        </ext:UBLExtension>
    </ext:UBLExtensions>

    <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
    <cbc:CustomizationID>1</cbc:CustomizationID>
    <cbc:ProfileID>DIAN 2.1: Documento Soporte en adquisiciones efectuadas a no obligados a facturar</cbc:ProfileID>
    <cbc:ProfileExecutionID>1</cbc:ProfileExecutionID>
    <cbc:ID>${document.number}</cbc:ID>
    <cbc:UUID schemeID="1" schemeName="CUDS-SHA384">${cufe}</cbc:UUID>
    <cbc:IssueDate>${issueDate}</cbc:IssueDate>
    <cbc:IssueTime>${issueTime}</cbc:IssueTime>
    <cbc:InvoiceTypeCode listID="05">05</cbc:InvoiceTypeCode>
    <cbc:Note>Documento Soporte Generado por SaaS Factory V3</cbc:Note>
    <cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>

    <cac:AccountingSupplierParty>
        <cbc:AdditionalAccountID>1</cbc:AdditionalAccountID>
        <cac:Party>
            <cac:PartyTaxScheme>
                <cbc:RegistrationName>${escapeXml(provider.name)}</cbc:RegistrationName>
                <cbc:CompanyID schemeID="${provider.dv}" schemeName="31">${provider.nit}</cbc:CompanyID>
                <cac:TaxScheme><cbc:ID>01</cbc:ID><cbc:Name>IVA</cbc:Name></cac:TaxScheme>
            </cac:PartyTaxScheme>
        </cac:Party>
    </cac:AccountingSupplierParty>

    <cac:AccountingCustomerParty>
        <cbc:AdditionalAccountID>1</cbc:AdditionalAccountID>
        <cac:Party>
            <cac:PartyTaxScheme>
                <cbc:RegistrationName>${escapeXml(document.party?.legal_name || 'Vendedor No Obligado')}</cbc:RegistrationName>
                <cbc:CompanyID schemeID="${document.party?.dv || ''}" schemeName="31">${document.party?.doc_number || '222222222222'}</cbc:CompanyID>
                <cac:TaxScheme><cbc:ID>01</cbc:ID><cbc:Name>IVA</cbc:Name></cac:TaxScheme>
            </cac:PartyTaxScheme>
        </cac:Party>
    </cac:AccountingCustomerParty>

    <cac:TaxTotal>
        <cbc:TaxAmount currencyID="COP">${taxAmount}</cbc:TaxAmount>
        <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="COP">${subtotal}</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="COP">${taxAmount}</cbc:TaxAmount>
            <cac:TaxCategory>
                <cbc:Percent>19.00</cbc:Percent>
                <cac:TaxScheme><cbc:ID>01</cbc:ID><cbc:Name>IVA</cbc:Name></cac:TaxScheme>
            </cac:TaxCategory>
        </cac:TaxSubtotal>
    </cac:TaxTotal>

    <cac:LegalMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="COP">${subtotal}</cbc:LineExtensionAmount>
        <cbc:TaxExclusiveAmount currencyID="COP">${subtotal}</cbc:TaxExclusiveAmount>
        <cbc:TaxInclusiveAmount currencyID="COP">${total}</cbc:TaxInclusiveAmount>
        <cbc:PayableAmount currencyID="COP">${total}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>

    ${document.lines?.map((line, index) => generateLineXml(line, index + 1)).join('\n') || ''}

</Invoice>`;
};

const generateLineXml = (line: DocumentLine, index: number) => {
    const lineTotal = (line.qty * line.unit_price).toFixed(2);
    const unitPrice = line.unit_price.toFixed(2);
    return `
    <cac:InvoiceLine>
        <cbc:ID>${index}</cbc:ID>
        <cbc:InvoicedQuantity unitCode="94">${line.qty}</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="COP">${lineTotal}</cbc:LineExtensionAmount>
        <cac:Item>
            <cbc:Description>${escapeXml(line.description)}</cbc:Description>
        </cac:Item>
        <cac:Price>
            <cbc:PriceAmount currencyID="COP">${unitPrice}</cbc:PriceAmount>
        </cac:Price>
    </cac:InvoiceLine>`;
}
