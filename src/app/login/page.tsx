'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { loginSchema, type LoginInput } from '@/lib/auth/login-schema';
import { useSession } from '@/lib/auth/session';

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
    <main className="flex min-h-screen items-center justify-center bg-sand p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image src="/logo.png" alt="" width={72} height={72} priority className="rounded-full" />
          <h1 className="mt-4 font-display text-2xl font-semibold text-ink">Registro de Horas</h1>
          <p className="mt-1 text-sm text-slate">Ingresá para reportar o aprobar horas</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-4 rounded-xl border border-line bg-surface p-6 shadow-sm"
        >
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-ink">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              className="w-full rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
              {...register('email')}
            />
            {errors.email && <p className="text-sm text-danger">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-ink">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
              {...register('password')}
            />
            {errors.password && <p className="text-sm text-danger">{errors.password.message}</p>}
          </div>

          {errorMsg && (
            <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{errorMsg}</p>
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
    </main>
  );
}
