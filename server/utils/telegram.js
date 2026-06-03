const axios = require('axios');

/**
 * Gửi tin nhắn đến Telegram group
 * @param {string} message - Nội dung tin nhắn
 */
const sendTelegramMessage = async (message) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  // #region debug-point E:telegram-message-entry
  (()=>{const fs=require('fs');let u='http://127.0.0.1:7777/event',s='telegram-bill-photo';try{const e=fs.readFileSync('.dbg/telegram-bill-photo.env','utf8');u=e.match(/DEBUG_SERVER_URL=(.+)/)?.[1]||u;s=e.match(/DEBUG_SESSION_ID=(.+)/)?.[1]||s}catch{}fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:s,runId:'pre-fix',hypothesisId:'E',location:'telegram.js:sendTelegramMessage',msg:'[DEBUG] sendTelegramMessage entered',data:{hasToken:!!token,hasChatId:!!chatId,messageLength:message?.length || 0},ts:Date.now()})}).catch(()=>{})})();
  // #endregion

  if (!token || !chatId) {
    console.warn('Telegram Bot Token hoặc Chat ID chưa được cấu hình trong .env');
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    await axios.post(url, {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    });
    // #region debug-point E:telegram-message-success
    (()=>{const fs=require('fs');let u='http://127.0.0.1:7777/event',s='telegram-bill-photo';try{const e=fs.readFileSync('.dbg/telegram-bill-photo.env','utf8');u=e.match(/DEBUG_SERVER_URL=(.+)/)?.[1]||u;s=e.match(/DEBUG_SESSION_ID=(.+)/)?.[1]||s}catch{}fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:s,runId:'pre-fix',hypothesisId:'E',location:'telegram.js:sendTelegramMessage',msg:'[DEBUG] sendTelegramMessage success',data:{transport:'sendMessage'},ts:Date.now()})}).catch(()=>{})})();
    // #endregion
  } catch (error) {
    // #region debug-point E:telegram-message-error
    (()=>{const fs=require('fs');let u='http://127.0.0.1:7777/event',s='telegram-bill-photo';try{const e=fs.readFileSync('.dbg/telegram-bill-photo.env','utf8');u=e.match(/DEBUG_SERVER_URL=(.+)/)?.[1]||u;s=e.match(/DEBUG_SESSION_ID=(.+)/)?.[1]||s}catch{}fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:s,runId:'pre-fix',hypothesisId:'E',location:'telegram.js:sendTelegramMessage',msg:'[DEBUG] sendTelegramMessage error',data:{transport:'sendMessage',error:error.response?.data || error.message},ts:Date.now()})}).catch(()=>{})})();
    // #endregion
    console.error('Lỗi khi gửi tin nhắn Telegram:', error.response?.data || error.message);
  }
};

const sendTelegramPhoto = async (photoUrl, caption = '') => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  // #region debug-point B:telegram-photo-entry
  (()=>{const fs=require('fs');let u='http://127.0.0.1:7777/event',s='telegram-bill-photo';try{const e=fs.readFileSync('.dbg/telegram-bill-photo.env','utf8');u=e.match(/DEBUG_SERVER_URL=(.+)/)?.[1]||u;s=e.match(/DEBUG_SESSION_ID=(.+)/)?.[1]||s}catch{}fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:s,runId:'pre-fix',hypothesisId:'B',location:'telegram.js:sendTelegramPhoto',msg:'[DEBUG] sendTelegramPhoto entered',data:{hasToken:!!token,hasChatId:!!chatId,photoUrl,captionLength:caption?.length || 0},ts:Date.now()})}).catch(()=>{})})();
  // #endregion

  if (!token || !chatId) {
    console.warn('Telegram Bot Token hoặc Chat ID chưa được cấu hình trong .env');
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendPhoto`;
    await axios.post(url, {
      chat_id: chatId,
      photo: photoUrl,
      caption,
      parse_mode: 'HTML'
    });
    // #region debug-point D:telegram-photo-success
    (()=>{const fs=require('fs');let u='http://127.0.0.1:7777/event',s='telegram-bill-photo';try{const e=fs.readFileSync('.dbg/telegram-bill-photo.env','utf8');u=e.match(/DEBUG_SERVER_URL=(.+)/)?.[1]||u;s=e.match(/DEBUG_SESSION_ID=(.+)/)?.[1]||s}catch{}fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:s,runId:'pre-fix',hypothesisId:'D',location:'telegram.js:sendTelegramPhoto',msg:'[DEBUG] sendTelegramPhoto success',data:{transport:'sendPhoto',photoUrl},ts:Date.now()})}).catch(()=>{})})();
    // #endregion
  } catch (error) {
    // #region debug-point D:telegram-photo-error
    (()=>{const fs=require('fs');let u='http://127.0.0.1:7777/event',s='telegram-bill-photo';try{const e=fs.readFileSync('.dbg/telegram-bill-photo.env','utf8');u=e.match(/DEBUG_SERVER_URL=(.+)/)?.[1]||u;s=e.match(/DEBUG_SESSION_ID=(.+)/)?.[1]||s}catch{}fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:s,runId:'pre-fix',hypothesisId:'D',location:'telegram.js:sendTelegramPhoto',msg:'[DEBUG] sendTelegramPhoto error',data:{transport:'sendPhoto',photoUrl,error:error.response?.data || error.message},ts:Date.now()})}).catch(()=>{})})();
    // #endregion
    console.error('Lỗi khi gửi ảnh Telegram:', error.response?.data || error.message);

    if (caption) {
      await sendTelegramMessage(caption);
    }
  }
};

module.exports = { sendTelegramMessage, sendTelegramPhoto };
