import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../contexts/AuthContext";
import FormField from "../components/ui/FormField";

const schema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre (mínimo 2 caracteres)."),
  email: z.string().email("Introduce un correo electrónico válido."),
  password: z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .regex(/\p{L}/u, "Debe contener al menos una letra")
  .regex(/[0-9]/, "Debe contener al menos un número")
  .regex(/[\p{P}\p{S}]/u, "Debe contener al menos un símbolo"),
  confirmPassword: z.string(),
}).refine((values) => values.password === values.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});
type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register: createAccount } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ name, email, password }: FormValues) => {
    setServerError("");
    setSubmitting(true);
    try {
      await createAccount({ name, email, password });
      navigate("/app");
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "No se pudo crear la cuenta.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-card auth-card-register">
      <div className="auth-heading"><span className="auth-kicker">EMPIEZA A ORGANIZARTE</span><h2>Crea tu cuenta</h2><p>Un espacio para consultar tus documentos de forma más sencilla.</p></div>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField label="Nombre completo" placeholder="Tu nombre" autoComplete="name" leadingIcon={<UserRound size={18} />} error={errors.name?.message} {...register("name")} />
        <FormField label="Correo electrónico" type="email" placeholder="nombre@correo.com" autoComplete="email" leadingIcon={<Mail size={18} />} error={errors.email?.message} {...register("email")} />
        <div className="password-field">
          <FormField label="Contraseña" type={showPassword ? "text" : "password"} placeholder="Introduce una contraseña segura" autoComplete="new-password" leadingIcon={<LockKeyhole size={18} />} error={errors.password?.message} {...register("password")} />
          <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
        </div>
        <FormField label="Confirmar contraseña" type="password" placeholder="Repite tu contraseña" autoComplete="new-password" leadingIcon={<LockKeyhole size={18} />} error={errors.confirmPassword?.message} {...register("confirmPassword")} />
        {serverError && <p className="form-alert" role="alert">{serverError}</p>}
        <button className="button button-primary button-full" type="submit" disabled={submitting}>{submitting ? "Creando cuenta..." : "Crear cuenta"} <ArrowRight size={17} /></button>
      </form>
      <p className="auth-switch">¿Ya tienes una cuenta? <Link to="/login">Inicia sesión</Link></p>
    </div>
  );
}
