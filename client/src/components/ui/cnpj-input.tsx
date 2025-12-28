import React from "react";
import { Input } from "@/components/ui/input";

interface CNPJInputProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

/**
 * Componente de Input com máscara de CNPJ
 * Formato: 00.000.000/0000-00
 */
export function CNPJInput({ value = "", onChange, placeholder, className, disabled }: CNPJInputProps) {
    const formatCNPJ = (valor: string): string => {
        // Remove tudo que não é número
        const nums = valor.replace(/\D/g, "");

        // Aplica a máscara: 00.000.000/0000-00
        let formatted = nums;

        if (nums.length <= 2) {
            formatted = nums;
        } else if (nums.length <= 5) {
            formatted = `${nums.slice(0, 2)}.${nums.slice(2)}`;
        } else if (nums.length <= 8) {
            formatted = `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5)}`;
        } else if (nums.length <= 12) {
            formatted = `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5, 8)}/${nums.slice(8)}`;
        } else {
            formatted = `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5, 8)}/${nums.slice(8, 12)}-${nums.slice(12, 14)}`;
        }

        return formatted;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatCNPJ(e.target.value);
        onChange?.(formatted);
    };

    return (
        <Input
            type="text"
            value={value}
            onChange={handleChange}
            placeholder={placeholder || "00.000.000/0000-00"}
            className={className}
            disabled={disabled}
            maxLength={18} // Tamanho máximo do CNPJ formatado
        />
    );
}
