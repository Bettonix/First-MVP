import { PDVContainer } from "@/components/PDVContainer";
import { getEstadoTurno } from "@/app/actions/turnos";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { isAberto } = await getEstadoTurno();

  return (
    <main className="min-h-screen bg-neutral-100">
      <PDVContainer isTurnoAberto={isAberto} />
    </main>
  );
}
