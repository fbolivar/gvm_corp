# Correo para Andrés — Confirmaciones para activar la contabilización automática

**Asunto:** Contabilización automática de ventas — ya quedó cargada tu matriz; me faltan 3 cosas para activarla

---

Andrés, buen día.

Gracias por el cuadro. Ya lo cargamos completo en el ERP: **757 reglas** (las tres tarifas de IVA, factura y nota crédito, contado y crédito, y los 13 tipos de contribuyente). El motor ya arma el asiento solo y lo probamos contra una factura real; cuadra débito con crédito.

Con tu cuadro quedó resuelto lo que más me preocupaba: **la cuenta de ingreso sale de la tarifa de IVA del producto** (0% → 41352201, 5% → 41352202, 19% → 41352203), así que no necesito un mapeo producto por producto.

Me faltan tres cosas para poder encenderlo.

## 1) Las tarifas (las bases ya me las diste, los porcentajes no)

Tengo las bases: retefuente $524.000, ICA $1.414.000, reteIVA $0. Me falta **cuánto** se aplica:

| Retención | Base | Tarifa |
|---|---|---|
| Retefuente por ventas (13551501) | $524.000 | **¿?** % |
| ReteIVA (13551701) | $0 | **¿?** % — ¿sobre el valor del IVA, no sobre la base? |
| ReteICA (13551801) | $1.414.000 | **¿?** por mil, **por ciudad** |
| Autorretención de renta (13551511 / 23657501) | — | ¿confirmas 0,55% sobre la base? |

Para el **ICA** necesito la tabla de tarifas por municipio donde facturamos (aunque sea las 10 ciudades principales y una tarifa por defecto para el resto). Hoy tenemos clientes en 353 ciudades distintas.

## 2) El tipo de contribuyente de cada cliente

Todo tu cuadro gira alrededor del tipo de contribuyente, pero **ese dato no vino en el listado de terceros que exportamos de WorldOffice** (solo trae Cliente/Proveedor, dirección y ciudad). Sin él, los 6.697 terceros quedan sin clasificar y el sistema no puede decidir qué retención aplicar.

**¿Nos puedes exportar de WorldOffice el listado de terceros incluyendo la columna "Propiedad de retención"?** Con eso los clasificamos a todos de una vez.

## 3) Cinco puntos del cuadro que quiero confirmarte

Al cargarlo revisamos las 757 filas y encontramos estas diferencias. Puede que varias sean intencionales, pero prefiero preguntarte antes de dejarlas en firme:

1. **El ICA cambia según la forma de pago.** A "Persona Jurídica" se le aplica ICA en las ventas de contado, pero no en las de crédito (hojas de 19% y 5%). ¿Es correcto? Yo entendería que el ICA no depende de si la venta es de contado o a crédito.
2. **"Tercero del Exterior"** solo aparece en una de las 12 hojas (Excluido 0% contado). ¿Cómo se contabiliza en las demás? Además, en esa única fila no hay cuenta de cartera (13050501).
3. **"Entidades Sin Ánimo de Lucro"** no aparece en IVA 5% a crédito ni en ninguna de las hojas de devoluciones de 5% y 19%.
4. **Régimen Simple**: en crédito no tiene ninguna retención, pero en contado sí tiene autorretención. ¿Intencional?
5. **Error puntual**: en `DEV IVA 19% / Persona Natural Autorretenedor / crédito` la cuenta es **41352203 (venta 19%)**, donde en todos los demás casos va **417503 (devoluciones 19%)**.

## Y para confirmar cómo estamos armando el asiento

Así lo dejamos; dime si algo cambia:

- **Cartera (13050501)** = base + IVA − retefuente − reteICA − reteIVA.
- **Autorretención**: va doble (13551511 al débito y 23657501 al crédito) y **no afecta** el valor de la cartera, porque no la retiene el cliente.
- Si la factura mezcla productos de varias tarifas, se genera una línea de ingreso y una de IVA **por cada tarifa**, pero la cartera y las retenciones **una sola vez** sobre el total del documento.
- Retenciones solo si la base supera el mínimo que nos diste.

Con las tarifas y el export de terceros lo activamos y te paso las primeras facturas contabilizadas para que las compares contra WorldOffice, antes de dejarlo corriendo solo.

Lo de los demás documentos (factura de compra, documento soporte, recibo de caja, egreso y nómina) lo dejamos para después, como quedamos, cuando puedas revisarlos documento por documento.

Gracias,
**Fernando Bolívar**
