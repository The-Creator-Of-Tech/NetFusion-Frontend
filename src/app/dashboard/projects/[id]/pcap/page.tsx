import PcapPanel from "@/components/PcapPanel";

interface Props {
  params: { id: string };
}

export default function PcapPage({ params }: Props) {
  return (
    <div>
      <PcapPanel projectId={params.id} />
    </div>
  );
}
