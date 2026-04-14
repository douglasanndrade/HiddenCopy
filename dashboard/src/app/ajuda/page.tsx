"use client";

import {
  HelpCircle,
  MessageCircle,
  Instagram,
  Zap,
  Upload,
  Music,
  CreditCard,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

const faqs = [
  {
    pergunta: "Como funciona o processamento?",
    resposta:
      "Envie seu vídeo MP4 no Laboratório e nosso sistema irá camuflar o áudio automaticamente. Você pode melhorar o áudio ou mesclar com uma música de fundo.",
  },
  {
    pergunta: "Quanto custa cada processamento?",
    resposta:
      "Cada processamento consome 1 crédito. Você pode adquirir créditos na página de Créditos com pagamento via Pix.",
  },
  {
    pergunta: "Os arquivos ficam salvos?",
    resposta:
      "Não. Nenhum arquivo fica armazenado em nossos servidores. Após sair da página, o arquivo processado não estará mais disponível. Baixe sempre antes de sair.",
  },
  {
    pergunta: "Quais formatos são aceitos?",
    resposta:
      "Vídeo: MP4. Música (para mescla): MP3. Outros formatos não são suportados no momento.",
  },
  {
    pergunta: "O pagamento Pix é instantâneo?",
    resposta:
      "Sim! Após a confirmação do Pix, seus créditos são adicionados automaticamente em poucos segundos.",
  },
  {
    pergunta: "Meu crédito não apareceu após o pagamento",
    resposta:
      "Aguarde até 5 minutos. Se não aparecer, entre em contato pelo Instagram com o comprovante de pagamento.",
  },
];

const links = [
  {
    icon: Upload,
    label: "Laboratório",
    desc: "Processar vídeos",
    href: "/laboratorio",
  },
  {
    icon: CreditCard,
    label: "Créditos",
    desc: "Comprar créditos",
    href: "/creditos",
  },
];

export default function AjudaPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
      {/* Header */}
      <div className="animate-fade-in mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">
          <span className="text-gradient">Ajuda</span>
        </h1>
        <p className="text-muted text-sm sm:text-base">
          Dúvidas frequentes e suporte.
        </p>
      </div>

      {/* Suporte via Instagram */}
      <a
        href="https://www.instagram.com/douglasanndrade2/"
        target="_blank"
        rel="noopener noreferrer"
        className="glass-card rounded-2xl p-5 sm:p-6 flex items-center gap-4 mb-8 animate-fade-in-up delay-1 transition-all duration-300 hover:scale-[1.02] hover:border-accent/50 group"
      >
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 via-accent to-yellow-400 flex items-center justify-center shadow-lg shadow-accent/20 shrink-0 group-hover:shadow-accent/40 transition-all">
          <Instagram size={26} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-foreground">
            Precisa de ajuda? Fale conosco
          </p>
          <p className="text-sm text-muted mt-0.5">
            @douglasanndrade2 no Instagram
          </p>
        </div>
        <ChevronRight
          size={20}
          className="text-muted group-hover:text-accent group-hover:translate-x-1 transition-all duration-300 shrink-0"
        />
      </a>

      {/* FAQ */}
      <div className="space-y-3 mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4 animate-fade-in delay-2">
          Perguntas Frequentes
        </h2>
        {faqs.map((faq, i) => (
          <details
            key={i}
            className={`glass-card rounded-xl group animate-fade-in-up delay-${Math.min(i + 1, 5)}`}
          >
            <summary className="flex items-center gap-3 px-5 py-4 cursor-pointer list-none select-none">
              <HelpCircle
                size={18}
                className="text-accent shrink-0"
              />
              <span className="text-sm font-medium text-foreground flex-1">
                {faq.pergunta}
              </span>
              <ChevronRight
                size={16}
                className="text-muted transition-transform duration-200 group-open:rotate-90"
              />
            </summary>
            <div className="px-5 pb-4 pl-11">
              <p className="text-sm text-muted leading-relaxed">
                {faq.resposta}
              </p>
            </div>
          </details>
        ))}
      </div>

      {/* Links rápidos */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground mb-4 animate-fade-in delay-3">
          Links Rápidos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="glass-card rounded-xl p-4 flex items-center gap-3 transition-all duration-300 hover:border-accent/50 hover:scale-[1.02] group"
            >
              <div className="w-10 h-10 rounded-lg bg-accent-soft flex items-center justify-center shrink-0">
                <link.icon size={20} className="text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {link.label}
                </p>
                <p className="text-xs text-muted">{link.desc}</p>
              </div>
              <ChevronRight
                size={16}
                className="text-muted group-hover:text-accent group-hover:translate-x-1 transition-all"
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
