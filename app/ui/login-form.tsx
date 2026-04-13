"use client";

import {
  AtSymbolIcon,
  KeyIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { ArrowRightIcon } from "@heroicons/react/20/solid";
import { Button } from "./button";
import { useActionState } from "react";
import { authenticate } from "@/app/lib/actions";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
        <div className="space-y-4">
          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-gray-700"
              htmlFor="email"
            >
              邮箱
            </label>
            <div className="relative">
              <input
                className="peer block w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none"
                id="email"
                type="email"
                name="email"
                placeholder="输入邮箱地址"
                required
              />
              <AtSymbolIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 peer-focus:text-blue-500" />
            </div>
          </div>

          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-gray-700"
              htmlFor="password"
            >
              密码
            </label>
            <div className="relative">
              <input
                className="peer block w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none"
                id="password"
                type="password"
                name="password"
                placeholder="输入密码"
                required
                minLength={6}
              />
              <KeyIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 peer-focus:text-blue-500" />
            </div>
          </div>
        </div>

        <input type="hidden" name="redirectTo" value={callbackUrl} />

        <Button className="mt-6 w-full" aria-disabled={isPending}>
          登录 <ArrowRightIcon className="ml-auto h-4 w-4" />
        </Button>

        {errorMessage && (
          <div className="mt-3 flex items-center gap-1.5 text-sm text-red-500">
            <ExclamationCircleIcon className="h-4 w-4 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        <p className="mt-4 text-center text-sm text-gray-500">
          还没有账号？{" "}
          <Link
            href="/register"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            去注册
          </Link>
        </p>
      </div>
    </form>
  );
}
