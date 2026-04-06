'use client';

import { lusitana } from "@/app/ui/fonts";
import {
  UserIcon,
  AtSymbolIcon,
  KeyIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { ArrowRightIcon } from "@heroicons/react/20/solid";
import { Button } from "./button";
import { useActionState } from "react";
import { registerUser, type RegisterState } from "@/app/lib/actions";
import Link from "next/link";

export default function RegisterForm() {
  const initialState: RegisterState = { errors: {}, message: null };
  const [state, formAction, isPending] = useActionState(
    registerUser,
    initialState
  );

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex-1 rounded-lg bg-gray-50 px-6 pb-4 pt-8">
        <h1 className={`${lusitana.className} mb-3 text-2xl`}>
          创建新账号
        </h1>
        <div className="w-full">
          {/* Name */}
          <div>
            <label
              className="mb-3 mt-5 block text-xs font-medium text-gray-900"
              htmlFor="name"
            >
              姓名
            </label>
            <div className="relative">
              <input
                className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
                id="name"
                type="text"
                name="name"
                placeholder="请输入您的姓名"
                required
                minLength={2}
              />
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
            {state.errors?.name && (
              <div className="mt-1 flex flex-col gap-1">
                {state.errors.name.map((err) => (
                  <p key={err} className="flex items-center gap-1 text-xs text-red-500">
                    <ExclamationCircleIcon className="h-4 w-4" />
                    {err}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Email */}
          <div className="mt-4">
            <label
              className="mb-3 mt-5 block text-xs font-medium text-gray-900"
              htmlFor="email"
            >
              邮箱
            </label>
            <div className="relative">
              <input
                className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
                id="email"
                type="email"
                name="email"
                placeholder="请输入邮箱地址"
                required
              />
              <AtSymbolIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
            {state.errors?.email && (
              <div className="mt-1 flex flex-col gap-1">
                {state.errors.email.map((err) => (
                  <p key={err} className="flex items-center gap-1 text-xs text-red-500">
                    <ExclamationCircleIcon className="h-4 w-4" />
                    {err}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Password */}
          <div className="mt-4">
            <label
              className="mb-3 mt-5 block text-xs font-medium text-gray-900"
              htmlFor="password"
            >
              密码
            </label>
            <div className="relative">
              <input
                className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
                id="password"
                type="password"
                name="password"
                placeholder="请输入密码（至少6位）"
                required
                minLength={6}
              />
              <KeyIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
            {state.errors?.password && (
              <div className="mt-1 flex flex-col gap-1">
                {state.errors.password.map((err) => (
                  <p key={err} className="flex items-center gap-1 text-xs text-red-500">
                    <ExclamationCircleIcon className="h-4 w-4" />
                    {err}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="mt-4">
            <label
              className="mb-3 mt-5 block text-xs font-medium text-gray-900"
              htmlFor="confirmPassword"
            >
              确认密码
            </label>
            <div className="relative">
              <input
                className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                placeholder="请再次输入密码"
                required
                minLength={6}
              />
              <KeyIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
            {state.errors?.confirmPassword && (
              <div className="mt-1 flex flex-col gap-1">
                {state.errors.confirmPassword.map((err) => (
                  <p key={err} className="flex items-center gap-1 text-xs text-red-500">
                    <ExclamationCircleIcon className="h-4 w-4" />
                    {err}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        <Button className="mt-4 w-full" aria-disabled={isPending}>
          注册 <ArrowRightIcon className="ml-auto h-5 w-5 text-gray-50" />
        </Button>

        <div className="flex h-8 items-end space-x-1">
          {state.message && !state.errors?.name && !state.errors?.email && !state.errors?.password && !state.errors?.confirmPassword && (
            <>
              <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
              <p className="text-sm text-red-500">{state.message}</p>
            </>
          )}
        </div>

        <p className="mt-2 text-center text-sm text-gray-600">
          已有账号？{" "}
          <Link href="/login" className="font-medium text-blue-500 hover:text-blue-400">
            去登录
          </Link>
        </p>
      </div>
    </form>
  );
}
