import {
    LayoutDashboard,
    Users,
    ShoppingCart,
    Truck,
    Boxes,
    Factory,
    Calculator,
    Wallet,
    Briefcase,
    ShieldCheck,
    Package,
    Building,
    FileText,
    Settings,
    MessageSquare,
    Headphones,
    Zap,
    Monitor
} from "lucide-react";

export const sectionsEn = [
    {
        id: "onboarding",
        title: "Onboarding — Quick Start",
        icon: Zap,
        color: "text-amber-600",
        bg: "bg-amber-50",
        content: {
            description: "Welcome to GVM S.A.S! This guide will help you set up your ERP for the first time. Follow the master steps to have your company operating in less than 30 minutes.",
            features: [
                "Quick setup of legal and fiscal data",
                "Initial bulk upload of products and services",
                "Linking bank accounts and cash registers",
                "Activation of DIAN electronic invoicing",
                "Structuring administrative users and permissions"
            ],
            workflow: [
                { step: 1, title: "Company Profile", description: "Complete the NIT, address, and logo in Settings > Company. This is vital for your legal documents." },
                { step: 2, title: "Third Parties Master", description: "Load your main customers and suppliers. You can import from Excel or create them manually in Third Parties." },
                { step: 3, title: "Master Catalog", description: "Register your products or services in the Products module. Define their sales prices and base costs." },
                { step: 4, title: "Setup Treasury", description: "Create your bank accounts and cash registers in Treasury > Accounts. Record initial opening balances." },
                { step: 5, title: "DIAN Enablement", description: "Configure your billing resolution in the DIAN module to start issuing officially." }
            ],
            tips: [
                "Use the 'Overview' button in each module to understand its specific dashboard",
                "Invite your team from Settings > Users to assign responsibilities",
                "Consult the 'Express Training' videos in the Support section"
            ]
        }
    },
    {
        id: "overview",
        title: "Overview",
        icon: LayoutDashboard,
        color: "text-indigo-600",
        bg: "bg-indigo-50",
        content: {
            description: "GVM S.A.S is a comprehensive ERP (Enterprise Resource Planning) system designed for complete business management. The application integrates sales, purchasing, inventory, production, accounting, treasury, payroll, and DIAN electronic invoicing modules into a single unified platform. When you log in, you access the main Dashboard that shows the most relevant KPIs of your business in real time.",
            features: [
                "Executive Dashboard with real-time financial and operational KPIs",
                "Sidebar navigation with direct access to all modules",
                "Integrated notification system with real-time alerts",
                "Secure authentication with 2FA (two-factor authentication) support",
                "Responsive interface adapted for desktop and tablets",
                "Intelligent search for documents, articles, and contacts",
                "Recent activity history on the main panel"
            ],
            tips: [
                "Use the Dashboard as your daily starting point to monitor business status",
                "KPIs update automatically — no need to refresh the page",
                "You can customize your profile and preferences from Settings > Profile"
            ]
        }
    },
    {
        id: "crm",
        title: "CRM — Sales Management",
        icon: Users,
        color: "text-blue-600",
        bg: "bg-blue-50",
        content: {
            description: "The CRM (Customer Relationship Management) module allows you to manage your sales pipeline from lead generation to closing opportunities. Organize your leads, follow up on opportunities, and convert prospects into active customers.",
            features: [
                "Lead Management — Register prospects with name, email, phone, and source",
                "Kanban Pipeline — Visualize opportunities in a board format with drag & drop stages",
                "Lead Conversion — Convert qualified leads into pipeline opportunities",
                "Pipeline Valuation — See the total monetary value of your opportunities",
                "Configurable Stages — New, Contacted, Proposed, Negotiation, Closed Won/Lost"
            ],
            workflow: [
                { step: 1, title: "Register Lead", description: "Go to CRM > Leads > New Lead. Complete prospect data including capture source." },
                { step: 2, title: "Qualify Lead", description: "Review lead list. Contact the prospect and validate interest." },
                { step: 3, title: "Convert to Opportunity", description: "From lead details, use 'Convert to Opportunity' to move it to the sales pipeline." },
                { step: 4, title: "Manage Pipeline", description: "In CRM > Pipeline, drag opportunities between stages as the negotiation progresses." },
                { step: 5, title: "Close Sale", description: "When closed as Won, the system can automatically generate a sales quote." }
            ],
            subsections: [
                { title: "Leads", path: "/crm/leads", description: "List and management of sales prospects" },
                { title: "Pipeline", path: "/crm/pipeline", description: "Kanban board for sales opportunities" }
            ],
            tips: [
                "ALWAYS record the lead source to measure which channel generates more sales",
                "Update pipeline stages daily for real visibility of the funnel",
                "Use notes to leave important context on each commercial interaction"
            ]
        }
    },
    {
        id: "sales",
        title: "Sales",
        icon: ShoppingCart,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        content: {
            description: "The Sales module manages the complete commercial flow, from quotation to invoicing. Includes the Sales Funnel showing the conversion statistics of leads → quotations → orders. The system allows creating documents, converting between types, and issuing them electronically to the DIAN.",
            features: [
                "Sales Funnel Dashboard — Visualize the Leads → Quotations → Orders funnel",
                "Quotations — Create sales proposals with products, quantities, and prices",
                "Sales Orders — Confirm approved quotations and generate orders",
                "Sales Invoices — Generate electronic invoices from confirmed orders",
                "Automatic Conversion — Quotation → Order → Invoice in one click",
                "DIAN Issuance — Send electronic invoices directly to the DIAN"
            ],
            workflow: [
                { step: 1, title: "Create Quotation", description: "Go to Sales > Quotations > New. Select customer, add product lines with quantity and unit price." },
                { step: 2, title: "Send Quotation", description: "Review total and click 'Send'. The customer will receive the proposal by email." },
                { step: 3, title: "Convert to Order", description: "When the customer accepts, convert the quotation to a Sales Order via the 'Order' button." },
                { step: 4, title: "Generate Invoice", description: "From the order, click 'Invoice' to create the sales invoice." },
                { step: 5, title: "Issue to DIAN", description: "The DRAFT invoice can be officially issued. The system generates XML, CUFE, and QR." }
            ],
            subsections: [
                { title: "Quotations", path: "/sales/quotations", description: "Commercial proposals to customers" },
                { title: "Sales Orders", path: "/sales/orders", description: "Sales confirmations" }
            ],
            tips: [
                "Always check VAT before issuing — once issued to DIAN, it cannot be modified",
                "Recommended flow: Quotation → Order → Invoice → DIAN Issuance",
                "You can view full document history in the 'Documents' section"
            ]
        }
    },
    {
        id: "purchasing",
        title: "Purchasing",
        icon: Truck,
        color: "text-violet-600",
        bg: "bg-violet-50",
        content: {
            description: "The Purchasing module controls the acquisition of raw materials, supplies, and services. From creating purchase orders to registering vendor bills, the system automatically integrates movements with inventory and accounting.",
            features: [
                "Purchasing Dashboard — KPIs for pending, received orders and total amount",
                "Purchase Orders — Request products from vendors with quantities and costs",
                "Vendor Bills — Register invoices received from your vendors",
                "Automatic Conversion — Purchase Order → Vendor Bill",
                "Inventory Integration — Purchases automatically update stock",
                "Accounting Integration — Automatic journal entries are generated"
            ],
            workflow: [
                { step: 1, title: "Create Purchase Order", description: "Go to Purchasing > Orders > New. Select vendor and add products with quantities and unit costs." },
                { step: 2, title: "Approve Order", description: "Review the order and confirm. Products will be in 'In Transit' state." },
                { step: 3, title: "Receive Goods", description: "Upon receiving products, the system updates inventory automatically." },
                { step: 4, title: "Register Bill", description: "Convert the purchase order into a Vendor Bill or create it manually." },
                { step: 5, title: "Post to Ledger", description: "The system automatically generates the journal entry (Inventory Debit / AP Credit)." }
            ],
            subsections: [
                { title: "Purchase Orders", path: "/purchasing/orders", description: "Requests for purchase from vendors" },
                { title: "Vendor Bills", path: "/purchasing/bills", description: "Invoices received from vendors" }
            ],
            tips: [
                "Always verify vendor Tax ID (NIT) before registering a bill",
                "Compare order prices vs bill to detect discrepancies",
                "Approved purchase orders automatically feed the Kardex"
            ]
        }
    },
    {
        id: "inventory",
        title: "Inventory",
        icon: Boxes,
        color: "text-amber-600",
        bg: "bg-amber-50",
        content: {
            description: "The Inventory module controls real-time stock, manages warehouses, and registers all entry/exit movements. Includes valuation by weighted average cost and a detailed Kardex per product to track every movement.",
            features: [
                "Stock Dashboard — Overview of stock with low stock alerts",
                "Warehouse Management — Manage multiple storage locations",
                "Inventory Movements — Register entries, exits, adjustments, and transfers",
                "Kardex per Product — Detailed history of movements with updated balance",
                "Valuation — Financial report of inventories by weighted average cost (IFRS)",
                "Minimum Stock — Automatic alerts when a product is below minimum"
            ],
            workflow: [
                { step: 1, title: "Configure Warehouses", description: "Go to Inventory > Warehouses. Create at least one main warehouse." },
                { step: 2, title: "Register Initial Stock", description: "Use Inventory > New Movement type 'Adjustment' to enter initial quantities." },
                { step: 3, title: "Monitor Stock", description: "The Inventory Dashboard shows updated stock. Purchase/sale movements update it automatically." },
                { step: 4, title: "Check Kardex", description: "To view a product's full history, click its name to access the Kardex." },
                { step: 5, title: "Generate Valuation", description: "Go to Inventory > Valuation to get the financial report of your stock." }
            ],
            subsections: [
                { title: "Stock Dashboard", path: "/inventory", description: "Overview of stock and movements" },
                { title: "Warehouses", path: "/inventory/warehouses", description: "Storage location management" },
                { title: "New Movement", path: "/inventory/new", description: "Register entry, exit, or adjustment" },
                { title: "Valuation", path: "/inventory/valuation", description: "Financial inventory valuation report" }
            ],
            tips: [
                "ALWAYS set minimum stock for each product for timely alerts",
                "Kardex is your best tool for auditing inventory differences",
                "Valuation must reconcile with the 1435 account in the Trial Balance"
            ]
        }
    },
    {
        id: "logistics",
        title: "Logistics & Shipping",
        icon: Truck,
        color: "text-indigo-600",
        bg: "bg-indigo-50",
        content: {
            description: "The Logistics module manages the delivery process, from carrier selection to shipment tracking. It allows creating dispatch guides, managing internal or external fleets, and monitoring delivery status in real time.",
            features: [
                "Logistics Dashboard — Summary of pending, in-transit, and delivered shipments",
                "Carrier Management — Directory of logistical partners with rates and contacts",
                "Shipment Creation — Generate dispatch guides linked to sales orders",
                "Real-Time Tracking — Delivery status updates and issue reporting",
                "Fleet Management — Control of own vehicles and drivers (optional)",
                "Route Optimization — Delivery planning by geographic zone"
            ],
            workflow: [
                { step: 1, title: "Configure Carriers", description: "Go to Logistics > Carriers. Register your logistical partners with their basic data." },
                { step: 2, title: "Select Orders", description: "In Logistics > Pending Shipments, select the sales orders ready to be sent." },
                { step: 3, title: "Create Shipment Guide", description: "Complete destination data, weight, dimensions, and select the carrier." },
                { step: 4, title: "Issue Document", description: "Print the dispatch guide and attach it to the goods." },
                { step: 5, title: "Monitor Delivery", description: "Update status to 'In Transit' and finally to 'Delivered' upon confirmation of receipt." }
            ],
            subsections: [
                { title: "Logistics Dashboard", path: "/logistics", description: "Transportation operations control panel" },
                { title: "Carriers", path: "/logistics/carriers", description: "Management of shipping partners" },
                { title: "Shipments", path: "/logistics/shipments", description: "Recording and tracking of shipments" }
            ],
            tips: [
                "Group several orders into a single shipment if they are going to the same area to save costs",
                "Always record the carrier's tracking number to facilitate external tracking",
                "Use 'Issues' to document any delay or problem in delivery"
            ]
        }
    },
    {
        id: "production",
        title: "Production",
        icon: Factory,
        color: "text-orange-600",
        bg: "bg-orange-50",
        content: {
            description: "The Production module manages manufacturing operations. It allows defining recipes (Bill of Materials), creating production orders, and controlling raw material consumption vs. finished goods. Ideal for companies that transform inputs into final products.",
            features: [
                "Production Dashboard — KPIs for active, pending, and completed orders",
                "Recipes (BOM) — Define material lists with quantities and ratios for each input",
                "Production Orders — Schedule and execute production based on recipes",
                "Consumption Control — Track raw materials used vs. finished products generated",
                "Order Status — Draft → In Progress → Completed"
            ],
            workflow: [
                { step: 1, title: "Create Recipe", description: "Go to Production > Recipes > New. Define the final product and list inputs with quantities." },
                { step: 2, title: "How to create a recipe", description: "To create a recipe, go to Production > Recipes > New. Assign a name to the final product, select the necessary inputs and define the exact quantity of each for one unit of production." },
                { step: 3, title: "Start Production", description: "Change status to 'In Progress'. The system checks for sufficient raw material stock." },
                { step: 4, title: "Complete Order", description: "Upon finishing, change to 'Completed'. Raw materials are deducted and finished product entered." }
            ],
            subsections: [
                { title: "Dashboard", path: "/production", description: "Production control panel" },
                { title: "Recipes (BOM)", path: "/production/recipes", description: "Material lists and formulas" },
                { title: "Production Orders", path: "/production/orders", description: "Manufacturing orders" }
            ],
            tips: [
                "Ensure sufficient raw material stock BEFORE starting an order",
                "Recipes can have sub-recipes for complex products",
                "Finished product cost is automatically calculated by summing input costs"
            ]
        }
    },
    {
        id: "accounting",
        title: "Central Accounting",
        icon: Calculator,
        color: "text-cyan-600",
        bg: "bg-cyan-50",
        content: {
            description: "The financial brain of GVM S.A.S. Manages the General Ledger, automatic entries, and IFRS reporting. Accounting is the final point of the entire value chain: every sale, purchase, and payment generates exact traceability.",
            features: [
                "Dynamic Chart of Accounts with multilevel PUC hierarchy",
                "Automatic journal entries from all modules",
                "Accounting period management and monthly closings",
                "Certified financial reports (P&L, Balance Sheet, Auxiliaries)",
                "Native integration with Accounts Receivable and Payable",
                "Line-by-line movement audit"
            ],
            workflow: [
                { step: 1, title: "Initial Parameterization", description: "Verify that the Chart of Accounts (PUC) has the necessary auxiliary accounts for your operation." },
                { step: 2, title: "Integration Setup", description: "Define default accounts for sales, purchases, banks, and taxes." },
                { step: 3, title: "Module Operation", description: "Generate invoices, payroll records, and payments. The system will create entries in real time." },
                { step: 4, title: "Reconciliation and Adjustments", description: "Cross treasury balances and record manual entries for bank fees or depreciations." },
                { step: 5, title: "Financial Reporting", description: "Check the Trial Balance to validate matching and issue official reports." }
            ],
            subsections: [
                { title: "Chart of Accounts", path: "/accounting/accounts", description: "Master PUC" },
                { title: "Integrations", path: "/settings/integrations", description: "Bridge between modules" }
            ],
            tips: [
                "Do not delete accounts with balance — use the inactivate option if no longer required",
                "The Auxiliary Ledger is your best tool for detecting data entry or integration errors",
                "Always check that total Assets match Liabilities + Equity"
            ]
        }
    },
    {
        id: "accounting-integrations",
        title: "Accounting Integration Manual",
        icon: Calculator,
        color: "text-purple-600",
        bg: "bg-purple-50",
        content: {
            description: "Technical guide to ensure your business operations flow correctly into the general ledger. Automatic integration saves up to 90% of accounting data entry time.",
            features: [
                "Sales and Revenue Account Mapping",
                "AP Setup per Vendor",
                "Payroll Linking (Expense vs. Liability)",
                "Tax and Withholding Integration",
                "Automatic Entry Audit"
            ],
            workflow: [
                { step: 1, title: "Master Accounts", description: "Associate default Cash, Bank, and VAT accounts in Settings > Company." },
                { step: 2, title: "Product Rules", description: "Define inventory (14) and income (41) accounts for each product family." },
                { step: 3, title: "Third Party Mapping", description: "Ensure customers have account 13 and vendors account 23 according to the PUC." },
                { step: 4, title: "Flow Test", description: "Create a test invoice and verify the entry is correctly generated in Accounting > Entries." },
                { step: 5, title: "Tax Adjustment", description: "Set up Tax Withholding and ICA rates so the system calculates them on each payment/collection." }
            ],
            tips: [
                "If a document does not appear in accounting, check it's not in 'DRAFT' status",
                "Payroll integration requires social security (2370) and salary (2505) accounts",
                "Use the DIAN Control Center to validate CUFE before final posting"
            ]
        }
    },
    {
        id: "treasury",
        title: "Treasury",
        icon: Wallet,
        color: "text-teal-600",
        bg: "bg-teal-50",
        content: {
            description: "The Treasury module controls business liquidity: bank accounts, cash, operational income and expenses. Integrates automatic bank reconciliation and generates corresponding journal entries. Also manages AR and AP.",
            features: [
                "Liquidity Dashboard — Consolidated total balance of all accounts",
                "Financial Accounts — Banks, petty cash, and savings accounts",
                "Transactions — Recording of income, expenses, and transfers",
                "Bank Reconciliation — Import statements and auto-match with your records",
                "Portfolio — Management of Accounts Receivable (AR) and Accounts Payable (AP)",
                "Withholdings — System for income tax withholding and ICA/VAT withholdings",
                "Accounting Integration — Each transaction automatically generates a journal entry"
            ],
            workflow: [
                { step: 1, title: "Create Accounts", description: "Go to Treasury > Accounts > New. Register banks and cash with name, type, and opening balance." },
                { step: 2, title: "Register Transactions", description: "Go to Treasury > New Transaction. Select type (income/expense), account, amount, and third party." },
                { step: 3, title: "Apply Withholdings", description: "When registering a payment or collection, select applicable withholdings (RteFte, RteICA, RteIVA)." },
                { step: 4, title: "Reconcile Statements", description: "Go to Treasury > Reconciliation. Import bank CSV/Excel and match with movements." },
                { step: 5, title: "Review Portfolio", description: "Go to Treasury > Portfolio to see pending AR and AP." }
            ],
            subsections: [
                { title: "Dashboard", path: "/treasury", description: "Liquidity panel and recent movements" },
                { title: "New Transaction", path: "/treasury/new", description: "Register income, expense, or transfer" },
                { title: "Accounts", path: "/treasury/accounts/new", description: "Manage bank accounts and cash" },
                { title: "Reconciliation", path: "/treasury/reconcile", description: "Automatic bank reconciliation" },
                { title: "Portfolio", path: "/treasury/cartera", description: "Accounts receivable and payable" }
            ],
            tips: [
                "Reconcile your bank at least once a week to detect differences early",
                "Withholdings are calculated automatically per current DIAN tables",
                "Always verify total Treasury accounts match account 11 in the Balance Sheet"
            ]
        }
    },
    {
        id: "payroll",
        title: "Payroll Settlement Guide",
        icon: Briefcase,
        color: "text-rose-600",
        bg: "bg-rose-50",
        content: {
            description: "Complete manual for salary management. From contract registration to electronic payroll issuance. The system strictly complies with legal percentages for health (4%), pension (4%), and provisions (Bonus, Severance, Vacations).",
            features: [
                "Contract Management (Fixed Term, Indefinite, Task-based)",
                "Automatic calculation of Social Security and Payroll Taxes",
                "Changes Module (Overtime, Night Surcharges, Sunday pay)",
                "Bank Dispersion File Generation (Bancolombia/Davivienda)",
                "Direct Transmission to DIAN (Electronic Payroll)",
                "Income Tax Withholding Procedure 1 Calculation"
            ],
            workflow: [
                { step: 1, title: "Employee Master", description: "Enter key data: Base Salary, Contribution Type, and Entities (EPS, AFP, Fund)." },
                { step: 2, title: "Changes Report", description: "Upload overtime and month absences before processing." },
                { step: 3, title: "Simulation and Settlement", description: "Run period settlement. The system automatically calculates Net Pay." },
                { step: 4, title: "Bank Dispersion", description: "Generate the flat file (PAB/TXT) for upload to the bank portal for mass payment." },
                { step: 5, title: "Accounting and DIAN", description: "Approve payroll to generate the expense entry and issue to DIAN." }
            ],
            subsections: [
                { title: "Employees", path: "/payroll/employees", description: "Staff database" },
                { title: "Settlement", path: "/payroll/settlement", description: "Earnings calculation" },
                { title: "Dispersion", path: "/payroll/dispersion", description: "Mass payments" }
            ],
            tips: [
                "Verify that IBC is greater than or equal to the minimum legal wage",
                "Use the withholding simulator to validate high salary deductions",
                "Bank dispersion requires valid account numbers and types for employees"
            ]
        }
    },
    {
        id: "dian",
        title: "DIAN — Electronic Invoicing",
        icon: ShieldCheck,
        color: "text-green-600",
        bg: "bg-green-50",
        content: {
            description: "The DIAN module manages all integration with the Colombian Tax and Customs Direction. Controls invoicing resolutions, technology provider configuration, and transmission of electronic documents (invoices, credit notes, and support documents).",
            features: [
                "DIAN Dashboard — Status of recent transmissions with CUFE and processing status",
                "Invoicing Resolution — Management of active resolutions with authorized ranges",
                "Configuration — API Key, environment (Test/Production), and taxpayer data",
                "Electronic Invoice — Issuance with XML UBL 2.1, CUFE, and QR code",
                "Electronic Credit Note — Voiding or correction of issued invoices",
                "Support Document — For purchases from non-invoicing entities"
            ],
            workflow: [
                { step: 1, title: "Configure Taxpayer", description: "Go to DIAN > Configuration tab. Complete Tax ID, name, address, and tax regime." },
                { step: 2, title: "Register Resolution", description: "In DIAN > Resolutions, register invoicing resolution with number, range, and validity." },
                { step: 3, title: "Configure Environment", description: "Select 'Test' to validate or 'Production' to issue official documents." },
                { step: 4, title: "Issue Documents", description: "From any draft invoice, click 'Issue DIAN'. System generates XML, CUFE, and QR." },
                { step: 5, title: "Verify Status", description: "In the DIAN Dashboard, monitor transmission status (Accepted/Rejected)." }
            ],
            subsections: [
                { title: "DIAN Dashboard", path: "/dian", description: "Electronic transmission status" }
            ],
            tips: [
                "ALWAYS start in TEST environment before production",
                "Verify resolution has available range before issuing",
                "Documents issued to DIAN CANNOT be modified — only voided with Credit Note"
            ]
        }
    },
    {
        id: "products",
        title: "Products & Services",
        icon: Package,
        color: "text-purple-600",
        bg: "bg-purple-50",
        content: {
            description: "The Products and Services master catalog is the heart of inventory and sales. Each product has a unique SKU, sales price, cost, category, associated tax, and stock levels. Products are used in quotes, invoices, purchase orders, and production.",
            features: [
                "Product Catalog — Complete list with search, filters, and pagination",
                "Product Record — SKU, name, description, prices, taxes, and minimum stock",
                "Categories — Organize products by family or line",
                "Taxes — Assign VAT (0%, 5%, 19%) or exempt to each product",
                "Price Management — Selling price, standard cost, and profit margin",
                "Images — Upload reference photos for each product"
            ],
            subsections: [
                { title: "Catalog", path: "/products", description: "Product and service list" }
            ],
            tips: [
                "Use descriptive and unique SKUs — eg: TEX-COT-001 for 'Cotton Fabric 001'",
                "Set minimum stock for automatic replenishment alerts",
                "Average cost updates automatically with each purchase"
            ]
        }
    },
    {
        id: "parties",
        title: "Third Parties (Customers & Vendors)",
        icon: Building,
        color: "text-slate-600",
        bg: "bg-slate-100",
        content: {
            description: "The Third Parties module is the master directory of all natural and legal persons the business interacts with. A third party can be a customer, vendor, or both. Each record includes legal info (Tax ID), contact details, and commercial roles.",
            features: [
                "Third Party Directory — Master list with advanced search and type/role filters",
                "Grid and Table View — Toggle between card view and industrial table",
                "Pagination — Efficient navigation for large contact volumes",
                "Person Type — Natural (ID) or Legal (Tax ID with DV)",
                "Roles — Mark as Customer, Vendor, or both",
                "DIAN Info — Tax ID, DV, tax regime, and fiscal responsibilities"
            ],
            subsections: [
                { title: "Directory", path: "/parties", description: "Master list of customers and vendors" }
            ],
            tips: [
                "Always verify Tax ID/ID before registering to avoid duplicates",
                "A vendor who also buys from you can have both roles active",
                "DV (verification digit) is automatically calculated for Tax IDs"
            ]
        }
    },
    {
        id: "documents",
        title: "Document Center",
        icon: FileText,
        color: "text-sky-600",
        bg: "bg-sky-50",
        content: {
            description: "The Document Center unifies all business commercial documents in one place. Here you can search, filter, and manage quotes, orders, sales invoices, purchase orders, and vendor bills. It is the consolidated view of document flow.",
            features: [
                "Unified View — All document types in a single table",
                "Type Filters — Quote, Order, Invoice, PO, Vendor Bill",
                "Document Status — Draft, Sent, Accepted",
                "Quick Actions — Convert, issue, and view documents",
                "Document Detail — Full view with lines, amounts, DIAN certification, and notes"
            ],
            subsections: [
                { title: "All Documents", path: "/documents", description: "Consolidated document view" }
            ],
            tips: [
                "Use the Document Center to quickly find any invoice or quote",
                "Issued documents (SENT) include their CUFE and QR code for validation"
            ]
        }
    },
    {
        id: "settings",
        title: "Settings",
        icon: Settings,
        color: "text-gray-600",
        bg: "bg-gray-100",
        content: {
            description: "The Settings module allows customizing the app per company needs. Includes user profile config, security (2FA), company data, integrations, service billing, and notification preferences.",
            features: [
                "User Profile — Name, email, avatar, and personal preferences",
                "Security — Password change and 2FA activation",
                "Company Data — Legal name, Tax ID, address, and logo",
                "Integrations — Connection with external services (API Keys)",
                "Service Billing — Active plan, payment history",
                "Notifications — Configure email and app alerts"
            ],
            subsections: [
                { title: "General", path: "/settings", description: "General settings overview" },
                { title: "Profile", path: "/settings/profile", description: "User personal data" },
                { title: "Security", path: "/settings/security", description: "Password and 2FA" },
                { title: "Company", path: "/settings/company", description: "Company fiscal data" },
                { title: "Integrations", path: "/settings/integrations", description: "APIs and external services" },
                { title: "Billing", path: "/settings/billing", description: "Service plan and payments" },
                { title: "Notifications", path: "/settings/notifications", description: "Alerts and preferences" }
            ],
            tips: [
                "Activate 2FA for better security — use Google Authenticator or Authy",
                "Complete company data BEFORE issuing the first electronic invoice",
                "Regularly check notification settings to avoid missing important alerts"
            ]
        }
    },
    {
        id: "collaboration",
        title: "Collaboration & Chat",
        icon: MessageSquare,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        content: {
            description: "Encourage internal communication with the integrated messaging system. Users can chat in real time, share documents, and collaborate on specific projects or documents.",
            features: [
                "Real-Time Chat — Instant individual and group messaging",
                "Module-based Channels — Automatic discussions linked to invoices, orders, or projects",
                "File Sharing — Direct sending of platform documents via chat",
                "Smart Notifications — Alerts for new messages and mentions",
                "Audit Trail — Recording of important communications for future reference"
            ],
            workflow: [
                { step: 1, title: "Access Chat", description: "Click on the bubble icon in the top bar or go directly to the Collaboration module." },
                { step: 2, title: "Start Conversation", description: "Search for a colleague by name or join a department channel." },
                { step: 3, title: "Document Context", description: "From any document (e.g., Invoice), use the chat tab to discuss it with the team." },
                { step: 4, title: "Mentions (@)", description: "Use '@name' to specifically notify a user in a group conversation." }
            ],
            subsections: [
                { title: "General Chat", path: "/collaboration", description: "Main messaging interface" },
                { title: "Document Messaging", path: "#", description: "Contextual collaboration on records" }
            ],
            tips: [
                "Use project channels to keep all information in one place",
                "Chats linked to documents save the historical context of who made which decision",
                "You can see who is online through the presence indicator (green dot)"
            ]
        }
    },
    {
        id: "technology",
        title: "Technology — IT Asset Management",
        icon: Monitor,
        color: "text-cyan-600",
        bg: "bg-cyan-50",
        content: {
            description: "The Technology module allows you to manage your company's IT asset inventory following ITIL v4 best practices. Register computers, laptops, phones, and printers, control employee assignments, and schedule preventive and corrective maintenance.",
            features: [
                "CMDB (Configuration Management Database) — Complete IT asset inventory with auto-generated codes",
                "Categorization — Desktop, Laptop, Mobile, Tablet, Printer, Network, Other",
                "Assignment Traceability — Record of who received which equipment, when and in what condition",
                "Controlled Returns — When returning equipment, condition and observations are recorded",
                "Preventive Maintenance — Schedule periodic maintenance with configurable frequency",
                "Corrective Maintenance — Record repairs with notes and responsible person",
                "Real-Time KPIs — Total assets, available, assigned, and upcoming maintenance",
                "Warranty Alerts — Notification of equipment with expiring warranty",
                "Technical Specifications — Store processor, RAM, storage and more for each asset"
            ],
            workflow: [
                { step: 1, title: "Register Asset", description: "Go to Technology > New Asset. Complete name, category, brand, model, serial number, and technical specs." },
                { step: 2, title: "Assign to Employee", description: "From the asset detail, click 'Assign'. Select the employee and add delivery notes (included accessories, condition)." },
                { step: 3, title: "Schedule Maintenance", description: "In the asset's Maintenance panel, create a preventive schedule with frequency in days (e.g., every 180 days)." },
                { step: 4, title: "Return Equipment", description: "When the employee returns the equipment, click 'Return'. Record the return condition and observations." },
                { step: 5, title: "Complete Maintenance", description: "When maintenance is performed, mark as completed. The system automatically calculates the next due date." }
            ],
            subsections: [
                { title: "Technology Dashboard", path: "/technology", description: "Control panel with KPIs and asset list" },
                { title: "New Asset", path: "/technology/new", description: "Technology equipment registration form" }
            ],
            tips: [
                "ALWAYS record the equipment serial number to facilitate tracking and warranty claims",
                "Schedule preventive maintenance at least every 6 months (180 days) for laptops",
                "When returning equipment, verify accessories (charger, mouse, bag) and note them in the return notes",
                "Use technical specifications to plan technology renewal due to obsolescence"
            ]
        }
    },
    {
        id: "support",
        title: "Technical Support",
        icon: Headphones,
        color: "text-slate-600",
        bg: "bg-slate-50",
        content: {
            description: "Having technical problems or questions? Our support team is ready to help. You can open support tickets, consult this knowledge base, or contact us directly.",
            features: [
                "Ticket Opening — Formal reporting of incidents or requirements",
                "Knowledge Base — Access to guides, videos, and FAQs",
                "Premium Support — Priority for critical billing or payroll contingencies",
                "Status Tracking — Check the progress of your requests in real time"
            ],
            workflow: [
                { step: 1, title: "Consult Documentation", description: "Search this help center first using the top search bar." },
                { step: 2, title: "Create Ticket", description: "If you can't find the solution, use the 'Request Support' button and describe your case." },
                { step: 3, title: "Attach Evidence", description: "Screenshots or error messages help resolve your case faster." },
                { step: 4, title: "Receive Response", description: "Our team will contact you through this medium or by email." }
            ],
            subsections: [
                { title: "My Tickets", path: "#", description: "History of requested requirements" },
                { title: "System Status", path: "#", description: "Check if there is scheduled maintenance" }
            ],
            tips: [
                "Be as specific as possible when reporting an error: what were you doing when it occurred?",
                "Consult the video tutorials to learn how to use complex functions step by step",
                "Priority 'Critical' tickets should only be used for total system outages"
            ]
        }
    }
];
