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
    Zap
} from "lucide-react";

export const sectionsEs = [
    {
        id: "onboarding",
        title: "Onboarding — Inicio Rápido",
        icon: Zap,
        color: "text-amber-600",
        bg: "bg-amber-50",
        content: {
            description: "¡Bienvenido a GVM S.A.S! Esta guía te ayudará a configurar tu ERP por primera vez. Sigue los pasos maestros para tener tu empresa operando en menos de 30 minutos.",
            features: [
                "Configuración rápida de datos legales y fiscales",
                "Carga masiva inicial de productos y servicios",
                "Vinculación de cuentas bancarias y cajas",
                "Activación de facturación electrónica DIAN",
                "Estructuración de usuarios y permisos administrativos"
            ],
            workflow: [
                { step: 1, title: "Perfil de Empresa", description: "Completa el NIT, dirección y logo en Configuración > Empresa. Esto es vital para tus documentos legales." },
                { step: 2, title: "Maestro de Terceros", description: "Carga tus clientes y proveedores principales. Puedes importar desde Excel o crearlos manualmente en Terceros." },
                { step: 3, title: "Catálogo Maestro", description: "Registra tus productos o servicios en el módulo de Productos. Define sus precios de venta y costos base." },
                { step: 4, title: "Configurar Tesorería", description: "Crea tus cuentas bancarias y cajas en Tesorería > Cuentas. Registra los saldos iniciales de apertura." },
                { step: 5, title: "Habilitación DIAN", description: "Configura tu resolución de facturación en el módulo DIAN para empezar a emitir oficialmente." }
            ],
            tips: [
                "Usa el botón 'Vista General' en cada módulo para entender su dashboard específico",
                "Invita a tu equipo desde Configuración > Usuarios para asignar responsabilidades",
                "Consulta los videos de 'Entrenamiento Express' en la sección de Soporte"
            ]
        }
    },
    {
        id: "overview",
        title: "Visión General",
        icon: LayoutDashboard,
        color: "text-indigo-600",
        bg: "bg-indigo-50",
        content: {
            description: "GVM S.A.S es un sistema ERP (Enterprise Resource Planning) integral diseñado para la gestión empresarial completa. La aplicación integra módulos de ventas, compras, inventario, producción, contabilidad, tesorería, nómina y facturación electrónica DIAN en una sola plataforma unificada. Al iniciar sesión, accedes al Dashboard principal que muestra los KPIs más relevantes de tu negocio en tiempo real.",
            features: [
                "Dashboard ejecutivo con KPIs financieros y operativos en tiempo real",
                "Navegación lateral (sidebar) con acceso directo a todos los módulos",
                "Sistema de notificaciones integrado con alertas en tiempo real",
                "Autenticación segura con soporte para 2FA (doble factor)",
                "Interfaz responsive adaptada a escritorio y tablets",
                "Buscador inteligente de documentos, artículos y contactos",
                "Historial de actividad reciente en el panel principal"
            ],
            tips: [
                "Usa el Dashboard como tu punto de partida diario para monitorear el estado del negocio",
                "Los KPIs se actualizan automáticamente — no necesitas refrescar la página",
                "Puedes personalizar tu perfil y preferencias desde Configuración > Perfil"
            ]
        }
    },
    {
        id: "crm",
        title: "CRM — Gestión Comercial",
        icon: Users,
        color: "text-blue-600",
        bg: "bg-blue-50",
        content: {
            description: "El módulo CRM (Customer Relationship Management) te permite gestionar tu pipeline comercial desde la captación de prospectos hasta el cierre de oportunidades. Organiza tus leads, da seguimiento a oportunidades y convierte prospectos en clientes activos.",
            features: [
                "Gestión de Leads — Registra prospectos con nombre, email, teléfono y fuente de captación",
                "Pipeline Kanban — Visualiza oportunidades en formato tablero con etapas drag & drop",
                "Conversión de Leads — Convierte leads calificados en oportunidades del pipeline",
                "Valoración del Pipeline — Visualiza el valor total monetario de tus oportunidades",
                "Etapas configurables — Nuevo, Contactado, Propuesta, Negociación, Cerrado Ganado/Perdido"
            ],
            workflow: [
                { step: 1, title: "Registrar Lead", description: "Ve a CRM > Leads > Nuevo Lead. Completa los datos del prospecto incluyendo fuente de captación." },
                { step: 2, title: "Calificar Lead", description: "Revisa la lista de leads. Contacta al prospecto y valida su interés real en tus productos o servicios." },
                { step: 3, title: "Convertir a Oportunidad", description: "Desde el detalle del lead, usa 'Convertir a Oportunidad' para moverlo al pipeline de ventas." },
                { step: 4, title: "Gestionar Pipeline", description: "En CRM > Pipeline, arrastra las oportunidades entre etapas según avance la negociación." },
                { step: 5, title: "Cerrar Venta", description: "Al cerrar como Ganado, el sistema puede generar automáticamente una cotización en ventas." }
            ],
            subsections: [
                { title: "Leads", path: "/crm/leads", description: "Lista y gestión de prospectos comerciales" },
                { title: "Pipeline", path: "/crm/pipeline", description: "Tablero Kanban de oportunidades de venta" }
            ],
            tips: [
                "Registra SIEMPRE la fuente de captación del lead para medir qué canal genera más ventas",
                "Actualiza las etapas del pipeline diariamente para tener visibilidad real del embudo",
                "Usa las notas para dejar contexto importante sobre cada interacción comercial"
            ]
        }
    },
    {
        id: "sales",
        title: "Ventas",
        icon: ShoppingCart,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        content: {
            description: "El módulo de Ventas gestiona el flujo comercial completo, desde la cotización hasta la facturación. Incluye el Embudo Comercial que muestra el estadístico de conversión de leads → cotizaciones → pedidos. El sistema permite crear documentos, convertirlos entre tipos y emitirlos electrónicamente ante la DIAN.",
            features: [
                "Dashboard de Embudo Comercial — Visualiza el funnel Leads → Cotizaciones → Pedidos",
                "Cotizaciones — Crea propuestas comerciales con productos, cantidades y precios",
                "Pedidos de Venta — Confirma cotizaciones aprobadas y genera pedidos",
                "Facturas de Venta — Genera facturas electrónicas desde pedidos confirmados",
                "Conversión automática — Cotización → Pedido → Factura en un clic",
                "Emisión DIAN — Envía facturas electrónicas directamente a la DIAN"
            ],
            workflow: [
                { step: 1, title: "Crear Cotización", description: "Ve a Ventas > Cotizaciones > Nueva. Selecciona el cliente, agrega líneas de productos con cantidad y precio unitario." },
                { step: 2, title: "Enviar Cotización", description: "Revisa el total y haz clic en 'Enviar'. El cliente recibirá la propuesta por email." },
                { step: 3, title: "Convertir a Pedido", description: "Cuando el cliente acepta, convierte la cotización a Pedido de Venta desde el botón 'Pedido'." },
                { step: 4, title: "Generar Factura", description: "Desde el pedido, haz clic en 'Facturar' para crear la factura de venta." },
                { step: 5, title: "Emitir ante DIAN", description: "La factura en estado BORRADOR se puede emitir oficialmente. El sistema genera el XML, CUFE y QR." }
            ],
            subsections: [
                { title: "Cotizaciones", path: "/sales/quotations", description: "Propuestas comerciales a clientes" },
                { title: "Pedidos de Venta", path: "/sales/orders", description: "Confirmaciones de venta" }
            ],
            tips: [
                "Siempre revisa el IVA antes de emitir — una vez emitida ante DIAN, no puede modificarse",
                "El flujo recomendado es: Cotización → Pedido → Factura → Emisión DIAN",
                "Puedes ver el historial de documentos completo en la sección 'Documentos'"
            ]
        }
    },
    {
        id: "purchasing",
        title: "Compras",
        icon: Truck,
        color: "text-violet-600",
        bg: "bg-violet-50",
        content: {
            description: "El módulo de Compras controla el proceso de adquisición de materias primas, insumos y servicios. Desde la creación de órdenes de compra hasta el registro de facturas de proveedor, el sistema integra automáticamente los movimientos con inventario y contabilidad.",
            features: [
                "Dashboard de Compras — KPIs de órdenes pendientes, recibidas y monto total",
                "Órdenes de Compra — Solicita productos a proveedores con cantidades y costos",
                "Facturas de Proveedor — Registra las facturas recibidas de tus proveedores",
                "Conversión automática — Orden de Compra → Factura de Proveedor",
                "Integración con Inventario — Las compras actualizan automáticamente el stock",
                "Integración con Contabilidad — Se generan asientos contables automáticos"
            ],
            workflow: [
                { step: 1, title: "Crear Orden de Compra", description: "Ve a Compras > Órdenes > Nueva. Selecciona el proveedor y agrega los productos con cantidades y costos unitarios." },
                { step: 2, title: "Aprobar Orden", description: "Revisa la orden y confirma. Los productos quedarán en estado 'En Tránsito'." },
                { step: 3, title: "Recibir Mercancía", description: "Al recibir los productos, el sistema actualiza el inventario automáticamente." },
                { step: 4, title: "Registrar Factura", description: "Convierte la orden de compra en Factura de Proveedor o créala manualmente." },
                { step: 5, title: "Contabilizar", description: "El sistema genera automáticamente el asiento contable (Débito Inventario / Crédito CxP)." }
            ],
            subsections: [
                { title: "Órdenes de Compra", path: "/purchasing/orders", description: "Solicitudes de compra a proveedores" },
                { title: "Facturas de Proveedor", path: "/purchasing/bills", description: "Facturas recibidas de proveedores" }
            ],
            tips: [
                "Siempre verifica el NIT del proveedor antes de registrar una factura",
                "Compara los precios de la orden versus la factura para detectar discrepancias",
                "Las órdenes de compra aprobadas alimentan automáticamente el Kardex"
            ]
        }
    },
    {
        id: "inventory",
        title: "Inventario",
        icon: Boxes,
        color: "text-amber-600",
        bg: "bg-amber-50",
        content: {
            description: "El módulo de Inventario controla el stock en tiempo real, gestiona bodegas y registra todos los movimientos de entrada/salida. Incluye valorización por costo promedio ponderado y un Kardex detallado por producto que permite rastrear cada movimiento.",
            features: [
                "Dashboard de Stock — Vista general de existencias con alertas de stock bajo",
                "Gestión de Bodegas — Administra múltiples ubicaciones de almacenamiento",
                "Movimientos de Inventario — Registra entradas, salidas, ajustes y transferencias",
                "Kardex por Producto — Historial detallado de movimientos con saldo actualizado",
                "Valorización — Reporte financiero de inventarios por costo promedio ponderado (NIIF)",
                "Stock Mínimo — Alertas automáticas cuando un producto está por debajo del mínimo"
            ],
            workflow: [
                { step: 1, title: "Configurar Bodegas", description: "Ve a Inventario > Bodegas. Crea al menos una bodega principal para almacenar tus productos." },
                { step: 2, title: "Registrar Stock Inicial", description: "Usa Inventario > Nuevo Movimiento tipo 'Ajuste' para ingresar las cantidades iniciales." },
                { step: 3, title: "Monitorear Existencias", description: "El Dashboard de Inventario muestra el stock actualizado. Los movimientos de compra/venta lo actualizan automáticamente." },
                { step: 4, title: "Consultar Kardex", description: "Para ver el historial completo de un producto, haz clic en su nombre para acceder al Kardex." },
                { step: 5, title: "Genera Valorización", description: "Ve a Inventario > Valorización para obtener el reporte financiero de tus existencias." }
            ],
            subsections: [
                { title: "Dashboard de Stock", path: "/inventory", description: "Vista general de existencias y movimientos" },
                { title: "Bodegas", path: "/inventory/warehouses", description: "Gestión de ubicaciones de almacenamiento" },
                { title: "Nuevo Movimiento", path: "/inventory/new", description: "Registrar entrada, salida o ajuste de inventario" },
                { title: "Valorización", path: "/inventory/valuation", description: "Reporte financiero de valorización de inventarios" }
            ],
            tips: [
                "Configura SIEMPRE el stock mínimo en cada producto para recibir alertas oportunas",
                "El Kardex es tu mejor herramienta para auditar diferencias de inventario",
                "La valorización debe conciliar con la cuenta 1435 del Balance de Prueba"
            ]
        }
    },
    {
        id: "logistics",
        title: "Logística & Despachos",
        icon: Truck,
        color: "text-indigo-600",
        bg: "bg-indigo-50",
        content: {
            description: "El módulo de Logística gestiona el proceso de entrega de mercancías, desde la selección de transportadoras hasta el rastreo de envíos. Permite crear guías de despacho, gestionar flotas propias o externas y monitorear el estado de las entregas en tiempo real.",
            features: [
                "Dashboard Logístico — Resumen de despachos pendientes, en tránsito y entregados",
                "Gestión de Transportadoras — Directorio de aliados logísticos con tarifas y contactos",
                "Creación de Envíos — Genera guías de despacho vinculadas a pedidos de venta",
                "Rastreo en Tiempo Real — Actualización del estado de entrega y novedades",
                "Gestión de Flota — Control de vehículos propios y conductores (opcional)",
                "Optimización de Rutas — Planificación de entregas por zona geográfica"
            ],
            workflow: [
                { step: 1, title: "Configurar Transportadoras", description: "Ve a Logística > Transportadoras. Registra tus aliados logísticos con sus datos básicos." },
                { step: 2, title: "Seleccionar Pedidos", description: "En Logística > Despachos Pendientes, selecciona los pedidos de venta listos para enviar." },
                { step: 3, title: "Crear Guía de Envío", description: "Completa los datos de destino, peso, dimensiones y selecciona la transportadora." },
                { step: 4, title: "Emitir Documento", description: "Imprime la guía de despacho y adjúntala a la mercancía." },
                { step: 5, title: "Monitorear Entrega", description: "Actualiza el estado a 'En Tránsito' y finalmente a 'Entregado' al confirmar el recibo." }
            ],
            subsections: [
                { title: "Dashboard Logístico", path: "/logistics", description: "Panel de control de operaciones de transporte" },
                { title: "Transportadoras", path: "/logistics/carriers", description: "Gestión de aliados de transporte" },
                { title: "Despachos", path: "/logistics/shipments", description: "Registro y seguimiento de envíos" }
            ],
            tips: [
                "Agrupa varios pedidos en un solo despacho si van hacia la misma zona para ahorrar costos",
                "Registra siempre el número de guía de la transportadora para facilitar el rastreo externo",
                "Usa las 'Novedades' para documentar cualquier retraso o problema en la entrega"
            ]
        }
    },
    {
        id: "production",
        title: "Producción",
        icon: Factory,
        color: "text-orange-600",
        bg: "bg-orange-50",
        content: {
            description: "El módulo de Producción gestiona las operaciones de manufactura. Permite definir recetas (listas de materiales), crear órdenes de producción y controlar el consumo de materias primas vs. producto terminado. Ideal para empresas que transforman insumos en productos finales.",
            features: [
                "Dashboard de Producción — KPIs de órdenes activas, pendientes y completadas",
                "Recetas (BOM) — Define la lista de materiales con cantidades y proporción de cada insumo",
                "Órdenes de Producción — Programa y ejecuta producción basada en recetas",
                "Control de Consumo — Rastrea materias primas consumidas vs. producto terminado generado",
                "Estados de Orden — Borrador → En Progreso → Completada"
            ],
            workflow: [
                { step: 1, title: "Crear Receta", description: "Ve a Producción > Recetas > Nueva. Define el producto final y lista los insumos con sus cantidades." },
                { step: 2, title: "Cómo crear una receta", description: "Para crear una receta, ve a Producción > Recetas > Nueva. Asigna un nombre al producto final, selecciona los insumos necesarios y define la cantidad exacta de cada uno para una unidad de producción." },
                { step: 3, title: "Iniciar Producción", description: "Cambia el estado a 'En Progreso'. El sistema verificará que haya stock suficiente de materias primas." },
                { step: 4, title: "Completar Orden", description: "Al finalizar, cambia a 'Completada'. Se descuentan las materias primas y se ingresa el producto terminado." }
            ],
            subsections: [
                { title: "Dashboard", path: "/production", description: "Panel de control de producción" },
                { title: "Recetas (BOM)", path: "/production/recipes", description: "Listas de materiales y fórmulas" },
                { title: "Órdenes de Producción", path: "/production/orders", description: "Órdenes de manufactura" }
            ],
            tips: [
                "Asegúrate de tener stock suficiente de materias primas ANTES de iniciar una orden",
                "Las recetas pueden tener sub-recetas para productos complejos",
                "El costo del producto terminado se calcula automáticamente sumando el costo de los insumos"
            ]
        }
    },
    {
        id: "accounting",
        title: "Contabilidad Central",
        icon: Calculator,
        color: "text-cyan-600",
        bg: "bg-cyan-50",
        content: {
            description: "El cerebro financiero de GVM S.A.S. Gestiona el Libro Mayor, asientos automáticos y reportes bajo NIIF. La contabilidad es el punto final de toda la cadena de valor: cada venta, compra y pago genera una trazabilidad exacta.",
            features: [
                "Plan de Cuentas dinámico con jerarquía multinivel PUC",
                "Asientos contables automáticos desde todos los módulos",
                "Gestión de periodos contables y cierres mensuales",
                "Reportes financieros certificados (P&L, Balance, Auxiliares)",
                "Integración nativa con cuentas por cobrar y pagar",
                "Auditoría de movimientos línea por línea"
            ],
            workflow: [
                { step: 1, title: "Parametrización Inicial", description: "Verifica que el Plan de Cuentas (PUC) tenga las auxiliares necesarias para tu operación." },
                { step: 2, title: "Configuración de Integración", description: "Define las cuentas predeterminadas para ventas, compras, bancos e impuestos." },
                { step: 3, title: "Operación de Módulos", description: "Genera facturas, registros de nómina y pagos. El sistema creará los asientos en tiempo real." },
                { step: 4, title: "Conciliación y Ajustes", description: "Cruza saldos de tesorería y registra ajustes manuales para gastos bancarios o depreciaciones." },
                { step: 5, title: "Generación de Estados", description: "Consulta el Balance de Prueba para validar el cuadre y emite los reportes oficiales." }
            ],
            subsections: [
                { title: "Plan de Cuentas", path: "/accounting/accounts", description: "Maestro PUC" },
                { title: "Integraciones", path: "/settings/integrations", description: "Puente entre módulos" }
            ],
            tips: [
                "No borres cuentas con saldo — usa la opción de inactivar si ya no se requieren",
                "El Auxiliar es tu mejor herramienta para detectar errores en la digitación o integración",
                "Revisa siempre que el total Activos coincida con Pasivos + Patrimonio"
            ]
        }
    },
    {
        id: "accounting-integrations",
        title: "Manual de Integración Contable",
        icon: Calculator,
        color: "text-purple-600",
        bg: "bg-purple-50",
        content: {
            description: "Guía técnica para asegurar que tus operaciones comerciales fluyan correctamente hacia el libro mayor. La integración automática ahorra hasta un 90% del tiempo de digitación contable.",
            features: [
                "Mapeo de Cuentas de Venta e Ingreso",
                "Configuración de CxP por Proveedor",
                "Enlace de Nómina (Gasto vs. Pasivo)",
                "Integración de Impuestos y Retenciones",
                "Auditoría de Asientos Automáticos"
            ],
            workflow: [
                { step: 1, title: "Cuentas Maestras", description: "Asocia en Configuración > Empresa las cuentas de Caja, Bancos e IVA por defecto." },
                { step: 2, title: "Reglas de Producto", description: "Define en cada familia de productos la cuenta de inventario (14) y de ingreso (41)." },
                { step: 3, title: "Mapeo de Terceros", description: "Asegura que clientes tengan cuenta 13 y proveedores cuenta 23 según el PUC." },
                { step: 4, title: "Prueba de Flujo", description: "Realiza una factura de prueba y verifica que el asiento se genere correctamente en Contabilidad > Asientos." },
                { step: 5, title: "Ajuste de Impuestos", description: "Configura las tarifas de RteFte e ICA para que el sistema las calcule en cada pago/cobro." }
            ],
            tips: [
                "Si un documento no aparece en contabilidad, verifica que no esté en estado 'BORRADOR'",
                "La integración de nómina requiere las cuentas de seguridad social (2370) y salarios (2505)",
                "Usa el Centro de Control DIAN para validar el CUFE antes de la contabilización final"
            ]
        }
    },
    {
        id: "treasury",
        title: "Tesorería",
        icon: Wallet,
        color: "text-teal-600",
        bg: "bg-teal-50",
        content: {
            description: "El módulo de Tesorería controla la liquidez de la empresa: cuentas bancarias, cajas, ingresos y egresos operacionales. Integra conciliación bancaria automática y genera los asientos contables correspondientes. También gestiona la cartera (cuentas por cobrar y por pagar).",
            features: [
                "Dashboard de Liquidez — Saldo total consolidado de todas las cuentas",
                "Cuentas Financieras — Bancos, cajas menores y cuentas de ahorro",
                "Transacciones — Registro de ingresos, egresos y transferencias entre cuentas",
                "Conciliación Bancaria — Importa extractos y cruza automáticamente con tus registros",
                "Cartera — Gestión de cuentas por cobrar (CxC) y cuentas por pagar (CxP)",
                "Retenciones — Sistema de retenciones en la fuente y retenciones ICA/IVA",
                "Integración Contable — Cada transacción genera su asiento contable automáticamente"
            ],
            workflow: [
                { step: 1, title: "Crear Cuentas", description: "Ve a Tesorería > Cuentas > Nueva. Registra tus bancos y cajas con nombre, tipo y saldo inicial." },
                { step: 2, title: "Registrar Transacciones", description: "Ve a Tesorería > Nueva Transacción. Selecciona tipo (ingreso/egreso), cuenta, monto y tercero." },
                { step: 3, title: "Aplicar Retenciones", description: "Al registrar un pago o cobro, selecciona las retenciones aplicables (RteFte, RteICA, RteIVA)." },
                { step: 4, title: "Conciliar Extractos", description: "Ve a Tesorería > Conciliación. Importa el extracto CSV/Excel del banco y cruza con tus movimientos." },
                { step: 5, title: "Revisar Cartera", description: "Ve a Tesorería > Cartera para ver las cuentas por cobrar y por pagar pendientes." }
            ],
            subsections: [
                { title: "Dashboard", path: "/treasury", description: "Panel de liquidez y movimientos recientes" },
                { title: "Nueva Transacción", path: "/treasury/new", description: "Registrar ingreso, egreso o transferencia" },
                { title: "Cuentas", path: "/treasury/accounts/new", description: "Administrar cuentas bancarias y cajas" },
                { title: "Conciliación", path: "/treasury/reconcile", description: "Conciliación bancaria automática" },
                { title: "Cartera", path: "/treasury/cartera", description: "Cuentas por cobrar y por pagar" }
            ],
            tips: [
                "Concilia tu banco al menos una vez por semana para detectar diferencias a tiempo",
                "Las retenciones se calculan automáticamente según las tablas DIAN vigentes",
                "Siempre verifica que la suma de cuentas en Tesorería coincida con la cuenta 11 del Balance"
            ]
        }
    },
    {
        id: "payroll",
        title: "Guía de Liquidación de Nómina",
        icon: Briefcase,
        color: "text-rose-600",
        bg: "bg-rose-50",
        content: {
            description: "Manual completo para la gestión salarial. Desde el registro de contratos hasta la emisión de la nómina electrónica. El sistema cumple rigurosamente con los porcentajes de ley para salud (4%), pensión (4%) y provisiones (Prima, Cesantías, Vacaciones).",
            features: [
                "Gestión de Contratos (Término Fijo, Indefinido, Obra o Labor)",
                "Cálculo automático de Seguridad Social y Parafiscales",
                "Módulo de Novedades (Extras, Recargos Nocturnos, Dominicales)",
                "Generación de Archivos de Dispersión (Bancolombia/Davivienda)",
                "Transmisión Directa a la DIAN (Nómina Electrónica)",
                "Cálculo de Retención en la Fuente por Procedimiento 1"
            ],
            workflow: [
                { step: 1, title: "Maestro de Colaboradores", description: "Ingresa datos clave: Salario Básico, Tipo de Cotizante y Entidades (EPS, AFP, Caja)." },
                { step: 2, title: "Reporte de Novedades", description: "Carga las horas extras y ausentismos del mes antes de procesar." },
                { step: 3, title: "Simulación y Liquidación", description: "Ejecuta la liquidación del periodo. El sistema calcula automáticamente el Neto a Pagar." },
                { step: 4, title: "Dispersión Bancaria", description: "Genera el archivo plano (PAB/TXT) para cargar al portal del banco y realizar el pago masivo." },
                { step: 5, title: "Contabilización y DIAN", description: "Aprueba la nómina para generar el asiento contable de gasto y emitir ante la DIAN." }
            ],
            subsections: [
                { title: "Colaboradores", path: "/payroll/employees", description: "Base de datos de personal" },
                { title: "Liquidación", path: "/payroll/settlement", description: "Cálculo de haberes" },
                { title: "Dispersión", path: "/payroll/dispersion", description: "Pagos masivos" }
            ],
            tips: [
                "Verifica que el IBC (Ingreso Base de Cotización) sea mayor o igual al salario mínimo legal vigente",
                "Usa el simulador de retención para validar descuentos de altos salarios",
                "La dispersión bancaria requiere que el empleado tenga un número de cuenta y tipo de cuenta válido"
            ]
        }
    },
    {
        id: "dian",
        title: "DIAN — Facturación Electrónica",
        icon: ShieldCheck,
        color: "text-green-600",
        bg: "bg-green-50",
        content: {
            description: "El módulo DIAN gestiona toda la integración con la Dirección de Impuestos y Aduanas Nacionales de Colombia. Controla las resoluciones de facturación, la configuración del proveedor tecnológico y la transmisión de documentos electrónicos (facturas, notas crédito y documentos soporte).",
            features: [
                "Dashboard DIAN — Estado de transmisiones recientes con CUFE y estado de procesamiento",
                "Resolución de Facturación — Gestión de resoluciones vigentes con rangos autorizados",
                "Configuración — API Key, ambiente (Pruebas/Producción) y datos del contribuyente",
                "Factura Electrónica — Emisión con XML UBL 2.1, CUFE y código QR",
                "Nota Crédito Electrónica — Anulación o corrección de facturas emitidas",
                "Documento Soporte — Para compras a no obligados a facturar"
            ],
            workflow: [
                { step: 1, title: "Configurar Contribuyente", description: "Ve a DIAN > pestaña Configuración. Completa NIT, razón social, dirección fiscal y régimen tributario." },
                { step: 2, title: "Registrar Resolución", description: "En DIAN > Resoluciones, registra la resolución de facturación con número, rango y vigencia." },
                { step: 3, title: "Configurar Ambiente", description: "Selecciona 'Pruebas' para validar o 'Producción' para emitir documentos oficiales." },
                { step: 4, title: "Emitir Documentos", description: "Desde cualquier factura en estado Borrador, haz clic en 'Emitir DIAN'. El sistema genera XML, CUFE y QR." },
                { step: 5, title: "Verificar Estado", description: "En el Dashboard DIAN, monitorea el estado de cada transmisión (Aceptado/Rechazado)." }
            ],
            subsections: [
                { title: "Dashboard DIAN", path: "/dian", description: "Estado de transmisiones electrónicas" }
            ],
            tips: [
                "SIEMPRE inicia en ambiente de PRUEBAS antes de pasar a producción",
                "Verifica que la resolución tenga rango disponible antes de emitir",
                "Los documentos emitidos ante DIAN NO pueden modificarse — solo anularse con Nota Crédito"
            ]
        }
    },
    {
        id: "products",
        title: "Productos & Servicios",
        icon: Package,
        color: "text-purple-600",
        bg: "bg-purple-50",
        content: {
            description: "El catálogo maestro de Productos y Servicios es el corazón del inventario y las ventas. Cada producto tiene un SKU único, precio de venta, costo, categoría, impuesto asociado y niveles de stock. Los productos se utilizan en cotizaciones, facturas, órdenes de compra y producción.",
            features: [
                "Catálogo de Productos — Lista completa con buscador, filtros y paginación",
                "Ficha de Producto — SKU, nombre, descripción, precios, impuestos y stock mínimo",
                "Categorías — Organiza productos por familia o línea",
                "Impuestos — Asigna IVA (0%, 5%, 19%) o exento a cada producto",
                "Gestión de Precios — Precio de venta, costo estándar y margen de rentabilidad",
                "Imágenes — Sube fotos de referencia para cada producto"
            ],
            subsections: [
                { title: "Catálogo", path: "/products", description: "Lista de productos y servicios" }
            ],
            tips: [
                "Usa SKUs descriptivos y únicos — ejemplo: TEX-ALG-001 para 'Tela Algodón 001'",
                "Configura el stock mínimo para recibir alertas automáticas de reabastecimiento",
                "El costo promedio se actualiza automáticamente con cada compra"
            ]
        }
    },
    {
        id: "parties",
        title: "Terceros (Clientes & Proveedores)",
        icon: Building,
        color: "text-slate-600",
        bg: "bg-slate-100",
        content: {
            description: "El módulo de Terceros es el directorio maestro de todas las personas naturales y jurídicas con las que interactúa la empresa. Un tercero puede ser cliente, proveedor o ambos. Cada registro incluye la información legal (NIT/CC), datos de contacto y roles comerciales.",
            features: [
                "Directorio de Terceros — Lista con buscador avanzado y filtros por tipo/rol",
                "Vista Grid y Tabla — Alterna entre vista de tarjetas y tabla industrial",
                "Paginación — Navegación eficiente para grandes volúmenes de contactos",
                "Tipo de Persona — Natural (CC) o Jurídica (NIT con DV)",
                "Roles — Marca como Cliente, Proveedor o ambos",
                "Información DIAN — NIT, DV, régimen tributario y responsabilidades fiscales"
            ],
            subsections: [
                { title: "Directorio", path: "/parties", description: "Lista maestra de clientes y proveedores" }
            ],
            tips: [
                "Siempre verifica el NIT/CC antes de registrar un tercero para evitar duplicados",
                "Un proveedor que también te compra puede tener ambos roles activos",
                "El DV (dígito de verificación) se calcula automáticamente para NITs"
            ]
        }
    },
    {
        id: "documents",
        title: "Centro de Documentos",
        icon: FileText,
        color: "text-sky-600",
        bg: "bg-sky-50",
        content: {
            description: "El Centro de Documentos unifica todos los documentos comerciales de la empresa en un solo lugar. Aquí puedes buscar, filtrar y gestionar cotizaciones, pedidos, facturas de venta, órdenes de compra y facturas de proveedor. Es la vista consolidada del flujo documental.",
            features: [
                "Vista Unificada — Todos los tipos de documento en una sola tabla",
                "Filtros por Tipo — Cotización, Pedido, Factura, OC, Factura Proveedor",
                "Estado del Documento — Borrador, Enviado, Aceptado",
                "Acciones Rápidas — Convertir, emitir y visualizar documentos",
                "Detalle de Documento — Vista completa con líneas, montos, certificación DIAN y notas"
            ],
            subsections: [
                { title: "Todos los Documentos", path: "/documents", description: "Vista consolidada de documentos" }
            ],
            tips: [
                "Usa el Centro de Documentos para encontrar rápidamente cualquier factura o cotización",
                "Los documentos emitidos (SENT) incluyen su CUFE y código QR para validación"
            ]
        }
    },
    {
        id: "settings",
        title: "Configuración",
        icon: Settings,
        color: "text-gray-600",
        bg: "bg-gray-100",
        content: {
            description: "El módulo de Configuración permite personalizar la aplicación según las necesidades de tu empresa. Incluye configuración del perfil de usuario, seguridad (2FA), datos de la empresa, integraciones, facturación del servicio y preferencias de notificación.",
            features: [
                "Perfil de Usuario — Nombre, email, avatar y preferencias personales",
                "Seguridad — Cambio de contraseña y activación de autenticación 2FA",
                "Datos de Empresa — Razón social, NIT, dirección fiscal y logo",
                "Integraciones — Conexión con servicios externos (API Keys)",
                "Facturación del Servicio — Plan activo, historial de pagos",
                "Notificaciones — Configura alertas por email y en la aplicación"
            ],
            subsections: [
                { title: "General", path: "/settings", description: "Vista general de configuración" },
                { title: "Perfil", path: "/settings/profile", description: "Datos personales del usuario" },
                { title: "Seguridad", path: "/settings/security", description: "Contraseña y 2FA" },
                { title: "Empresa", path: "/settings/company", description: "Datos fiscales de la empresa" },
                { title: "Integraciones", path: "/settings/integrations", description: "APIs y servicios externos" },
                { title: "Facturación", path: "/settings/billing", description: "Plan y pagos del servicio" },
                { title: "Notificaciones", path: "/settings/notifications", description: "Alertas y preferencias" }
            ],
            tips: [
                "Activa 2FA para mayor seguridad — usa Google Authenticator o Authy",
                "Completa los datos de empresa ANTES de emitir la primera factura electrónica",
                "Revisa regularmente la configuración de notificaciones para no perder alertas importantes"
            ]
        }
    },
    {
        id: "collaboration",
        title: "Colaboración & Chat",
        icon: MessageSquare,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        content: {
            description: "Fomenta la comunicación interna con el sistema de mensajería integrada. Los usuarios pueden chatear en tiempo real, compartir documentos y colaborar en proyectos o documentos específicos.",
            features: [
                "Chat en Tiempo Real — Mensajería instantánea individual y grupal",
                "Canales por Módulo — Discusiones automáticas vinculadas a facturas, pedidos o proyectos",
                "Compartir Archivos — Envío directo de documentos de la plataforma por chat",
                "Notificaciones Inteligentes — Alertas de mensajes nuevos y menciones",
                "Historial de Auditoría — Registro de comunicaciones importantes para referencia futura"
            ],
            workflow: [
                { step: 1, title: "Acceder al Chat", description: "Haz clic en el icono de burbuja en la barra superior o ve directamente al módulo de Colaboración." },
                { step: 2, title: "Iniciar Conversación", description: "Busca a un colega por nombre o únete a un canal de departamento." },
                { step: 3, title: "Contexto de Documentos", description: "Desde cualquier documento (ej. Factura), usa la pestaña de chat para discutirlo con el equipo." },
                { step: 4, title: "Menciones (@)", description: "Usa '@nombre' para notificar específicamente a un usuario en una conversación grupal." }
            ],
            subsections: [
                { title: "Chat General", path: "/collaboration", description: "Interfaz principal de mensajería" },
                { title: "Mensajería por Documentos", path: "#", description: "Colaboración contextual en registros" }
            ],
            tips: [
                "Usa los canales de proyecto para mantener toda la información en un solo lugar",
                "Los chats vinculados a documentos guardan el contexto histórico de quién tomó qué decisión",
                "Puedes ver quién está conectado mediante el indicador de presencia (punto verde)"
            ]
        }
    },
    {
        id: "support",
        title: "Soporte Técnico",
        icon: Headphones,
        color: "text-slate-600",
        bg: "bg-slate-50",
        content: {
            description: "¿Tienes problemas o dudas técnicas? Nuestro equipo de soporte está listo para ayudarte. Puedes abrir tickets de soporte, consultar esta base de conocimientos o contactarnos directamente.",
            features: [
                "Apertura de Tickets — Reporte formal de incidencias o requerimientos",
                "Base de Conocimientos — Acceso a guías, videos y preguntas frecuentes",
                "Soporte Premium — Prioridad para contingencias críticas de facturación o nómina",
                "Seguimiento de Estado — Consulta el progreso de tus requerimientos en tiempo real"
            ],
            workflow: [
                { step: 1, title: "Consultar Documentación", description: "Busca primero en este centro de ayuda usando la barra de búsqueda superior." },
                { step: 2, title: "Crear Ticket", description: "Si no encuentras la solución, usa el botón 'Solicitar Soporte' y describe tu caso." },
                { step: 3, title: "Adjuntar Evidencia", description: "Capturas de pantalla o mensajes de error ayudan a resolver tu caso más rápido." },
                { step: 4, title: "Recibir Respuesta", description: "Nuestro equipo te contactará por este medio o por correo electrónico." }
            ],
            subsections: [
                { title: "Mis Tickets", path: "#", description: "Historial de requerimientos solicitados" },
                { title: "Status del Sistema", path: "#", description: "Verifica si hay mantenimientos programados" }
            ],
            tips: [
                "Sé lo más específico posible al reportar un error: ¿qué estabas haciendo cuando ocurrió?",
                "Consulta los videos tutoriales para aprender a usar funciones complejas paso a paso",
                "Los tickets con prioridad 'Crítica' deben usarse solo para caídas totales del sistema"
            ]
        }
    }
];
