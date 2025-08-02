export function speakSmart(
  text: string,
  {
    lang = "de-DE",
    rate = 0.85,
    onEnd,
    onError,
  }: {
    lang?: string;
    rate?: number;
    onEnd?: () => void;
    onError?: () => void;
  } = {}
) {
  if (!("speechSynthesis" in window)) {
    if (onEnd) setTimeout(onEnd, 600);
    return;
  }
  window.speechSynthesis.cancel();
  const utter = new window.SpeechSynthesisUtterance("\u00A0" + text);
  utter.lang = lang;
  utter.rate = rate;

  // --- Вибір правильного голосу ---
  const voices = window.speechSynthesis.getVoices();
  // Google voice для потрібної мови
  const googleVoice = voices.find(
    (v) =>
      v.lang.toLowerCase().startsWith(lang.toLowerCase().slice(0, 2)) &&
      v.name.toLowerCase().includes("google")
  );
  // Будь-який голос потрібної мови
  const langVoice = voices.find((v) =>
    v.lang.toLowerCase().startsWith(lang.toLowerCase().slice(0, 2))
  );
  // Fallback: перший голос
  utter.voice = googleVoice || langVoice || voices[0];

  if (onEnd) utter.onend = onEnd;
  if (onError) utter.onerror = onError;
  window.speechSynthesis.speak(utter);
}
