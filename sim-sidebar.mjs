import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(url, serviceKey)

async function simulate() {
    const userId = '53097945-744d-44c9-84a2-ec3174693bca'; // fbolivarb@outlook.com

    const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('role, role_id, tenant_id')
        .eq('user_id', userId)
        .maybeSingle();

    if (userTenant) {
        const roleName = userTenant.role || 'Miembro';
        const HIGH_LEVEL_ROLES = ['SUPER ADMINISTRADOR', 'ADMINISTRADOR', 'owner', 'admin'];
        const isHighLevel = HIGH_LEVEL_ROLES.includes(roleName);

        let permMap = {};
        let permsLen = 0;
        if (userTenant.role_id) {
            const { data: perms } = await supabase
                .from('role_permissions')
                .select('module_key, can_view')
                .eq('role_id', userTenant.role_id);
            permsLen = perms?.length || 0;
            perms?.forEach(p => {
                if (p.can_view) permMap[p.module_key] = true;
            });
        }

        const out = {
            roleName,
            isHighLevel,
            permsLen,
            permMap
        };

        fs.writeFileSync('sim-out.json', JSON.stringify(out, null, 2))
    }
}

simulate().catch(console.error)
