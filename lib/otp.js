/**
 * Generatore di OTP (One-Time Password) a 6 cifre
 *
 * Genera codici numerici casuali per autenticazione
 * Validità: 20 minuti
 * Formato: 6 cifre (es. 123456)
 *
 * Spazio combinazioni: 1.000.000 (10^6)
 * Con rate limiting è sicuro per uso temporaneo
 */

/**
 * Genera un OTP casuale a 6 cifre
 * @returns {string} OTP formato "123456"
 */
export function generateOTP() {
  // Genera numero random tra 0 e 999999
  const otp = Math.floor(Math.random() * 1000000);

  // Pad con zeri a sinistra per avere sempre 6 cifre
  return otp.toString().padStart(6, '0');
}

/**
 * Valida il formato di un OTP
 * @param {string} otp - L'OTP da validare
 * @returns {boolean} True se il formato è valido (6 cifre)
 */
export function isValidOTPFormat(otp) {
  if (!otp || typeof otp !== 'string') {
    return false;
  }

  // Deve essere esattamente 6 caratteri numerici
  return /^\d{6}$/.test(otp);
}

/**
 * Durata validità OTP in millisecondi (20 minuti)
 */
export const OTP_VALIDITY_MS = 20 * 60 * 1000;

/**
 * Durata validità OTP in minuti (per display)
 */
export const OTP_VALIDITY_MINUTES = 20;

/**
 * Statistiche del generatore
 */
export const OTP_STATS = {
  digits: 6,
  totalCombinations: 1000000,
  validityMinutes: OTP_VALIDITY_MINUTES,
  validityMs: OTP_VALIDITY_MS
};
