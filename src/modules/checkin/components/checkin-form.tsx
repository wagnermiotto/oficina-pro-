"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  checkInSchema,
  NIVEL_COMBUSTIVEL_LABEL,
  TIPO_AVARIA_LABEL,
  type CheckInFormValues,
  type CheckInInput,
} from "../schemas/checkin-schemas";
import { criarCheckInAction } from "../actions/checkin-actions";
import { AssinaturaPad } from "@/shared/components/assinatura-pad";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const ITENS_PRESENCA = [
  { nome: "chaveReserva", rotulo: "Chave reserva" },
  { nome: "estepe", rotulo: "Estepe" },
  { nome: "macaco", rotulo: "Macaco" },
  { nome: "triangulo", rotulo: "Triângulo" },
] as const;

export function CheckInForm({ veiculoId }: { veiculoId: string }) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const [fotos, setFotos] = useState<File[]>([]);
  const assinaturaRef = useRef<string | null>(null);
  const inputFotosRef = useRef<HTMLInputElement>(null);

  const form = useForm<CheckInFormValues, unknown, CheckInInput>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      quilometragem: "",
      nivelCombustivel: "",
      chaveReserva: false,
      estepe: false,
      macaco: false,
      triangulo: false,
      objetosDeixados: "",
      observacoes: "",
      avarias: [],
      assinatura: "",
    },
  });

  const avarias = useFieldArray({ control: form.control, name: "avarias" });

  function adicionarFotos(lista: FileList | null) {
    if (!lista) return;
    const novas = Array.from(lista).filter((f) => f.size > 0);
    setFotos((atuais) => [...atuais, ...novas].slice(0, 12));
  }

  async function onSubmit(valores: CheckInInput) {
    setSalvando(true);
    const formData = new FormData();
    formData.set(
      "dados",
      JSON.stringify({ ...valores, assinatura: assinaturaRef.current ?? "" })
    );
    for (const foto of fotos) formData.append("fotos", foto);

    const resultado = await criarCheckInAction(veiculoId, formData);
    setSalvando(false);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success("Check-in registrado com sucesso.");
    router.push(`/veiculos/${veiculoId}`);
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Condições de entrada</CardTitle>
            <CardDescription>
              Registre o estado do veículo no momento da recepção.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="quilometragem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quilometragem</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="68000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nivelCombustivel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nível de combustível</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecionar..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(NIVEL_COMBUSTIVEL_LABEL).map(([v, label]) => (
                          <SelectItem key={v} value={v}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Itens presentes no veículo</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {ITENS_PRESENCA.map((item) => (
                  <FormField
                    key={item.nome}
                    control={form.control}
                    name={item.nome}
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 rounded-lg border p-3">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0 text-sm font-normal">
                          {item.rotulo}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="objetosDeixados"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Objetos deixados no veículo</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex.: óculos no porta-luvas, cadeirinha infantil..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações gerais</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Avarias identificadas</CardTitle>
              <CardDescription>
                Riscos, amassados e danos pré-existentes.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                avarias.append({ local: "", tipo: "RISCO", descricao: "" })
              }
            >
              <Plus className="size-4" /> Adicionar
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {avarias.fields.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhuma avaria registrada.
              </p>
            ) : (
              avarias.fields.map((campo, indice) => (
                <div
                  key={campo.id}
                  className="grid grid-cols-[1fr_10rem_1fr_auto] items-end gap-3"
                >
                  <FormField
                    control={form.control}
                    name={`avarias.${indice}.local`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Local</FormLabel>
                        <FormControl>
                          <Input placeholder="Porta dianteira esquerda" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`avarias.${indice}.tipo`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(TIPO_AVARIA_LABEL).map(([v, label]) => (
                              <SelectItem key={v} value={v}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`avarias.${indice}.descricao`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Input placeholder="Detalhes (opcional)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => avarias.remove(indice)}
                    aria-label="Remover avaria"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fotos do veículo</CardTitle>
            <CardDescription>
              Fotografe externa e internamente (até 12 arquivos, 10 MB cada).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              ref={inputFotosRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => adicionarFotos(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => inputFotosRef.current?.click()}
            >
              <Camera className="size-4" /> Selecionar fotos/vídeos
            </Button>
            {fotos.length > 0 ? (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {fotos.map((foto, indice) => (
                  <li
                    key={`${foto.name}-${indice}`}
                    className="flex items-center justify-between gap-2 rounded-lg border p-2 text-xs"
                  >
                    <span className="truncate">{foto.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFotos((atuais) => atuais.filter((_, i) => i !== indice))
                      }
                      aria-label={`Remover ${foto.name}`}
                    >
                      <X className="size-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assinatura do cliente</CardTitle>
            <CardDescription>
              O cliente confirma as condições registradas do veículo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AssinaturaPad
              onChange={(dataUrl) => {
                assinaturaRef.current = dataUrl;
              }}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={salvando}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando}>
            {salvando && <Loader2 className="size-4 animate-spin" />}
            Registrar check-in
          </Button>
        </div>
      </form>
    </Form>
  );
}
