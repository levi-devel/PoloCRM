import React from 'react';
import { Input } from './input';

interface PhoneInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
}

export function PhoneInput({ value, onChange, placeholder, required }: PhoneInputProps) {
    const formatPhoneNumber = (input: string): string => {
        // Remove tudo que não é número
        const numbers = input.replace(/\D/g, '');

        // Não formata se não tiver pelo menos 2 dígitos (DDD)
        if (numbers.length < 2) {
            return numbers;
        }

        // Formata conforme o tamanho
        if (numbers.length <= 2) {
            return `(${numbers}`;
        } else if (numbers.length <= 6) {
            // (XX) XXXX
            return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
        } else if (numbers.length <= 10) {
            // Número fixo: (XX) XXXX-XXXX
            return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
        } else {
            // Número celular com 9 dígitos: (XX) 9 XXXX-XXXX
            const ddd = numbers.slice(0, 2);
            const firstDigit = numbers.slice(2, 3);
            const middlePart = numbers.slice(3, 7);
            const lastPart = numbers.slice(7, 11);
            return `(${ddd}) ${firstDigit} ${middlePart}-${lastPart}`;
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value;
        const numbers = input.replace(/\D/g, '');

        // Limita a 11 dígitos (DDD + 9 dígitos)
        if (numbers.length <= 11) {
            const formatted = formatPhoneNumber(input);
            onChange(formatted);
        }
    };

    return (
        <Input
            type="text"
            value={value}
            onChange={handleChange}
            placeholder={placeholder || "(XX) X XXXX-XXXX"}
            required={required}
            maxLength={16} // (XX) 9 XXXX-XXXX = 16 caracteres
        />
    );
}
