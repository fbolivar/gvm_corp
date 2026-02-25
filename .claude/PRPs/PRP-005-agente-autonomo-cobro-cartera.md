# PRP-005: Agente Autónomo de Cobro de Cartera (Portfolio IQ Agent)

> **Estado**: ✅ COMPLETADO
> **Autor**: Antigravity (Cerebro de la Fábrica)
> **Fecha**: 2026-02-25

---

## 1. 🎯 Objetivo
Transformar el proceso manual de cobranza en un sistema **agéntico y proactivo**. El Agente Autónomo monitoriza la cartera en tiempo real, ejecuta acciones de comunicación y escala casos críticos para maximizar el flujo de caja.

## 2. 🧠 Capacidades del Agente
- **Vigilancia 24/7**: Revisión automática de facturas vencidas.
- **Segmentación Inteligente (BASED EN RIESGO)**: Clasificación CRITICAL, HIGH, MEDIUM, LOW.
- **Matriz de Riesgo AI**: Visualización de impacto financiero por segmento.
- **Promedio de Pago**: Cálculo automático de "Días de Pago" por deudor.
- **Tono de Voz Configurable**: Profesional, Amigable o Firme.

## 3. 🏗️ Arquitectura de la Feature
- `collection_agent_config`: Memoria de configuración y tono.
- `collection_actions`: Bitácora técnica de intervenciones AI.
- `debtor_profiles`: Inteligencia acumulada por deudor (Avg Days, Risk).

## 4. 📅 Roadmap de Implementación

### ✅ Fase 1, 2 y 3 (COMPLETADO)
- Motor de detección de facturas y ciclos de gracia.
- Plantillas dinámicas por tono (Industrial Design).
- Dashboard de Matriz de Riesgo y Gestión de VIPs/Exclusiones.
- Cálculo de métricas de efectividad y velocidad de pago.

### ✅ Fase 4: Escalado y Multicanal (COMPLETADO)
- **Portal de Deudores (Self-Service)**: Link único para el pago de facturas.
- **Integración Multicanal (WhatsApp/SMS)**: Interfaz preparada en el dashboard para switches rápidos de comunicación.

### ✅ Fase 5: AI Forecasting y Acciones Pre-Legales (COMPLETADO)
- **Tablero de Conciliación**: Portal interno para validar los comprobantes de pago subidos.
- **Predicción de Riesgo (Forecast)**: Cálculo avanzado por días promedio de retraso cruzando el umbral pre-legal y emitiendo alertas de impacto económico en la matriz de UI.

## 5. 🛡️ Seguridad y Control
- RLS garantizada por `tenant_id` tanto para la configuración como para subidas anónimas al portal.
- Los RPC filtran data no autenticada de los documentos al público.

---

**Proyecto Portfolio IQ Agent CERRADO y ENTREGADO.**
