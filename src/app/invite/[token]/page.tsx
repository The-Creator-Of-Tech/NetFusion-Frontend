import AcceptInvitePage from "@/components/invite/AcceptInvitePage";

interface Props {
  params: { token: string };
}

export default function InvitePage({ params }: Props) {
  return <AcceptInvitePage token={params.token} />;
}
