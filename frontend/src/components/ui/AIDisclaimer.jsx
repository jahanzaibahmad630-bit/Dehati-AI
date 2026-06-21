export default function AIDisclaimer({ small = false }) {
  return (
    <span
      className="ai-disclaimer"
      style={small ? { fontSize: '.65rem', padding: '.15rem .4rem' } : {}}
      title="یہ AI کا مشورہ ہے — حتمی فیصلے کے لیے ماہر سے ملیں"
    >
      🤖 AI مشورہ — زرعی افسر سے تصدیق کریں
    </span>
  );
}
