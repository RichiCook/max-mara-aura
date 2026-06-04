import { useState } from 'react';
import { Share2, Instagram, MessageCircle, MessageSquare, Send, Link as LinkIcon, QrCode, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import QRCode from 'qrcode';
import {
  ShareableLook,
  nativeShare,
  shareToWhatsApp,
  shareToSMS,
  shareToInstagram,
  buildLookShareUrl,
  copyToClipboard,
  buildCaption,
  buildShortCaption,
  createLookShortUrl,
} from '@/lib/lookShare';

interface Props {
  look: ShareableLook;
  onShared?: (channel: string) => void;
  disabledReason?: string;
  variant?: 'text' | 'icon';
}

const LookShareMenu = ({ look, onShared, disabledReason, variant = 'text' }: Props) => {
  const [open, setOpen] = useState(false);
  const [wechatOpen, setWechatOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fire = (channel: string) => {
    onShared?.(channel);
    setOpen(false);
  };

  const handleNative = async () => {
    setBusy(true);
    const res = await nativeShare(look);
    setBusy(false);
    if (res === 'shared') {
      toast.success('Shared');
      fire('native');
    } else if (res === 'unsupported') {
      toast.info('Use one of the channels below');
    } else {
      setOpen(false);
    }
  };

  const handleWeChat = async () => {
    const url = await createLookShortUrl(look);
    const dataUrl = await QRCode.toDataURL(url, { width: 260, margin: 1 });
    setQrDataUrl(dataUrl);
    setWechatOpen(true);
    setOpen(false);
    fire('wechat');
  };

  const handleInstagram = async () => {
    setBusy(true);
    const r = await shareToInstagram(look);
    setBusy(false);
    if (r.status === 'no-image') {
      toast.error('Preview image still generating');
      return;
    }
    toast.success('Image saved · caption copied — paste it in Instagram');
    fire('instagram');
  };

  const handleCopy = async () => {
    const shortUrl = await createLookShortUrl(look);
    const ok = await copyToClipboard(buildShortCaption(shortUrl, look));
    if (ok) toast.success('Link copiato');
    else toast.error('Copy failed');
    fire('copy');
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={!!disabledReason}
            title={disabledReason ?? 'Share this look'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              borderRadius: 6,
              background: disabledReason ? '#e4e0db' : '#1a1a1a',
              color: '#fff',
              border: 'none',
              cursor: disabledReason ? 'not-allowed' : 'pointer',
              fontFamily: "'Inter', sans-serif",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              opacity: disabledReason ? 0.6 : 1,
            }}
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Share2 className="w-3 h-3" />}
            Share
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 p-1">
          {typeof navigator !== 'undefined' && (navigator as any).share && (
            <MenuItem icon={<Send className="w-4 h-4" />} label="Quick share…" onClick={handleNative} />
          )}
          <MenuItem icon={<Instagram className="w-4 h-4" />} label="Instagram Story" onClick={handleInstagram} />
          <MenuItem icon={<MessageCircle className="w-4 h-4" />} label="WhatsApp" onClick={async () => { setBusy(true); await shareToWhatsApp(look); setBusy(false); fire('whatsapp'); }} />
          <MenuItem icon={<QrCode className="w-4 h-4" />} label="WeChat" onClick={handleWeChat} />
          <MenuItem icon={<MessageSquare className="w-4 h-4" />} label="Messages" onClick={() => { shareToSMS(look); fire('sms'); }} />
          <div className="my-1 h-px bg-border" />
          <MenuItem icon={<LinkIcon className="w-4 h-4" />} label="Copy link & products" onClick={handleCopy} />
        </PopoverContent>
      </Popover>

      <Dialog open={wechatOpen} onOpenChange={setWechatOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Share to WeChat</DialogTitle>
            <DialogDescription>
              Open WeChat → Discover → Scan QR, then forward to your contacts or Moments.
            </DialogDescription>
          </DialogHeader>
          {qrDataUrl && (
            <div className="flex justify-center py-2">
              <img src={qrDataUrl} alt="Look QR" width={240} height={240} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

const MenuItem = ({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm hover:bg-accent"
    style={{ fontFamily: "'Inter', sans-serif" }}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export default LookShareMenu;
