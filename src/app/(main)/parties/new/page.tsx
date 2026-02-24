'use client'

// Since PartyForm is client, handling 'onSubmit' that calls server action is tricky if not passed directly? 
// No, verify: Server Actions can be imported in Client Components.
// But I defined `createPartyAction` as `use server`.
// So I can import it here.
import { createPartyAction } from '@/features/parties/actions';
import { PartyForm } from '@/features/parties/components/PartyForm';
// I didn't install sonner. I'll use simple alert for now.

export default function NewPartyPage() {

    const handleSubmit = async (data: any) => {
        // We need to wrap action to handle response/error locally?
        // Server action redirects on success.
        // If error, it returns object.
        const result = await createPartyAction(data);
        if (result?.error) {
            alert(`Error: ${result.error}`);
        }
    };

    return (
        <div className="container mx-auto py-6 max-w-2xl">
            <h1 className="text-2xl font-bold mb-4">Nuevo Tercero</h1>
            <PartyForm onSubmit={handleSubmit} />
        </div>
    );
}
