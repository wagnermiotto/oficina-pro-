"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/shared/lib/auth-client";
import { cadastroSchema, type CadastroInput } from "../schemas/auth-schemas";
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

export function CadastroForm() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);

  const form = useForm<CadastroInput>({
    resolver: zodResolver(cadastroSchema),
    defaultValues: { nome: "", email: "", senha: "", confirmarSenha: "" },
  });

  async function onSubmit(dados: CadastroInput) {
    setCarregando(true);
    const { error } = await authClient.signUp.email({
      name: dados.nome,
      email: dados.email,
      password: dados.senha,
    });
    if (error) {
      setCarregando(false);
      toast.error(
        error.status === 422
          ? "Este e-mail já está cadastrado."
          : (error.message ?? "Não foi possível criar a conta.")
      );
      return;
    }
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar conta</CardTitle>
        <CardDescription>
          Comece grátis — configure sua oficina em minutos.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seu nome</FormLabel>
                  <FormControl>
                    <Input placeholder="João da Silva" autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="voce@oficina.com.br"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="senha"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Mínimo 8 caracteres"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmarSenha"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar senha</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="mt-6 flex-col gap-3">
            <Button type="submit" className="w-full" disabled={carregando}>
              {carregando && <Loader2 className="size-4 animate-spin" />}
              Criar conta
            </Button>
            <p className="text-sm text-muted-foreground">
              Já tem conta?{" "}
              <Link href="/login" className="font-medium text-destaque hover:underline">
                Entrar
              </Link>
            </p>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
