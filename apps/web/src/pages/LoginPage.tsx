import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../contexts/AuthContext";
import FormField from "../components/ui/FormField";

const schema = z.object({
  email: z.string().email("Introduce un correo electrónico válido."),
  password: z.string().min(1, "Introduce tu contraseña."),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError("");
    setSubmitting(true);
    try {
      await login(values);
      navigate("/app");
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "No se pudo iniciar sesión.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-heading"><span className="auth-kicker">¡QUÉ BUENO TENERTE DE VUELTA!</span><h2>Inicia sesión</h2><p>Accede a tus documentos y continúa donde lo dejaste.</p></div>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField label="Correo electrónico" type="email" placeholder="nombre@correo.com" autoComplete="email" leadingIcon={<Mail size={18} />} error={errors.email?.message} {...register("email")} />
        <div className="password-field">
          <FormField label="Contraseña" type={showPassword ? "text" : "password"} placeholder="Tu contraseña" autoComplete="current-password" leadingIcon={<LockKeyhole size={18} />} error={errors.password?.message} {...register("password")} />
          <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
        </div>
        {/* <div className="form-options"><span /> <Link to="/recuperar-contrasena">¿Olvidaste tu contraseña?</Link></div> */}
        {serverError && <p className="form-alert" role="alert">{serverError}</p>}
        <button className="button button-primary button-full" type="submit" disabled={submitting}>{submitting ? "Entrando..." : "Iniciar sesión"} <ArrowRight size={17} /></button>
      </form>
      <p className="auth-switch">¿Todavía no tienes cuenta? <Link to="/registro">Regístrate</Link></p>
    </div>
  );
}
