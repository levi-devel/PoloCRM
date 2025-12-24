import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [currentImage, setCurrentImage] = useState(0);
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const carouselImages = [
        "/Imagem1.png",
        "/Imagem2.png",
        "/Imagem3.png"
    ];

    // Auto-rotate carousel every 4 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentImage((prev) => (prev + 1) % carouselImages.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
                credentials: "include",
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Login failed");
            }

            toast({
                title: "Login bem-sucedido",
                description: `Bem-vindo, ${data.user.firstName}!`,
            });

            // Invalidate and refetch the user data to ensure the session is up-to-date
            await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
            await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });

            // Redirect to home page after user data is refreshed
            setLocation("/");
        } catch (error: any) {
            toast({
                title: "Erro no login",
                description: error.message || "Credenciais inválidas",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 p-4">
            <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-8 items-center">
                {/* Carousel Section - Left Side */}
                <div className="w-full lg:w-1/2 relative">
                    <div className="relative w-full h-[600px] rounded-2xl overflow-hidden shadow-2xl bg-gray-50">
                        {carouselImages.map((image, index) => (
                            <div
                                key={index}
                                className={`absolute inset-0 transition-opacity duration-1000 ${index === currentImage ? "opacity-100" : "opacity-0"
                                    }`}
                            >
                                <img
                                    src={image}
                                    alt={`Slide ${index + 1}`}
                                    className="w-full h-full object-contain"
                                />
                            </div>
                        ))}

                        {/* Carousel Indicators */}
                        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2">
                            {carouselImages.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentImage(index)}
                                    className={`w-3 h-3 rounded-full transition-all duration-300 ${index === currentImage
                                        ? "bg-red-600 w-8"
                                        : "bg-white/50 hover:bg-white/75"
                                        }`}
                                    aria-label={`Go to slide ${index + 1}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Login Form Section - Right Side */}
                <Card className="w-full lg:w-1/2 max-w-md h-[600px] shadow-2xl border-gray-200 flex flex-col justify-center">
                    <CardHeader className="space-y-4">
                        <div className="flex justify-center mb-2">
                            <img
                                src="/LOGO PADRÃO POLO.png"
                                alt="Polo Logo"
                                className="h-20 w-auto object-contain"
                            />
                        </div>
                        <CardTitle className="text-3xl text-center" style={{ fontFamily: 'Bitsumis, sans-serif', letterSpacing: '0.05em' }}>
                            <span style={{ color: '#6B7280' }}>Polo</span>{' '}
                            <span style={{ color: '#DC2626' }}>CRM</span>
                        </CardTitle>
                        <CardDescription className="text-center text-gray-600">
                            Entre com suas credenciais para acessar o sistema
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-gray-700">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="seu.email@polotelecom.com.br"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    className="h-11 border-gray-300 focus:border-red-500 focus:ring-red-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-gray-700">Senha</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Digite sua senha"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    className="h-11 border-gray-300 focus:border-red-500 focus:ring-red-500"
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors duration-200"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Entrando...
                                    </>
                                ) : (
                                    "Entrar"
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
