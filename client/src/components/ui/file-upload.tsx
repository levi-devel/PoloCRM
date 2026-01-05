import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Download, Trash2, FileText, Loader2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileAttachment {
    originalName: string;
    storedName: string;
    fileSize: number;
    uploadDate: string;
    mimeType: string;
}

interface FileUploadProps {
    currentFile: FileAttachment | null;
    onFileSelect: (file: File) => void;
    onFileDelete: () => void;
    onFileDownload: () => void;
    onFileView: () => void;
    isUploading?: boolean;
    isDeleting?: boolean;
    disabled?: boolean;
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

export function FileUpload({
    currentFile,
    onFileSelect,
    onFileDelete,
    onFileDownload,
    onFileView,
    isUploading = false,
    isDeleting = false,
    disabled = false,
}: FileUploadProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (disabled || isUploading) return;

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
        }
    };

    const handleClick = () => {
        if (!disabled && !isUploading) {
            fileInputRef.current?.click();
        }
    };

    if (currentFile) {
        return (
            <div className="border border-border rounded-lg p-4 bg-card">
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{currentFile.originalName}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {formatFileSize(currentFile.fileSize)} • Enviado em {formatDate(currentFile.uploadDate)}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2 ml-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onFileView}
                            disabled={disabled}
                            title="Visualizar arquivo"
                        >
                            <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onFileDownload}
                            disabled={disabled}
                            title="Baixar arquivo"
                        >
                            <Download className="w-4 h-4" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onFileDelete}
                            disabled={disabled || isDeleting}
                            className="text-destructive hover:text-destructive"
                        >
                            {isDeleting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Trash2 className="w-4 h-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                disabled={disabled || isUploading}
            />
            <div
                className={cn(
                    "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                    dragActive && "border-primary bg-primary/5",
                    !dragActive && "border-border hover:border-primary/50",
                    (disabled || isUploading) && "opacity-50 cursor-not-allowed"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={handleClick}
            >
                {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-sm text-muted-foreground">Enviando arquivo...</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <Upload className="w-8 h-8 text-muted-foreground" />
                        <p className="text-sm font-medium">
                            Clique para selecionar ou arraste um arquivo
                        </p>
                        <p className="text-xs text-muted-foreground">
                            PDF, DOCX, DOC, TXT, PNG ou JPG (máx. 10MB)
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
