# PRP-005: Agente Autónomo de Cobro de Cartera (Portfolio IQ Agent)

> **Estado**: 📝 Borrador (Esperando Aprobación)
> **Autor**: Antigravity (Cerebro de la Fábrica)
> **Fecha**: 2026-02-23

---

## 1. 🎯 Objetivo
Transformar el proceso manual de cobranza en un sistema **agéntico y proactivo**. El Agente Autónomo monitorizará la cartera en tiempo real, ejecutará acciones de comunicación y escalará casos críticos para maximizar el flujo de caja.

## 2. 🧠 Capacidades del Agente
- **Vigilancia 24/7**: Revisión automática de facturas que cambian de estado a "Vencidas".
- **Segmentación Inteligente**: Clasificación de clientes según su comportamiento de pago y monto adeudado.
- **Acciones Multicanal**: Envío programado de recordatorios vía Email (Fase 1) y registro de bitácora.
- **Auto-Aprendizaje (V2)**: Ajuste de tonos de comunicación basados en la efectividad histórica.

## 3. 🏗️ Arquitectura de la Feature

### A. Base de Datos (Supabase)
Necesitamos tablas para la "memoria" y configuración del agente:
- `collection_agent_config`: Reglas de negocio (días de gracia, tonos de mensaje, topes de monto).
- `collection_actions`: Registro de cada acción tomada (ej: "Enviado correo de recordatorio 1").
- `debtor_profiles`: Notas del agente sobre el comportamiento de cada cliente.

### B. Core Logic (Next.js Services)
- `CollectionAgentService`: El "motor" del agente que evalúa qué acciones tomar cada día.
- `NotificationService`: Integración para despacho de comunicaciones.

### C. Interfaz de Usuario (Industrial V3)
- **Agent Control Room**: Dashboard para ver qué está haciendo el agente en vivo.
- **Manual Override**: Botón para "Pausar Agente" en clientes específicos (Ventas VIP).
- **Métricas de Impacto**: Gráficos de "Días de Cartera Reducidos".

## 4. 📅 Fases de Implementación

### Fase 1: Cimientos y Configuración
- Creación de tablas de configuración y logs.
- UI de Configuración del Agente.
- Lógica de detección de facturas vencidas.

### Fase 2: Acción y Comunicación
- Generación automática de comunicaciones (Plantillas dinámicas).
- Ejecución de "Primer Aviso" y "Segundo Aviso".
- Registro en la bitácora del cliente.

### Fase 3: Dashboard y Control
- Visualización de la actividad del agente.
- Filtros de exclusión (No cobrar a X cliente automáticamente).
- Reportes de efectividad.

## 5. 🛡️ Seguridad y Control (Human-in-the-loop)
- El agente **NUNCA** puede anular facturas solo.
- El agente **SOLO** envía comunicaciones, no procesa pagos directamente sin gateway.
- Notificación al humano cuando una factura supera los 90 días (Escalamiento Legal).

---

¿Aprobamos este Blueprint para iniciar con la **Fase 1: Configuración y DB**?
