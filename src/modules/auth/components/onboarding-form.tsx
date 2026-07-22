"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { concluirOnboarding } from "../actions/onboarding-actions";
import {
  onboardingSchema,
  type OnboardingInput,
} from "../schemas/auth-schemas";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export function OnboardingForm({ nomeUsuario }: { nomeUsuario: string }) {
  const [carregando, setCarregando] = useState(false);

  const form = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { nomeOficina: "", telefone: "", cidade: "", estado: "" },
  });

  async function onSubmit(dados: OnboardingInput) {
    setCarregando(true);
    const resultado = await concluirOnboarding(dados);
    // Em caso de sucesso a action redireciona; só chega aqui com erro.
    if (resultado?.erro) {
      setCarregando(false);
      toast.error(resultado.erro);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bem-vindo, {nomeUsuario.split(" ")[0]}!</CardTitle>
        <CardDescription>
          Conte-nos sobre a sua oficina para montarmos o seu painel.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="nomeOficina"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da oficina</FormLabel>
                  <FormControl>
                    <Input placeholder="Auto Center Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="telefone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="(11) 99999-9999" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-[1fr_5rem] gap-3">
              <FormField
                control={form.control}
                name="cidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="São Paulo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>UF</FormLabel>
                    <FormControl>
                      <Input placeholder="SP" maxLength={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
          <CardFooter className="mt-6">
            <Button type="submit" className="w-full" disabled={carregando}>
              {carregando && <Loader2 className="size-4 animate-spin" />}
              Criar minha oficina
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
