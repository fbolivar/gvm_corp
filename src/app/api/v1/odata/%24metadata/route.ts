import { NextResponse } from 'next/server';

export async function GET() {
    const edmx = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="GVMCorp" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      <EntityType Name="Document">
        <Key><PropertyRef Name="id"/></Key>
        <Property Name="id" Type="Edm.Guid" Nullable="false"/>
        <Property Name="number" Type="Edm.String"/>
        <Property Name="doc_type" Type="Edm.String"/>
        <Property Name="status" Type="Edm.String"/>
        <Property Name="subtotal" Type="Edm.Decimal"/>
        <Property Name="tax" Type="Edm.Decimal"/>
        <Property Name="total" Type="Edm.Decimal"/>
        <Property Name="balance" Type="Edm.Decimal"/>
        <Property Name="currency" Type="Edm.String"/>
        <Property Name="issue_date" Type="Edm.Date"/>
        <Property Name="created_at" Type="Edm.DateTimeOffset"/>
      </EntityType>
      <EntityType Name="Party">
        <Key><PropertyRef Name="id"/></Key>
        <Property Name="id" Type="Edm.Guid" Nullable="false"/>
        <Property Name="legal_name" Type="Edm.String"/>
        <Property Name="trade_name" Type="Edm.String"/>
        <Property Name="doc_type" Type="Edm.String"/>
        <Property Name="doc_number" Type="Edm.String"/>
        <Property Name="is_customer" Type="Edm.Boolean"/>
        <Property Name="is_vendor" Type="Edm.Boolean"/>
      </EntityType>
      <EntityType Name="Product">
        <Key><PropertyRef Name="id"/></Key>
        <Property Name="id" Type="Edm.Guid" Nullable="false"/>
        <Property Name="sku" Type="Edm.String"/>
        <Property Name="name" Type="Edm.String"/>
        <Property Name="type" Type="Edm.String"/>
        <Property Name="selling_price" Type="Edm.Decimal"/>
        <Property Name="cost" Type="Edm.Decimal"/>
        <Property Name="status" Type="Edm.String"/>
      </EntityType>
      <EntityType Name="JournalEntry">
        <Key><PropertyRef Name="id"/></Key>
        <Property Name="id" Type="Edm.Guid" Nullable="false"/>
        <Property Name="entry_date" Type="Edm.Date"/>
        <Property Name="description" Type="Edm.String"/>
        <Property Name="period" Type="Edm.String"/>
        <Property Name="created_at" Type="Edm.DateTimeOffset"/>
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="documents" EntityType="GVMCorp.Document"/>
        <EntitySet Name="parties" EntityType="GVMCorp.Party"/>
        <EntitySet Name="products" EntityType="GVMCorp.Product"/>
        <EntitySet Name="journal_entries" EntityType="GVMCorp.JournalEntry"/>
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;

    return new NextResponse(edmx, {
        headers: {
            'Content-Type': 'application/xml',
            'OData-Version': '4.0',
        },
    });
}
