import * as React from "react";
import { X, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}

interface MultiUserSelectProps {
    users: User[];
    selectedUserIds: string[];
    onChange: (userIds: string[]) => void;
    placeholder?: string;
}

export function MultiUserSelect({
    users,
    selectedUserIds,
    onChange,
    placeholder = "Selecione usuários...",
}: MultiUserSelectProps) {
    const [open, setOpen] = React.useState(false);

    const selectedUsers = users.filter((user) =>
        selectedUserIds.includes(user.id)
    );

    const handleToggleUser = (userId: string) => {
        if (selectedUserIds.includes(userId)) {
            onChange(selectedUserIds.filter((id) => id !== userId));
        } else {
            onChange([...selectedUserIds, userId]);
        }
    };

    const handleRemoveUser = (userId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(selectedUserIds.filter((id) => id !== userId));
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between min-h-[42px] h-auto"
                >
                    <div className="flex flex-wrap gap-1 flex-1">
                        {selectedUsers.length === 0 ? (
                            <span className="text-muted-foreground">{placeholder}</span>
                        ) : (
                            selectedUsers.map((user) => (
                                <span
                                    key={user.id}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                                >
                                    {user.firstName} {user.lastName}
                                    <button
                                        type="button"
                                        className="ml-1 rounded-full hover:bg-primary/20 p-0.5"
                                        onClick={(e) => handleRemoveUser(user.id, e)}
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            ))
                        )}
                    </div>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
                <div className="max-h-[300px] overflow-y-auto">
                    {users.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                            Nenhum usuário disponível
                        </div>
                    ) : (
                        <div className="p-1">
                            {users.map((user) => {
                                const isSelected = selectedUserIds.includes(user.id);
                                return (
                                    <button
                                        key={user.id}
                                        type="button"
                                        className={cn(
                                            "w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm hover:bg-muted transition-colors",
                                            isSelected && "bg-muted"
                                        )}
                                        onClick={() => handleToggleUser(user.id)}
                                    >
                                        <div
                                            className={cn(
                                                "h-4 w-4 rounded border flex items-center justify-center",
                                                isSelected
                                                    ? "bg-primary border-primary text-primary-foreground"
                                                    : "border-muted-foreground"
                                            )}
                                        >
                                            {isSelected && <Check className="h-3 w-3" />}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className="font-medium">
                                                {user.firstName} {user.lastName}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {user.email}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
