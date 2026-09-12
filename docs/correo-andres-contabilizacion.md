# Correo para Andrés — Info contable para automatizar la contabilización

**Asunto:** Reglas contables para automatizar la contabilización en el ERP (GVM Corp)

---

Andrés, buen día.

Ya estamos listos para construir la **contabilización automática** de documentos en el nuevo ERP. Buena noticia: el **Plan Único de Cuentas (PUC) ya quedó cargado** (las cuentas ya existen, ej. 130505 Deudores nacionales, 240801 IVA generado, 236575 Autorretención, etc.).

Para armarlo **no necesito el modelo completo de WorldOffice** (son miles de líneas, muchas de documentos internos que aquí no usamos). Solo necesito que me **confirmes las reglas del asiento** de los documentos que sí manejamos. Empezamos por la **Factura de Venta** y luego vamos avanzando.

## 1) Factura de Venta (FV) — ¿este asiento es correcto?
Para la venta de un producto **gravado al 19%**, a crédito:

| Cuenta | Manejo | Valor |
|---|---|---|
| 130505 Deudores nacionales | Débito | Total (base + IVA − retenciones) |
| 4135xx Ingreso (según producto) | Crédito | Base |
| 240801 IVA generado 19% | Crédito | IVA |
| 236575 Autorretención de renta | Crédito | Base × % |
| 135515 Autorretención de renta | Débito | Base × % |

**Preguntas:**
- ¿Es correcto? ¿Qué cambia si el cliente es **persona natural** o si la venta es de **contado** (recibo de caja) en vez de crédito?
- ¿Y para productos **exentos/excluidos (0%)** o al **5%**?

## 2) Cuenta de ingreso por producto (lo más importante)
La **cuenta de ingreso (4135xx)** cambia según el producto. ¿Cómo la definimos?
- ¿Se puede **deducir del Grupo/Clasificación** del producto? (ej. todos los del grupo X → cuenta Y), **o**
- ¿Me puedes pasar un **Excel simple**: `SKU` (o `Grupo`) → `Cuenta de ingreso`?

## 3) Retenciones
- ¿Qué **% de autorretención de renta** aplica y a qué cuentas? (vi 236575 / 135515 al **0,55%**)
- ¿Cuándo aplica **ReteIVA** o **ReteICA** y a qué cuentas?

## 4) Los demás documentos (para las siguientes fases — cuando puedas)
El mismo cuadrito (cuentas Débito/Crédito) para:
- **Compra remisionada / Factura de compra (FC)**
- **Documento Soporte (DS)**
- **Recibo de caja** y **Comprobante de egreso**
- **Nómina** (para confirmar las cuentas que ya usamos)

Con la **Factura de Venta** y el **mapeo de la cuenta de ingreso** arranco de inmediato. Cualquier cosa lo hablamos en la reunión.

Gracias,
**Fernando Bolívar**
