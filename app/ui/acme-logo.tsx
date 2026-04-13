import { WrenchScrewdriverIcon } from "@heroicons/react/24/outline";
import { lusitana } from "@/app/ui/fonts";

export default function AcmeLogo() {
  return (
    <div
      className={`${lusitana.className} flex flex-row items-center gap-2 leading-none text-white`}
    >
      <WrenchScrewdriverIcon className="h-7 w-7 md:h-9 md:w-9" />
      <p className="text-2xl tracking-widest md:text-3xl">工具台</p>
    </div>
  );
}
