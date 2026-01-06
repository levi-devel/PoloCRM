import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface PhaseStats {
    aFazer: number;
    emAndamento: number;
    pendencia: number;
    concluido: number;
}

interface TechnicianData {
    technicianId: string | null;
    name: string;
    cardCount: number;
    percentage: number;
    byPhase: PhaseStats;
}

interface TechnicianRankingProps {
    data: TechnicianData[];
}

export function TechnicianRanking({ data }: TechnicianRankingProps) {
    if (!data || data.length === 0) {
        return (
            <Card className="shadow-sm border-border/60">
                <CardHeader>
                    <CardTitle>Ranking (carga)</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Quem está com mais cards no período
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        Nenhum card encontrado no período
                    </div>
                </CardContent>
            </Card>
        );
    }

    const topTechnician = data[0];
    const hasImbalance = data.length > 1 && topTechnician.cardCount > data[data.length - 1].cardCount * 1.5;

    return (
        <Card className="shadow-sm border-border/60">
            <CardHeader>
                <CardTitle>Ranking (carga)</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                    Quem está com mais cards no período
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Ranking List */}
                <div className="space-y-4">
                    {data.slice(0, 5).map((tech, index) => (
                        <div key={tech.name} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-foreground flex items-center gap-2">
                                    <span className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                    ${index === 0 ? 'bg-blue-500 text-white' :
                                            index === 1 ? 'bg-blue-400 text-white' :
                                                index === 2 ? 'bg-blue-300 text-white' :
                                                    'bg-muted text-muted-foreground'}
                  `}>
                                        {index + 1}
                                    </span>
                                    {tech.name}
                                </span>
                                <span className="font-bold text-foreground">{tech.cardCount}</span>
                            </div>

                            {/* Phase Breakdown Badges */}
                            <div className="flex flex-wrap gap-2 ml-8 text-xs">
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                    <span className="font-medium">A Fazer:</span>
                                    <span className="font-bold">{tech.byPhase.aFazer}</span>
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                    <span className="font-medium">Em Andamento:</span>
                                    <span className="font-bold">{tech.byPhase.emAndamento}</span>
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                                    <span className="font-medium">Pendência:</span>
                                    <span className="font-bold">{tech.byPhase.pendencia}</span>
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                    <span className="font-medium">Concluído:</span>
                                    <span className="font-bold">{tech.byPhase.concluido}</span>
                                </span>
                            </div>

                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                    style={{ width: `${tech.percentage}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Suggestion Section */}
                {hasImbalance && (
                    <div className="mt-6 pt-4 border-t border-border">
                        <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
                            <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-orange-900 dark:text-orange-200">
                                    Sugestão
                                </p>
                                <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                                    Use este ranking para identificar desequilíbrio de carga e redistribuir cards entre técnicos.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
