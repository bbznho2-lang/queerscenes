import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface SupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SupportDialog = ({ open, onOpenChange }: SupportDialogProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Preencha todos os campos.");
      return;
    }
    toast.success("Mensagem enviada! Responderemos em breve.");
    setName("");
    setEmail("");
    setMessage("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="neon-text-blue text-xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Suporte
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">Nome</Label>
            <Input
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-muted/50 border-border"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">Email</Label>
            <Input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-muted/50 border-border"
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">Mensagem</Label>
            <Textarea
              placeholder="Como podemos ajudar?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-muted/50 border-border min-h-[100px] resize-none"
              maxLength={1000}
            />
          </div>

          <Button type="submit" className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full glow-blue gap-2">
            <Send className="w-4 h-4" /> Enviar Mensagem
          </Button>
        </form>

        <div className="border-t border-border pt-4 mt-2">
          <p className="text-xs text-muted-foreground text-center mb-3">
            Para respostas mais rápidas:
          </p>
          <a
            href="https://t.me/queerscenes"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full neon-border-purple text-primary hover:bg-primary/10 transition-colors text-sm font-medium"
          >
            <MessageCircle className="w-4 h-4" /> Entrar no Telegram
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SupportDialog;
