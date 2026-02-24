export const collectionTemplates = {
    REMINDER_1: {
        subject: "Recordatorio de Pago: Factura {number} - {company}",
        body: `
            <div style="font-family: sans-serif; padding: 20px; color: #334155;">
                <h2 style="color: #6366f1;">Hola, {name}</h2>
                <p>Esperamos que estés teniendo un buen día.</p>
                <p>Te escribimos de <strong>{company}</strong> para recordarte amablemente que la factura <strong>{number}</strong> por valor de <strong>{total}</strong> ha superado su fecha de vencimiento ({due_date}).</p>
                <p>Entendemos que esto puede ser un descuido, por lo que te agradeceríamos si pudieras confirmar el estado del pago o realizarlo a la mayor brevedad posible.</p>
                <div style="margin: 30px 0; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
                    <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold;">Resumen de Deuda</p>
                    <p style="margin: 10px 0; font-size: 18px; color: #0f172a; font-weight: 800;">TOTAL: {total}</p>
                </div>
                <p>Si ya realizaste el pago, por favor ignora este mensaje y envíanos el soporte para actualizar tu estado en nuestro sistema.</p>
                <p style="margin-top: 40px; font-size: 14px; color: #94a3b8;">— Portfolio IQ Agent @ {company}</p>
            </div>
        `
    },
    REMINDER_2: {
        subject: "AVISO SEGUNDO: Factura pendiente de pago {number} - {company}",
        body: `
            <div style="font-family: sans-serif; padding: 20px; color: #334155;">
                <h2 style="color: #6366f1;">Estimado(a) {name}</h2>
                <p>Notamos que aún no hemos recibido el pago de la factura <strong>{number}</strong>, la cual presenta un retraso de <strong>{days} días</strong>.</p>
                <p>Para nosotros es muy importante mantener tu cuenta al día para evitar interrupciones en el servicio o cargos adicionales.</p>
                <div style="margin: 30px 0; padding: 20px; background: #fff1f2; border-radius: 12px; border: 1px solid #fecdd3;">
                    <p style="margin: 0; font-size: 12px; color: #e11d48; text-transform: uppercase; font-weight: bold;">Estado Crítico</p>
                    <p style="margin: 10px 0; font-size: 18px; color: #0f172a; font-weight: 800;">VALOR PENDIENTE: {total}</p>
                </div>
                <p>Por favor, realiza el pago hoy mismo a través de nuestros canales autorizados.</p>
                <p style="margin-top: 40px; font-size: 14px; color: #94a3b8;">— Gestión de Cartera @ {company}</p>
            </div>
        `
    },
    FINAL_NOTICE: {
        subject: "AVISO FINAL: Suspensión de crédito/servicio - Factura {number}",
        body: `
            <div style="font-family: sans-serif; padding: 20px; color: #334155;">
                <h2 style="color: #e11d48;">AVISO DE SUSPENSIÓN</h2>
                <p>Lamentamos informarte que debido al impago prolongado de la factura <strong>{number}</strong> ({total}), procederemos a la suspensión de créditos y/o servicios asociados a tu cuenta.</p>
                <p>Para evitar que el caso sea escalado a nuestro departamento legal, te solicitamos realizar el pago de forma inmediata.</p>
                <p>Si tienes alguna dificultad técnica con el pago, por favor contáctanos de inmediato para buscar una solución.</p>
                <p style="margin-top: 40px; font-size: 14px; color: #94a3b8;">— Departamento de Cobranza @ {company}</p>
            </div>
        `
    }
};
