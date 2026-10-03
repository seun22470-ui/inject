export async function translateText(text, targetLang = 'en', sourceLang = 'auto') {
  try {
    const langPair = sourceLang === 'auto' ? targetLang : `${sourceLang}|${targetLang}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      success: true,
      translatedText: data.responseData?.translatedText || text,
      match: data.responseData?.match,
      targetLanguage: targetLang
    };
  } catch (err) {
    // Graceful offline fallback
    return {
      success: false,
      error: err.message,
      originalText: text
    };
  }
}
