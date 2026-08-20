import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function DashboardNotFound() { return <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center"><h1 className="text-lg font-semibold">Проект не найден</h1><p className="mt-2 text-sm text-muted-foreground">Возможно, он удалён или у вас нет к нему доступа.</p><Link href="/dashboard" className={`${buttonVariants()} mt-5`}>Вернуться к проектам</Link></div>; }
