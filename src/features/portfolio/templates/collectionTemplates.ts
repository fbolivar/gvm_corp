export type CollectionTone = 'PROFESSIONAL' | 'FRIENDLY' | 'FIRM';

export const collectionTemplates: Record<CollectionTone, any> = {
    PROFESSIONAL: {
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
                    <p style="margin-top: 40px; font-size: 14px; color: #94a3b8;">— Departamento de Cobranza @ {company}</p>
                </div>
            `
        }
    },
    FRIENDLY: {
        REMINDER_1: {
            subject: "¡Hola! Un pequeño recordatorio de {company} 😊",
            body: `
                <div style="font-family: sans-serif; padding: 20px; color: #334155;">
                    <h2 style="color: #6366f1;">¡Hola {name}! 👋</h2>
                    <p>Esperamos que estés muy bien el día de hoy.</p>
                    <p>Pasamos por aquí solo para recordarte que tenemos la factura <strong>{number}</strong> pendiente de pago ({due_date}).</p>
                    <p>Sabemos que a veces el día a día nos hace olvidar pequeños detalles. ¿Podrías ayudarnos verificando si ya se realizó el pago?</p>
                    <div style="margin: 30px 0; padding: 20px; background: #f0fdf4; border-radius: 12px; border: 1px solid #bbf7d0;">
                        <p style="margin: 0; font-size: 12px; color: #166534; text-transform: uppercase; font-weight: bold;">Monto Pendiente</p>
                        <p style="margin: 10px 0; font-size: 18px; color: #0f172a; font-weight: 800;">{total}</p>
                    </div>
                    <p>Cualquier duda que tengas, ¡aquí estamos para escucharte!</p>
                    <p style="margin-top: 40px; font-size: 14px; color: #94a3b8;">Con cariño, el equipo de {company} 💙</p>
                </div>
            `
        },
        REMINDER_2: {
            subject: "Seguimos pendientes de ti - Factura {number}",
            body: `
                <div style="font-family: sans-serif; padding: 20px; color: #334155;">
                    <h2 style="color: #6366f1;">{name}, ¿va todo bien?</h2>
                    <p>Notamos que la factura <strong>{number}</strong> aún no ha sido cancelada y ya lleva <strong>{days} días</strong> vencida.</p>
                    <p>Si tienes alguna dificultad con el pago o necesitas que revisemos algo juntos, por favor avísanos. ¡Queremos ayudarte!</p>
                    <div style="margin: 30px 0; padding: 20px; background: #fffbeb; border-radius: 12px; border: 1px solid #fde68a;">
                        <p style="margin: 0; font-size: 12px; color: #92400e; text-transform: uppercase; font-weight: bold;">Estamos aquí para apoyarte</p>
                        <p style="margin: 10px 0; font-size: 18px; color: #0f172a; font-weight: 800;">TOTAL: {total}</p>
                    </div>
                    <p>Quedamos atentos a tu mensaje.</p>
                    <p style="margin-top: 40px; font-size: 14px; color: #94a3b8;">¡Un abrazo! — Equipo de Cartera @ {company}</p>
                </div>
            `
        },
        FINAL_NOTICE: {
            subject: "Ayúdanos a evitar la suspensión de tu cuenta 🛑",
            body: `
                <div style="font-family: sans-serif; padding: 20px; color: #334155;">
                    <h2 style="color: #e11d48;">¡No queremos que pierdas tus beneficios!</h2>
                    <p>Hola {name}, nos preocupa un poco que la factura <strong>{number}</strong> por <strong>{total}</strong> siga pendiente.</p>
                    <p>Lamentablemente, si no recibimos el pago pronto, el sistema suspenderá automáticamente el acceso a tus servicios/créditos. ¡No dejes que eso pase!</p>
                    <p>Por favor, realiza el pago hoy mismo o contáctanos para encontrar una solución manual.</p>
                    <p style="margin-top: 40px; font-size: 14px; color: #94a3b8;">Esperamos seguir trabajando juntos — {company}</p>
                </div>
            `
        }
    },
    FIRM: {
        REMINDER_1: {
            subject: "REQUERIMIENTO DE PAGO: Factura en mora {number} - {company}",
            body: `
                <div style="font-family: sans-serif; padding: 20px; color: #334155;">
                    <h2 style="color: #0f172a;">COMUNICACIÓN OFICIAL</h2>
                    <p>Se le informa que la factura <strong>{number}</strong> por valor de <strong>{total}</strong> registra un estado de mora desde el {due_date}.</p>
                    <p>Le solicitamos realizar el abono o pago total antes de las próximas 24 horas para evitar cargos por mora o reportes en su historial.</p>
                    <div style="margin: 30px 0; padding: 20px; background: #f1f5f9; border-radius: 12px; border: 1px solid #cbd5e1;">
                        <p style="margin: 0; font-size: 12px; color: #475569; text-transform: uppercase; font-weight: bold;">Detalles del Recaudo</p>
                        <p style="margin: 10px 0; font-size: 18px; color: #0f172a; font-weight: 800;">{total}</p>
                    </div>
                    <p>Ignore este mensaje si ya efectuó el pago y envíe el comprobante.</p>
                    <p style="margin-top: 40px; font-size: 14px; color: #0f172a; font-weight: bold;">— Departamento Financiero @ {company}</p>
                </div>
            `
        },
        REMINDER_2: {
            subject: "SEGUNDO REQUERIMIENTO: Incumplimiento de pago {number}",
            body: `
                <div style="font-family: sans-serif; padding: 20px; color: #334155;">
                    <h2 style="color: #e11d48;">AVISO TÉCNICO DE MORA</h2>
                    <p>A pesar de nuestra comunicación anterior, la factura <strong>{number}</strong> sigue sin reportar pago, con <strong>{days} días</strong> de retraso.</p>
                    <p>El incumplimiento reiterado afecta negativamente su estatus crediticio con nosotros.</p>
                    <div style="margin: 30px 0; padding: 20px; background: #fef2f2; border-radius: 12px; border: 1px solid #fee2e2;">
                        <p style="margin: 0; font-size: 12px; color: #b91c1c; text-transform: uppercase; font-weight: bold;">Último Aviso Administrativo</p>
                        <p style="margin: 10px 0; font-size: 18px; color: #0f172a; font-weight: 800;">VALOR EXIGIBLE: {total}</p>
                    </div>
                    <p>Proceda con el pago inmediato para normalizar su situación.</p>
                    <p style="margin-top: 40px; font-size: 14px; color: #0f172a; font-weight: bold;">— Control de Crédito @ {company}</p>
                </div>
            `
        },
        FINAL_NOTICE: {
            subject: "NOTIFICACIÓN PRE-LEGAL: Suspensión de servicios y reporte {number}",
            body: `
                <div style="font-family: sans-serif; padding: 20px; color: #334155;">
                    <h2 style="color: #e11d48;">ULTIMÁTUM DE COBRO</h2>
                    <p>Debido al impago de la factura <strong>{number}</strong> por <strong>{total}</strong>, se ha iniciado formalmente el protocolo de suspensión de servicios.</p>
                    <p>Esta es su última oportunidad para regularizar su cuenta de manera administrativa. De lo contrario, el expediente será trasladado al área legal y se aplicarán bloqueos definitivos.</p>
                    <p>Realice el pago de inmediato y envíe soporte a tesoreria@{company}.com</p>
                    <p style="margin-top: 40px; font-size: 14px; color: #0f172a; font-weight: bold;">— Área de Cobranza Jurídica @ {company}</p>
                </div>
            `
        }
    }
};
