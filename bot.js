const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const config = require('./config');

const bot = new TelegramBot(config.TELEGRAM_TOKEN, { polling: true });

const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate';

// Menggunakan emoji bendera dan memperpendek nama negara
const SUPPORTED_LANGUAGES = {
  BG: '🇧🇬 BG',
  CS: '🇨🇿 CZ',
  DA: '🇩🇰 DK',
  DE: '🇩🇪 DE',
  EL: '🇬🇷 GR',
  EN: '🇬🇧 EN',
  ES: '🇪🇸 ES',
  ET: '🇪🇪 ET',
  FI: '🇫🇮 FI',
  FR: '🇫🇷 FR',
  HU: '🇭🇺 HU',
  ID: '🇮🇩 ID',
  IT: '🇮🇹 IT',
  JA: '🇯🇵 JP',
  LT: '🇱🇹 LT',
  LV: '🇱🇻 LV',
  NL: '🇳🇱 NL',
  PL: '🇵🇱 PL',
  PT: '🇵🇹 PT',
  RO: '🇷🇴 RO',
  RU: '🇷🇺 RU',
  SK: '🇸🇰 SK',
  SL: '🇸🇮 SI',
  SV: '🇸🇪 SE',
  TR: '🇹🇷 TR',
  ZH: '🇨🇳 CN',
  HI: '🇮🇳 HI', // Hindi
  AF: '🇿🇦 AF', // Afrikaans
  BN: '🇧🇩 BN', // Bengali
  FA: '🇮🇷 FA', // Persian
  HE: '🇮🇱 HE', // Hebrew
  HR: '🇭🇷 HR', // Croatian
  NO: '🇳🇴 NO', // Norwegian
  AR: '🇸🇦 AR', // Arabic
  KO: '🇰🇷 KO', // Korean
  UK: '🇺🇦 UK', // Ukrainian
};

let userLanguageSelection = {};

function chunkArray(array, chunkSize) {
  const result = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize));
  }
  return result;
}

function createLanguageKeyboard() {
  const languageButtons = Object.keys(SUPPORTED_LANGUAGES).map(lang => ({
    text: SUPPORTED_LANGUAGES[lang],
    callback_data: lang,
  }));

  const chunkedButtons = chunkArray(languageButtons, 5);
  // Add the reset button on its own row
  chunkedButtons.push([{ text: '🔄 Reset', callback_data: 'RESET' }]);

  return chunkedButtons;
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  const options = {
    reply_markup: JSON.stringify({
      inline_keyboard: createLanguageKeyboard(),
    }),
  };

  bot.sendMessage(chatId, 'Pilih bahasa awal:', options);
});

bot.on('callback_query', (callbackQuery) => {
  const message = callbackQuery.message;
  const chatId = message.chat.id;
  const data = callbackQuery.data;

  if (data === 'RESET') {
    userLanguageSelection[chatId] = null;
    bot.sendMessage(chatId, 'Pilihan bahasa telah di-reset. Silakan mulai lagi dengan /start.');
    return;
  }

  if (!userLanguageSelection[chatId]) {
    userLanguageSelection[chatId] = { source_lang: data };

    bot.sendMessage(chatId, `Bahasa awal: ${SUPPORTED_LANGUAGES[data]}. Pilih bahasa tujuan:`, {
      reply_markup: JSON.stringify({
        inline_keyboard: createLanguageKeyboard(),
      }),
    });
  } else {
    userLanguageSelection[chatId].target_lang = data;
    bot.sendMessage(chatId, `Bahasa tujuan: ${SUPPORTED_LANGUAGES[data]}. Sekarang kirim teks yang ingin diterjemahkan atau ketik /start untuk memulai ulang.`);
  }
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text.startsWith('/')) {
    const userLangs = userLanguageSelection[chatId];

    if (userLangs && userLangs.source_lang && userLangs.target_lang) {
      axios.post(DEEPL_API_URL, null, {
        params: {
          auth_key: config.DEEPL_API_KEY,
          text: text,
          source_lang: userLangs.source_lang,
          target_lang: userLangs.target_lang,
        },
      })
      .then(response => {
        const translatedText = response.data.translations[0].text;
        bot.sendMessage(chatId, translatedText);
      })
      .catch(error => {
        console.error(error);
        bot.sendMessage(chatId, 'Terjadi kesalahan saat menerjemahkan.');
      });
    } else {
      bot.sendMessage(chatId, 'Silakan pilih bahasa awal dan tujuan terlebih dahulu dengan perintah /start.');
    }
  }
});
