import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authService } from "../services/authService";
import FormField from "../components/ui/FormField";

const schema = z.object({ email: z.string().email("Introduce un correo electrónico válido.") });
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email }: FormValues) => {
    setSubmitting(true);
    setServerError("");
    try {
      await authService.requestPasswordReset(email);
      setSent(true);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "No se pudo enviar la solicitud.");
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return <div className="auth-card success-card"><div className="success-icon"><CheckCircle2 size={27} /></div><span className="auth-kicker">SOLICITUD REGISTRADA</span><h2>Revisa tu correo</h2><p>Si la dirección está asociada a una cuenta, recibirás instrucciones para restablecer tu contraseña.</p><Link to="/login" className="button button-primary button-full">Volver al inicio de sesión</Link></div>;
  }

  return (
    <div className="auth-card">
      <Link to="/login" className="back-link"><ArrowLeft size={16} /> Volver al inicio de sesión</Link>
      <div className="auth-heading"><span className="auth-kicker">RECUPERACIÓN DE ACCESO</span><h2>¿Olvidaste tu contraseña?</h2><p>Escribe el correo de tu cuenta y te indicaremos cómo recuperar el acceso.</p></div>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField label="Correo electrónico" type="email" placeholder="nombre@correo.com" autoComplete="email" leadingIcon={<Mail size={18} />} error={errors.email?.message} {...register("email")} />
        {serverError && <p className="form-alert" role="alert">{serverError}</p>}
        <button className="button button-primary button-full" type="submit" disabled={submitting}>{submitting ? "Enviando..." : "Enviar instrucciones"} </button>
      </form>
    </div>
  );
}
