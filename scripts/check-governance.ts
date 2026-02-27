import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role to check tables
);

async function check() {
    const { data, error } = await supabase.from('app_roles').select('count');
    if (error) {
        console.log('ERROR:', JSON.stringify(error, null, 2));
    } else {
        console.log('SUCCESS: app_roles exists');
    }
}

check();
