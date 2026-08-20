import {
  Mail,
  MessageCircle,
  Phone,
  Wallet,
} from "lucide-react";

type StudentActionsProps = {
  onWhatsApp: () => void;
  onCall: () => void;
  onEmail: () => void;
  onReceivePayment: () => void;
  receivePaymentDisabled?: boolean;
};

export default function StudentActions({
  onWhatsApp,
  onCall,
  onEmail,
  onReceivePayment,
  receivePaymentDisabled = false,
}: StudentActionsProps) {
  return (
    <div className="mt-6 grid grid-cols-2 gap-2">

      <button
        type="button"
        onClick={onWhatsApp}
        className="st-button st-button-secondary w-full"
      >
        <MessageCircle size={15} />
        WhatsApp
      </button>

      <button
        type="button"
        onClick={onCall}
        className="st-button st-button-secondary w-full"
      >
        <Phone size={15} />
        Call
      </button>

      <button
        type="button"
        onClick={onEmail}
        className="st-button st-button-secondary w-full"
      >
        <Mail size={15} />
        Email
      </button>

      <button
        type="button"
        onClick={onReceivePayment}
        disabled={receivePaymentDisabled}
        className="st-button st-button-primary w-full disabled:opacity-40"
      >
        <Wallet size={15} />
        Receive payment
      </button>

    </div>
  );
}