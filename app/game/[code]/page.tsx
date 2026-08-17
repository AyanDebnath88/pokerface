import { GameRoom } from "@/components/game/GameRoom";

export default async function GamePage({
  params,
}: PageProps<"/game/[code]">) {
  const { code } = await params;
  return <GameRoom code={code.toUpperCase()} />;
}
