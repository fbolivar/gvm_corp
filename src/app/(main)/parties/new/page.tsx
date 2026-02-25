'use client'

// Since PartyForm is client, handling 'onSubmit' that calls server action is tricky if not passed directly? 
// No, verify: Server Actions can be imported in Client Components.
// But I defined `createPartyAction` as `use server`.
// So I can import it here.
import { createPartyAction } from '@/features/parties/actions';
import { PartyForm } from '@/features/parties/components/PartyForm';
import { toast } from 'sonner';

export default function NewPartyPage() {

    const handleSubmit = async (data: any) => {
        // We need to wrap action to handle response/error locally?
        // Server action redirects on success.
        // If error, it returns object.
        const result = await createPartyAction(data);
        if (result?.error) {
            toast.error(`Error: ${result.error}`);
        }
    };

    return (
        <div className="pb-20">
            <PartyForm onSubmit={handleSubmit} />
        </div>
    );
}
