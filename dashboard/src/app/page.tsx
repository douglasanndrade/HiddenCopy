import { FlaskConical, Music, Merge, Zap } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="p-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">
          Bem-vindo ao <span className="text-accent">HiddenCopy</span>
        </h1>
        <p className="text-muted text-lg">
          Melhore e mescle os áudios dos seus criativos em segundos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        <StatCard
          icon={<Zap size={24} />}
          title="Créditos Disponíveis"
          value="5"
          subtitle="de 5 créditos"
        />
        <StatCard
          icon={<Music size={24} />}
          title="Áudios Melhorados"
          value="0"
          subtitle="este mês"
        />
        <StatCard
          icon={<Merge size={24} />}
          title="Áudios Mesclados"
          value="0"
          subtitle="este mês"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/laboratorio?modo=melhorar">
          <div className="bg-card border border-border rounded-xl p-6 hover:border-accent transition-all cursor-pointer group">
            <div className="w-12 h-12 bg-accent-soft rounded-lg flex items-center justify-center mb-4 group-hover:bg-accent/25 transition-all">
              <Music size={24} className="text-accent" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Melhorar Áudio</h3>
            <p className="text-muted text-sm">
              Envie um MP4 e receba com áudio normalizado, equalizado e sem
              ruído. Ideal para criativos com áudio fraco ou com barulho.
            </p>
          </div>
        </Link>

        <Link href="/laboratorio?modo=mesclar">
          <div className="bg-card border border-border rounded-xl p-6 hover:border-accent transition-all cursor-pointer group">
            <div className="w-12 h-12 bg-accent-soft rounded-lg flex items-center justify-center mb-4 group-hover:bg-accent/25 transition-all">
              <Merge size={24} className="text-accent" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Mesclar com Música</h3>
            <p className="text-muted text-sm">
              Envie um MP4 + um MP3 e receba o vídeo com a música de fundo
              mesclada. Ducking automático quando tem voz.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-accent">{icon}</div>
        <span className="text-sm text-muted">{title}</span>
      </div>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-xs text-muted mt-1">{subtitle}</p>
    </div>
  );
}
