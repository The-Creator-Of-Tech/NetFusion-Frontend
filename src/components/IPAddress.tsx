type Props = {
  ip: string;
  onClick: (ip: string) => void;
};

export default function IPAddress({ ip, onClick }: Props) {
  return (
    <button
      onClick={() => onClick(ip)}
      className="text-primary hover:underline font-mono"
    >
      {ip}
    </button>
  );
}
