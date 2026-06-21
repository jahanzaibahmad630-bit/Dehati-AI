import { useOffline } from '../../hooks/useOffline';

export default function OfflineBanner() {
  const { isOffline } = useOffline();
  if (!isOffline) return null;

  return (
    <div className="offline-banner" role="alert" aria-live="polite">
      <span>📵</span>
      <span>انٹرنیٹ نہیں — AI اور موسم بند ہیں، کیلکولیٹر چلتے رہیں گے</span>
    </div>
  );
}
