
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function test() {
    const { data, error } = await supabase
        .from('journal_lines')
        .select(`
        account_id,
        debit,
        credit,
        chart_accounts(code, name),
        journal_entries!inner(entry_date)
    `)
        .gte('journal_entries.entry_date', '2026-02-01')
        .lte('journal_entries.entry_date', '2026-02-28');

    console.log('Data:', data);
    console.log('Error:', error);
}

test();
