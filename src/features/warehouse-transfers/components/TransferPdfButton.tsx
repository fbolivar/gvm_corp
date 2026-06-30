"use client"

import { Button } from "@/shared/components/ui/button"
import { FileDown } from "lucide-react"
import { transferPdfService } from "../services/transferPdfService"
import type { TransferWithDetails } from "../types"
import type { PdfCompany } from "@/shared/lib/pdfKit"

export function TransferPdfButton({ transfer, company }: { transfer: TransferWithDetails; company: PdfCompany }) {
    return (
        <Button
            variant="outline"
            onClick={() => transferPdfService.generate(transfer, company)}
            className="h-11 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2 border-slate-200 text-slate-600 hover:text-primary"
        >
            <FileDown className="h-4 w-4" /> Generar PDF
        </Button>
    )
}
