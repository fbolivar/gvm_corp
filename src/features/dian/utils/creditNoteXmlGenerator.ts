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

interface CreditNoteXmlParams {
    document: Document;
    cufe: string; // For Credit Notes it is called CUDE but technically same format
    originalInvoiceNumber: string;
    originalInvoiceCufe: string;
    originalInvoiceDate: string;
    softwareId: string;
    pin: string;
    qrcode: string;
    provider: {
        nit: string;
        dv: string;
        name: string;
        email: string;
    }
}

export const generateCreditNoteXml = ({
    document, cufe, originalInvoiceNumber, originalInvoiceCufe, originalInvoiceDate,
    softwareId, pin, qrcode, provider
}: CreditNoteXmlParams): string => {

    const issueDate = document.issue_date;
    const issueTime = format(new Date(), 'HH:mm:ss') + '-05:00';
    const subtotal = document.subtotal.toFixed(2);
    const taxAmount = document.taxes.toFixed(2);
    const total = document.total.toFixed(2);

    return `<?xml version="1.0" encoding="UTF-8"?>
<CreditNote xmlns="urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2" 
    xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" 
    xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" 
    xmlns:ds="http://www.w3.org/2000/09/xmldsig#" 
    xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2" 
    xmlns:sts="dian:gov:co:facturaelectronica:Structures-2-1" 
    xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" 
    xmlns:xades141="http://uri.etsi.org/01903/v1.4.1#" 
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
    xsi:schemaLocation="urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2 http://docs.oasis-open.org/ubl/os-UBL-2.1/xsd/maindoc/UBL-CreditNote-2.1.xsd">
    
    <ext:UBLExtensions>
        <ext:UBLExtension>
            <ext:ExtensionContent>
                <sts:DianExtensions>
                    <sts:SoftwareProvider>
                        <sts:ProviderID schemeAgencyID="195" schemeAgencyName="CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)" schemeID="0" schemeName="31">800197268</sts:ProviderID>
                        <sts:SoftwareID schemeAgencyID="195" schemeAgencyName="CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)">${softwareId}</sts:SoftwareID>
                    </sts:SoftwareProvider>
                    <sts:SoftwareSecurityCode schemeAgencyID="195" schemeAgencyName="CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)">placeholder-security-code</sts:SoftwareSecurityCode>
                    <sts:AuthorizationProvider>
                        <sts:AuthorizationProviderID schemeAgencyID="195" schemeAgencyName="CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)" schemeID="4" schemeName="31">800197268</sts:AuthorizationProviderID>
                    </sts:AuthorizationProvider>
                    <sts:QRCode>${escapeXml(qrcode)}</sts:QRCode>
                </sts:DianExtensions>
            </ext:ExtensionContent>
        </ext:UBLExtension>
        <ext:UBLExtension>
            <ext:ExtensionContent><!-- SIGNATURE_PLACEHOLDER --></ext:ExtensionContent>
        </ext:UBLExtension>
    </ext:UBLExtensions>

    <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
    <cbc:CustomizationID>20</cbc:CustomizationID>
    <cbc:ProfileID>DIAN 2.1: Nota Crédito de Factura Electrónica de Venta</cbc:ProfileID>
    <cbc:ProfileExecutionID>1</cbc:ProfileExecutionID>
    <cbc:ID>${document.number}</cbc:ID>
    <cbc:UUID schemeID="1" schemeName="CUDE-SHA384">${cufe}</cbc:UUID>
    <cbc:IssueDate>${issueDate}</cbc:IssueDate>
    <cbc:IssueTime>${issueTime}</cbc:IssueTime>
    <cbc:CreditNoteTypeCode listAgencyID="195" listAgencyName="CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)" listID="91">91</cbc:CreditNoteTypeCode>
    <cbc:Note>Nota Crédito Generada por SaaS Factory V3</cbc:Note>
    <cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>

    <cac:DiscrepancyResponse>
        <cbc:ReferenceID>${originalInvoiceNumber}</cbc:ReferenceID>
        <cbc:ResponseCode>2</cbc:ResponseCode>
        <cbc:Description>Anulación de factura electrónica</cbc:Description>
    </cac:DiscrepancyResponse>

    <cac:BillingReference>
        <cac:InvoiceDocumentReference>
            <cbc:ID>${originalInvoiceNumber}</cbc:ID>
            <cbc:UUID schemeName="CUFE-SHA384">${originalInvoiceCufe}</cbc:UUID>
            <cbc:IssueDate>${originalInvoiceDate}</cbc:IssueDate>
        </cac:InvoiceDocumentReference>
    </cac:BillingReference>

    <cac:AccountingSupplierParty>
        <cbc:AdditionalAccountID>1</cbc:AdditionalAccountID>
        <cac:Party>
            <cac:PartyTaxScheme>
                <cbc:RegistrationName>${escapeXml(provider.name)}</cbc:RegistrationName>
                <cbc:CompanyID schemeID="${provider.dv}" schemeName="31">${provider.nit}</cbc:CompanyID>
                <cac:TaxScheme><cbc:ID>01</cbc:ID><cbc:Name>IVA</cbc:Name></cac:TaxScheme>
            </cac:PartyTaxScheme>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${escapeXml(provider.name)}</cbc:RegistrationName>
                <cbc:CompanyID schemeID="${provider.dv}" schemeName="31">${provider.nit}</cbc:CompanyID>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingSupplierParty>

    <cac:AccountingCustomerParty>
        <cbc:AdditionalAccountID>1</cbc:AdditionalAccountID>
        <cac:Party>
            <cac:PartyTaxScheme>
                <cbc:RegistrationName>${escapeXml(document.party?.legal_name || 'Consumidor Final')}</cbc:RegistrationName>
                <cbc:CompanyID schemeID="${document.party?.dv || ''}" schemeName="31">${document.party?.doc_number || '222222222222'}</cbc:CompanyID>
                <cac:TaxScheme><cbc:ID>01</cbc:ID><cbc:Name>IVA</cbc:Name></cac:TaxScheme>
            </cac:PartyTaxScheme>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${escapeXml(document.party?.legal_name || 'Consumidor Final')}</cbc:RegistrationName>
                <cbc:CompanyID schemeID="${document.party?.dv || ''}" schemeName="31">${document.party?.doc_number || '222222222222'}</cbc:CompanyID>
            </cac:PartyLegalEntity>
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

</CreditNote>`;
};

const generateLineXml = (line: DocumentLine, index: number) => {
    const lineTotal = (line.qty * line.unit_price).toFixed(2);
    const unitPrice = line.unit_price.toFixed(2);
    return `
    <cac:CreditNoteLine>
        <cbc:ID>${index}</cbc:ID>
        <cbc:CreditedQuantity unitCode="94">${line.qty}</cbc:CreditedQuantity>
        <cbc:LineExtensionAmount currencyID="COP">${lineTotal}</cbc:LineExtensionAmount>
        <cac:Item>
            <cbc:Description>${escapeXml(line.description)}</cbc:Description>
        </cac:Item>
        <cac:Price>
            <cbc:PriceAmount currencyID="COP">${unitPrice}</cbc:PriceAmount>
        </cac:Price>
    </cac:CreditNoteLine>`;
}
