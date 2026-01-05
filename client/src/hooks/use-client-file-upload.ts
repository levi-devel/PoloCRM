import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface FileAttachment {
    originalName: string;
    storedName: string;
    fileSize: number;
    uploadDate: string;
    mimeType: string;
}

export function useClientFileUpload() {
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { toast } = useToast();

    const uploadFile = async (clientId: number, file: File): Promise<FileAttachment | null> => {
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch(`/api/clientes/${clientId}/upload-spec`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Falha ao fazer upload");
            }

            const data = await response.json();

            toast({
                title: "Sucesso",
                description: "Arquivo enviado com sucesso",
            });

            return data.file;
        } catch (error: any) {
            toast({
                title: "Erro",
                description: error.message || "Falha ao fazer upload do arquivo",
                variant: "destructive",
            });
            return null;
        } finally {
            setIsUploading(false);
        }
    };

    const deleteFile = async (clientId: number): Promise<boolean> => {
        setIsDeleting(true);
        try {
            const response = await fetch(`/api/clientes/${clientId}/delete-spec`, {
                method: "DELETE",
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Falha ao excluir arquivo");
            }

            toast({
                title: "Sucesso",
                description: "Arquivo excluído com sucesso",
            });

            return true;
        } catch (error: any) {
            toast({
                title: "Erro",
                description: error.message || "Falha ao excluir o arquivo",
                variant: "destructive",
            });
            return false;
        } finally {
            setIsDeleting(false);
        }
    };

    const getDownloadUrl = (clientId: number): string => {
        return `/api/clientes/${clientId}/download-spec`;
    };

    const getViewUrl = (clientId: number): string => {
        return `/api/clientes/${clientId}/view-spec`;
    };

    return {
        uploadFile,
        deleteFile,
        getDownloadUrl,
        getViewUrl,
        isUploading,
        isDeleting,
    };
}
