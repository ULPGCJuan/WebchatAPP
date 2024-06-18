import CryptoJS from 'crypto-js';

export function encryptMessage(message, key) {
    const iv = CryptoJS.lib.WordArray.random(16);
    const encrypted = CryptoJS.AES.encrypt(message, CryptoJS.enc.Utf8.parse(key), {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
    });

    console.log({
        iv: iv.toString(CryptoJS.enc.Hex),
        encryptedText: encrypted.toString(),
    });
    return {
        iv: iv.toString(CryptoJS.enc.Hex),
        encryptedText: encrypted.toString(),
    };
}

export function decryptMessage(encryptedMessage, key) {
    const iv = CryptoJS.enc.Hex.parse(encryptedMessage.iv);
    const decrypted = CryptoJS.AES.decrypt(
        {
            ciphertext: CryptoJS.enc.Hex.parse(encryptedMessage.encryptedText),
        },
        CryptoJS.enc.Utf8.parse(key),
        {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7,
        }
    );

    return decrypted.toString(CryptoJS.enc.Utf8);
}

module.exports = {
    encryptMessage,
    decryptMessage,
};
