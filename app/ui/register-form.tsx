"use client";

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

const inputClass =
  "peer block w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none";

const iconClass =
  "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 peer-focus:text-blue-500";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <div className="mt-1.5 flex flex-col gap-1">
      {errors.map((err) => (
        <p key={err} className="flex items-center gap-1 text-xs text-red-500">
          <ExclamationCircleIcon className="h-3.5 w-3.5 shrink-0" />
          {err}
        </p>
      ))}
    </div>
  );
}

export default function RegisterForm() {
  const initialState: RegisterState = { errors: {}, message: null };
  const [state, formAction, isPending] = useActionState(
    registerUser,
    initialState,
  );

  const hasGlobalError =
    state.message &&
    !state.errors?.name &&
    !state.errors?.email &&
    !state.errors?.password &&
    !state.errors?.confirmPassword;

  return (
    <form action={formAction}>
      <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100 space-y-4">
        {/* 姓名 */}
        <div>
          <label
            className="mb-1.5 block text-sm font-medium text-gray-700"
            htmlFor="name"
          >
            姓名
          </label>
          <div className="relative">
            <input
              className={inputClass}
              id="name"
              type="text"
              name="name"
              placeholder="输入姓名"
              required
              minLength={2}
            />
            <UserIcon className={iconClass} />
          </div>
          <FieldError errors={state.errors?.name} />
        </div>

        {/* 邮箱 */}
        <div>
          <label
            className="mb-1.5 block text-sm font-medium text-gray-700"
            htmlFor="email"
          >
            邮箱
          </label>
          <div className="relative">
            <input
              className={inputClass}
              id="email"
              type="email"
              name="email"
              placeholder="输入邮箱地址"
              required
            />
            <AtSymbolIcon className={iconClass} />
          </div>
          <FieldError errors={state.errors?.email} />
        </div>

        {/* 密码 */}
        <div>
          <label
            className="mb-1.5 block text-sm font-medium text-gray-700"
            htmlFor="password"
          >
            密码
          </label>
          <div className="relative">
            <input
              className={inputClass}
              id="password"
              type="password"
              name="password"
              placeholder="至少 6 位"
              required
              minLength={6}
            />
            <KeyIcon className={iconClass} />
          </div>
          <FieldError errors={state.errors?.password} />
        </div>

        {/* 确认密码 */}
        <div>
          <label
            className="mb-1.5 block text-sm font-medium text-gray-700"
            htmlFor="confirmPassword"
          >
            确认密码
          </label>
          <div className="relative">
            <input
              className={inputClass}
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              placeholder="再次输入密码"
              required
              minLength={6}
            />
            <KeyIcon className={iconClass} />
          </div>
          <FieldError errors={state.errors?.confirmPassword} />
        </div>

        <Button className="mt-2 w-full" aria-disabled={isPending}>
          注册 <ArrowRightIcon className="ml-auto h-4 w-4" />
        </Button>

        {hasGlobalError && (
          <div className="flex items-center gap-1.5 text-sm text-red-500">
            <ExclamationCircleIcon className="h-4 w-4 shrink-0" />
            <p>{state.message}</p>
          </div>
        )}

        <p className="text-center text-sm text-gray-500">
          已有账号？{" "}
          <Link
            href="/login"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            去登录
          </Link>
        </p>
      </div>
    </form>
  );
}
