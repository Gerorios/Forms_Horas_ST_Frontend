'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { loginSchema, type LoginInput } from '@/lib/auth/login-schema';
import { useSession } from '@/lib/auth/session';
import { FondoFoto } from '@/components/layout/fondo-foto';
import { FOTOS } from '@/lib/fotos';

const CLASE_INPUT =
  'w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useSession();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    setErrorMsg(null);
    try {
      await signIn(values.email, values.password);
      router.push('/');
    } catch {
      setErrorMsg('Credenciales inválidas');
    }
  }

  return (
    <main>
      <FondoFoto
        src={FOTOS.login}
        prioridad={false}
        className="flex min-h-screen items-center justify-center p-4"
      >
        {/* `w-96 max-w-full` (24rem = max-w-sm) porque el contenedor de FondoFoto
            es un ítem flex que si no se encoge al ancho del contenido. */}
        <div className="w-96 max-w-full">
          <div className="mb-6 flex flex-col items-center text-center">
            <Image src="/logo.png" alt="" width={72} height={72} priority className="rounded-full" />
            <h1 className="mt-4 font-display text-2xl font-semibold text-white">Central Sertec</h1>
            <p className="mt-1 text-sm text-white/70">Sistema interno de Sertec</p>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="w-full max-w-sm space-y-4 rounded-2xl border border-white/10 bg-graphite/90 p-6 shadow-lg backdrop-blur"
          >
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-white/80">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                className={CLASE_INPUT}
                {...register('email')}
              />
              {errors.email && <p className="text-sm text-red-300">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-white/80">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className={CLASE_INPUT}
                {...register('password')}
              />
              {errors.password && <p className="text-sm text-red-300">{errors.password.message}</p>}
            </div>

            {errorMsg && (
              <p className="rounded-md bg-danger/20 px-3 py-2 text-sm text-red-200">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-brand py-2.5 font-medium text-ink transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-60"
            >
              {isSubmitting ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
        </div>
      </FondoFoto>
    </main>
  );
}
