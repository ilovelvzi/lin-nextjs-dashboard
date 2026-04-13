import RegisterForm from "@/app/ui/register-form";
import { WrenchScrewdriverIcon } from "@heroicons/react/24/outline";
import { lusitana } from "@/app/ui/fonts";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo 区 */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="rounded-2xl bg-blue-600 p-3">
            <WrenchScrewdriverIcon className="h-8 w-8 text-white" />
          </div>
          <h1
            className={`${lusitana.className} text-2xl font-bold text-gray-900`}
          >
            工具台
          </h1>
          <p className="text-sm text-gray-500">创建账号以开始使用</p>
        </div>

        <RegisterForm />
      </div>
    </main>
  );
}
