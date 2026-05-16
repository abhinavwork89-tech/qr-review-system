import type { AiReviewLanguage } from "@/lib/ai/constants";
import { maybeAppendReviewEmoji } from "@/lib/ai/review-emoji";
import { sanitizeReviewSuggestion } from "@/lib/ai/review-gen-sanitize";

type StarRating = 1 | 2 | 3 | 4 | 5;

function pick<T>(arr: T[], seed: number, i: number): T {
  return arr[(seed + i * 17) % arr.length]!;
}

function clampRating(rating: number): StarRating {
  const r = Math.round(rating);
  if (r <= 1) return 1;
  if (r >= 5) return 5;
  return r as StarRating;
}

/** Replace `{brand}` when present; leave lines without placeholder unchanged. */
function applyBrand(template: string, brand: string): string {
  return template.includes("{brand}")
    ? template.replace(/\{brand\}/g, brand)
    : template;
}

const EN_BY_RATING: Record<StarRating, string[]> = {
  1: [
    "Honestly disappointed — the visit felt disorganized, small issues piled up, and I would not recommend {brand} right now.",
    "Frustrating experience overall; service was slow, details were missed, and it did not feel worth the time today.",
    "Not what I expected at all — communication was weak and I am unlikely to come back unless things improve a lot.",
    "Left unhappy; basics were off and the mood felt careless. Would hesitate to suggest this place to friends.",
    "Pretty poor visit — nothing felt smooth from entry to exit, and {brand} fell well short of a decent standard.",
  ],
  2: [
    "Below expectations — a few okay moments, but too many rough edges; I probably would not rush back to {brand}.",
    "Mixed and mostly underwhelming; staff seemed to try, yet consistency and follow-through were missing.",
    "Not terrible, not good — felt uneven and a bit forgettable. Unlikely to return soon unless something changes.",
    "Had higher hopes; pace and attention were inconsistent, and the overall value did not feel strong.",
    "Some parts were fine, but the negatives outweighed the positives — {brand} has room to improve clearly.",
  ],
  3: [
    "Average experience — nothing awful, nothing memorable; {brand} was okay for a one-time stop.",
    "Middle-of-the-road visit; basics were met, but it did not leave me excited to return.",
    "Decent enough overall — a few highlights, a few misses, and it balanced out to just fine.",
    "Neutral takeaway; service and setup were acceptable, though nothing really stood out as special.",
    "Okay outing — fair quality for the price, but I would not call it a must-visit spot.",
  ],
  4: [
    "Solid visit — friendly team, smooth flow, and {brand} delivered a genuinely good experience.",
    "Pleasant time overall; small touches stood out and I would happily come back when nearby.",
    "Well handled from start to finish — attentive without hovering, and the vibe felt welcoming.",
    "Happy with how it went; quality felt consistent and the visit was worth the effort.",
    "Good experience — clear communication, calm pacing, and I would recommend it for a relaxed outing.",
  ],
  5: [
    "Outstanding from start to finish — {brand} exceeded expectations; already told friends to try it.",
    "Loved every part of the visit — warm service, great energy, and quality that stayed consistent throughout.",
    "Easily a top pick lately — thoughtful details, quick help, and a vibe that felt genuinely welcoming.",
    "Five stars for real — smooth, friendly, and memorable in the best way. Would gladly return soon 🙂",
    "Blown away in the best sense — {brand} nailed it; felt cared for and left genuinely impressed.",
  ],
};

const HI_BY_RATING: Record<StarRating, string[]> = {
  1: [
    "सच में निराश करने वाला अनुभव — व्यवस्था कमज़ोर थी, छोटी-छोटी गलतियाँ जुड़ीं, और {brand} अभी सिफारिश के लायक नहीं लगा।",
    "कुल मिलाकर खराब रहा; सेवा धीमी थी, बातचीत साफ नहीं थी, और दोबारा जाने का मन नहीं बना।",
    "उम्मीद से काफी कम — अनुभव बेढंगा लगा और समय के हिसाब से सही नहीं बैठा।",
    "नाराज़ी जैसा महसूस हुआ; बुनियादी बातें भी ठीक नहीं थीं, जल्दी वापसी की योजना नहीं है।",
    "अनुभव निराशाजनक रहा — शुरू से अंत तक कुछ भी सहज नहीं लगा, {brand} से उम्मीद पूरी नहीं हुई।",
  ],
  2: [
    "उम्मीद से नीचे — कुछ ठीक पल थे, पर कई कमियाँ रहीं; {brand} पर जल्दी लौटने का मन नहीं।",
    "मिला-जुला और ज़्यादातर औसत से कम — स्टाफ ने कोशिश की, मगर निरंतरता नहीं दिखी।",
    "बुरा नहीं, अच्छा भी नहीं — यादगार नहीं बना; शायद ही दोबारा आऊँ जब तक सुधार न दिखे।",
    "थोड़ा निराश — ध्यान और गति बीच-बीच में लुड़की, कुल मिलाकर मूल्य कमज़ोर लगा।",
    "कुछ हिस्से ठीक थे, पर नकारात्मक बढ़े — {brand} को अभी और मेहनत की ज़रूरत है।",
  ],
  3: [
    "औसत अनुभव — न बहुत बुरा, न खास यादगार; {brand} एक बार के लिए ठीक था।",
    "बीच का अनुभव — ज़रूरी बातें पूरी हुईं, पर वापस जाने की खास इच्छा नहीं बनी।",
    "ठीक-ठाक रहा — कुछ अच्छा, कुछ कमज़ोर, कुल मिलाकर संतुलित औसत।",
    "तटस्थ राय — सेवा चलने लायक थी, मगर कुछ भी खास नहीं उभरा।",
    "साधारण सा अनुभव — कीमत के हिसाब से ठीक, पर ज़रूरी नहीं कि दोबारा आऊँ।",
  ],
  4: [
    "अच्छा अनुभव — टीम मिलनसार, व्यवस्था साफ, और {brand} ने उम्मीद के मुताबिक अच्छा काम किया।",
    "संतुष्ट महसूस हुआ — छोटे ध्यान देने योग्य बिंदु दिखे, पास हो तो दोबारा आने में हिचक नहीं।",
    "शुरू से अंत तक सहज — स्टाफ मददगार, बिना घुसपैठ के, माहौल आरामदायक लगा।",
    "कुल मिलाकर सही रहा — गुणवत्ता स्थिर लगी और यात्रा सार्थक महसूस हुई।",
    "अच्छी सिफारिश — बातचीत साफ, इंतज़ार कम, और अनुभव संतुलित व सुखद रहा।",
  ],
  5: [
    "शानदार अनुभव — {brand} ने उम्मीद से ऊपर किया; दोस्तों को भी बता चुका/चुकी हूँ।",
    "दिल से पसंद आया — गर्मजोशी, तेज़ मदद, और गुणवत्ता पूरे समय बनी रही।",
    "कमाल का — विवरणों पर ध्यान, साफ व्यवस्था, और माहौल वाकई स्वागत योग्य लगा।",
    "पाँच सितारे बनते हैं — सहज, मिलनसार, और यादगार; जल्दी फिर आने का मन है।",
    "बहुत प्रभावित — {brand} ने सब कुछ संभाला; खुद को देखभाल में महसूस किया।",
  ],
};

const MIX_BY_RATING: Record<StarRating, string[]> = {
  1: [
    "Honestly disappointed — visit felt messy, small issues added up, and {brand} is hard to recommend right now.",
    "Frustrating overall; service slow tha, details miss hue, aur time worth nahi laga aaj.",
    "Expectation se kaafi neeche — communication weak thi, wapas aane ka mood nahi unless improve ho.",
    "Unhappy feel hua — basics bhi off the, friends ko suggest karne se rukunga/rukungi.",
    "Poor visit — start se end tak smooth nahi laga; {brand} ne standard miss kiya.",
  ],
  2: [
    "Below expectations — kuch theek moments, par zyada rough edges; {brand} pe jaldi wapas nahi.",
    "Mixed-negative vibe — staff tried, lekin consistency missing thi poori visit mein.",
    "Terrible nahi, great bhi nahi — uneven laga, jaldi return unlikely jab tak change na dikhe.",
    "Hopes zyada thi — pace aur attention inconsistent, overall value weak feel hui.",
    "Kuch parts okay, par negatives zyada — {brand} ko clearly improve karna padega.",
  ],
  3: [
    "Average experience — kuch khaas bura nahi, kuch khaas accha bhi nahi; {brand} ek baar ke liye theek.",
    "Middle-of-the-road — basics cover hue, par wapas jaane ki excitement nahi bani.",
    "Theek-thak — kuch plus, kuch minus, overall balance hoke neutral reh gaya.",
    "Neutral takeaway — service acceptable thi, par koi wow moment nahi aaya.",
    "Okay outing — price ke hisaab se fair, par must-visit nahi bolunga/bolungi.",
  ],
  4: [
    "Solid visit — team friendly thi, flow smooth, aur {brand} ne genuinely accha deliver kiya.",
    "Pleasant time — chhoti details notice hui, paas hoon to wapas aa sakta/hoon sakti hoon.",
    "Start se end smooth — attentive without hovering, vibe welcoming laga.",
    "Happy overall — quality consistent thi aur visit worth laga.",
    "Good recommend — clear baat, kam wait, relaxed outing ke liye theek choice.",
  ],
  5: [
    "Outstanding — {brand} ne expectations beat ki; friends ko already bol diya try karein.",
    "Loved it — warm service, great energy, quality poora time consistent rahi.",
    "Top pick lately — thoughtful details, quick help, vibe genuinely welcoming tha.",
    "Full marks — smooth, friendly, memorable; jaldi wapas aaunga/aaungi.",
    "Blown away — {brand} ne nail kiya; cared-for feel hua, genuinely impressed chhoda.",
  ],
};

const EN_TAILS_BY_RATING: Record<StarRating, string[]> = {
  1: [
    "Overall it felt below par, and I would wait before trying again.",
    "Too many small misses added up for a visit I cannot praise honestly.",
  ],
  2: [
    "It might work for some, but it did not win me over this time.",
    "A few fixes could help, yet tonight it felt mostly underwhelming.",
  ],
  3: [
    "Fair for a casual try, though I am keeping expectations moderate next time.",
    "It met the basics, but nothing pushed it into must-return territory.",
  ],
  4: [
    "Would come back when nearby; the team made the visit easy and pleasant.",
    "Small details mattered, and the pace felt comfortable throughout.",
  ],
  5: [
    "Would gladly return; the experience felt thoughtful and genuinely welcoming.",
    "Already planning a repeat visit when I have time — that good.",
  ],
};

const HI_TAILS_BY_RATING: Record<StarRating, string[]> = {
  1: [
    "कुल मिलाकर कमज़ोर रहा, अभी दोबारा जाने की इच्छा नहीं है।",
    "छोटी-छोटी कमियाँ मिलकर कुल अनुभव को कमज़ोर बना देती हैं।",
  ],
  2: [
    "कुछ लोगों के लिए ठीक हो, मगर मुझे इस बार खास नहीं लगा।",
    "सुधार हो सकता है, पर आज रात औसत से नीचे ही महसूस हुआ।",
  ],
  3: [
    "एक बार आज़माने लायक, पर अगली बार उम्मीदें मध्यम ही रखूँगा/रखूँगी।",
    "बुनियादी बातें पूरी हुईं, पर वापस जाने वाली बात नहीं बनी।",
  ],
  4: [
    "पास हो तो दोबारा आ सकता/सकती हूँ; टीम ने अनुभव आसान बनाया।",
    "छोटे बिंदुओं ने अंतर डाला, पूरा समय आरामदायक लगा।",
  ],
  5: [
    "खुशी से वापस आऊँगा/आऊँगी; अनुभव सच में स्वागत योग्य था।",
    "जल्दी फिर आने की योजना है — इतना अच्छा लगा।",
  ],
};

const MIX_TAILS_BY_RATING: Record<StarRating, string[]> = {
  1: [
    "Overall below par laga, abhi retry ka mood nahi.",
    "Chhoti misses milke visit ko honestly praise karna mushkil hai.",
  ],
  2: [
    "Kisi ke liye chalega, par mujhe is baar win nahi kiya.",
    "Improve ho sakta hai, par aaj mostly underwhelming feel hua.",
  ],
  3: [
    "Casual try ke liye fair, next time expectations moderate rakhunga/rakhungi.",
    "Basics cover hue, par must-return wali baat nahi bani.",
  ],
  4: [
    "Paas hoon to wapas aa sakta/hoon; team ne visit easy banaya.",
    "Chhoti details ne difference banaya, pace comfortable rahi.",
  ],
  5: [
    "Gladly wapas aaunga/aaungi; thoughtful aur welcoming laga.",
    "Repeat visit plan ho rahi hai — utna accha tha.",
  ],
};

const LAST_RESORT: Record<AiReviewLanguage, Record<StarRating, string>> = {
  en: {
    1: "Disappointed with the visit — service and details fell short, and I would not recommend it in its current state.",
    2: "Below expectations overall — a few okay moments, but too uneven to feel worth a quick return visit.",
    3: "Average experience — acceptable basics, neutral overall, and nothing that strongly pulls me back yet.",
    4: "Good visit — friendly service, smooth flow, and a satisfied feeling overall; would return when nearby.",
    5: "Excellent experience — warm team, consistent quality, and genuinely happy to recommend it to others.",
  },
  hi: {
    1: "अनुभव निराशाजनक रहा — सेवा और बारीकियाँ कमज़ोर थीं, अभी की स्थिति में सिफारिश करना मुश्किल है।",
    2: "उम्मीद से कम — कुछ ठीक पल थे, मगर कुल मिलाकर असमान रहा, जल्दी वापसी संभव नहीं।",
    3: "औसत अनुभव — बुनियादी बातें ठीक थीं, पर खास वापसी की प्रेरणा नहीं बनी।",
    4: "अच्छा अनुभव — मिलनसार सेवा, सहज व्यवस्था, कुल मिलाकर संतुष्टि; पास हो तो दोबारा आऊँगा/आऊँगी।",
    5: "उत्कृष्ट अनुभव — गर्मजोशी, स्थिर गुणवत्ता, दिल से दूसरों को भी बताने लायक।",
  },
  hinglish: {
    1: "Disappointed feel hua — service aur details short rahe, abhi recommend karna mushkil hai.",
    2: "Expectation se neeche — kuch theek tha, par uneven tha, jaldi wapas unlikely.",
    3: "Average — basics theek, neutral overall, strong pull back nahi bana.",
    4: "Accha visit — friendly service, smooth flow, satisfied feel; paas hoon to wapas aa sakta/hoon.",
    5: "Excellent — warm team, consistent quality, genuinely recommend karunga/karungi.",
  },
};

function templatesFor(
  language: AiReviewLanguage,
  rating: StarRating,
): string[] {
  if (language === "hi") return HI_BY_RATING[rating];
  if (language === "hinglish") return MIX_BY_RATING[rating];
  return EN_BY_RATING[rating];
}

function tailsFor(language: AiReviewLanguage, rating: StarRating): string[] {
  if (language === "hi") return HI_TAILS_BY_RATING[rating];
  if (language === "hinglish") return MIX_TAILS_BY_RATING[rating];
  return EN_TAILS_BY_RATING[rating];
}

function finalizeFallbackLine(
  raw: string,
  language: AiReviewLanguage,
  rating: StarRating,
  seed: number,
  lineIndex: number,
): string {
  const withEmoji = maybeAppendReviewEmoji(raw, rating, seed + lineIndex * 7);
  let s = withEmoji.replace(/\s+/g, " ").trim();
  const tails = tailsFor(language, rating);
  let k = 0;
  while (s.length < 80 && k < 12) {
    s = `${s} ${pick(tails, seed, lineIndex + k)}`.replace(/\s+/g, " ").trim();
    k++;
  }
  if (s.length > 220) s = s.slice(0, 220).trim();
  const cleaned = sanitizeReviewSuggestion(s);
  if (cleaned) return cleaned;
  const fallback = sanitizeReviewSuggestion(LAST_RESORT[language][rating]);
  return fallback ?? s.slice(0, 220);
}

/** Deterministic-ish fallback so repeated calls are not identical noise. */
export function buildFallbackReviewSuggestions(input: {
  rating: number;
  language: AiReviewLanguage;
  count: number;
  brandName: string;
}): string[] {
  const brand = input.brandName.trim() || "this place";
  const rating = clampRating(input.rating);
  const seed =
    rating * 31 +
    input.count * 3 +
    (input.language === "hi" ? 5 : input.language === "hinglish" ? 7 : 0);

  const pool = templatesFor(input.language, rating).map((t) => applyBrand(t, brand));

  const out: string[] = [];
  for (let i = 0; i < input.count; i++) {
    out.push(finalizeFallbackLine(pick(pool, seed, i), input.language, rating, seed, i));
  }
  return out.slice(0, input.count);
}
