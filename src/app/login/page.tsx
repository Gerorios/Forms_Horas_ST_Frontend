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
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="w-full max-w-sm space-y-4 rounded-lg border border-neutral/30 p-6"
      >
        <div className="flex justify-center">
          <Image src="/logo.png" alt="Logo" width={96} height={96} priority />
        </div>
        <h1 className="text-center text-xl font-semibold text-neutral">Registro de Horas</h1>

        <div className="space-y-1">
          <label htmlFor="email" className="block text-sm text-neutral">Email</label>
          <input
            id="email"
            type="email"
            className="w-full rounded border border-neutral/40 px-3 py-2"
            {...register('email')}
          />
          {errors.email && <p className="text-sm text-alert">{errors.email.message}</p>}
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="block text-sm text-neutral">Contraseña</label>
          <input
            id="password"
            type="password"
            className="w-full rounded border border-neutral/40 px-3 py-2"
            {...register('password')}
          />
          {errors.password && <p className="text-sm text-alert">{errors.password.message}</p>}
        </div>

        {errorMsg && <p className="text-sm text-alert">{errorMsg}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-brand py-2 font-medium text-white disabled:opacity-60"
        >
          {isSubmitting ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </main>
  );
}
