import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { Account } from "../types";

interface AccountListProps {
    accounts: Account[];
}

export function AccountList({ accounts }: AccountListProps) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[100px]">Código</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Naturaleza</TableHead>
                        <TableHead className="text-right">Tipo</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {accounts.map((account) => (
                        <TableRow key={account.id}>
                            <TableCell className="font-medium">{account.code}</TableCell>
                            <TableCell>{account.name}</TableCell>
                            <TableCell>
                                <Badge variant={account.nature === 'DEBIT' ? 'default' : 'secondary'}>
                                    {account.nature === 'DEBIT' ? 'Débito' : 'Crédito'}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                {account.is_auxiliary ? 'Auxiliar' : 'Mayor'}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
