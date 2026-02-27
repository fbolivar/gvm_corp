# PRP: Seguridad y Gobernanza (RLS & Roles Matrix)

> **Estado**: ✅ COMPLETADO
> **Fecha**: 2026-02-27
> **Migración**: `20260227050000_governance_complete.sql`

## 🎯 Objetivo
Implementar un sistema de seguridad robusto basado en roles específicos, perfiles de acceso matriciales por módulo y segmentación por zonas geográficas, asegurando que el SaaS no asuma permisos de administrador por defecto.

## 🏗️ Propuesta Arquitectónica

### 1. Base de Datos (Supabase/PostgreSQL)
Se crearán las siguientes estructuras para soportar la gobernanza:

- **`app_roles`**: Almacenará los 31 roles solicitados.
- **`app_modules`**: Catálogo de módulos del sistema (Contabilidad, Inventario, Logística, etc.).
- **`role_permissions`**: Matriz que define si un rol tiene acceso a un módulo específico.
- **`zones`**: Tabla de zonas geográficas para segmentación de personal.
- **`user_tenants` (Update)**: Se vinculará con `role_id` y `zone_id` para aplicar RLS.

### 2. Seguridad (RLS)
Se implementarán políticas de Row Level Security (RLS) en todas las tablas críticas:
- Solo usuarios con roles permitidos podrán ver/editar registros.
- Segmentación por `zone_id` para personal operativo (Conductores, Asistentes Técnicos).
- Validación de permisos mediante una función RPC `check_module_access(module_name)`.

### 3. Frontend (Next.js/React)
- **Tabs en Gestión de Equipo**:
    - **Miembros**: Listado actual mejorado.
    - **Roles & Permisos**: Matriz interactiva para configurar qué módulos ve cada rol.
    - **Zonas**: Configuración de las zonas del país.
- **Asignación de Zona**: Al editar un miembro del equipo, permitir seleccionar su zona.
- **Middleware de Acceso**: Bloqueo de rutas basado en la matriz de permisos.

## 🛠️ Fases de Ejecución

### Fase 1: Migración de Datos (Cimiento)
Instalar las tablas `app_roles`, `app_modules`, `role_permissions` y `zones`. Poblar con los 31 roles iniciales.

### Fase 2: Lógica de Negocio (Cerebro)
Crear funciones de base de datos para validar acceso y aplicar RLS estricto.

### Fase 3: Interfaz de Usuario (Fábrica)
Configurar la interfaz en `Ajustes > Organización > Gestión de Equipo` con la matriz de selección y gestión de zonas.

### Fase 4: Blindaje (Quality Control)
Pruebas de acceso con diferentes roles para asegurar que el RLS funciona y el usuario no ve lo que no le corresponde.

## 📋 Roles a Implementar
1. ASISTENTE ADMINISTRATIVO
2. ADMINISTRADOR BODEGA
3. ASISTENTE LOGISTICO
4. ASISTENTE COMERCIAL
5. CONDUCTOR
6. ASISTENTE TECNICO
7. AUXILIAR DE LOGISTICA
8. JEFE ADMINISTRATIVO
9. REPRESENTANTE COMERCIAL
10. TECHNICAL MANAGER
11. ANALISTA DE COMPRAS
12. APRENDIZ SENA
13. ASISTENTE DE GERENCIA VENTAS
14. GESTOR LOGISTICO
15. AUXILIAR DE FACTURACION
16. AUXILIAR CONTABLE
17. CONTADOR
18. COORDINADOR DE ALMACEN
19. COORDINADORA DE CALIDAD Y GESTION HUMANA
20. GENERAL MANAGER
21. GESTOR DE TESORERIA Y CARTERA
22. JEFE DE BIOSEGURIDAD
23. JEFE DE LOGISTICA
24. OPERARIA DE SERVICIOS GENERALES
25. SALES AND MARKETING MANAGER
26. REPRESENTANTE TECNICO
27. ADMINISTRADOR
28. SUPER ADMINISTRADOR

*(Se consolidaron duplicados de la lista original)*

---
**¿Deseas que proceda con la creación de la migración de base de datos para la Fase 1?**
