const MASTERCARD_CARD_REGEXES = [
  /^5(([1-5][0-9]{14})|([1-5][0-9]{17}))$/,
  /^2(22[1-9][0-9]{12}|2[3-9][0-9]{13}|[3-6][0-9]{14}|7[0-1][0-9]{13}|720[0-9]{12})$/,
];

const VISA_REGEX = /^4([0-9]{12}|[0-9]{15}|[0-9]{18})$/;

export const isMastercardCard = (cardNumber: string) =>
  isCardNumberValid(cardNumber) &&
  MASTERCARD_CARD_REGEXES.some((regex) => regex.test(cardNumber));

export const isVisaCard = (cardNumber: string) =>
  isCardNumberValid(cardNumber) && VISA_REGEX.test(cardNumber);

export const isCardNumberValid = (cardNumber: string) => {
  const sanitizedCardNumber = cardNumber.replace(/[\s-]/g, "");

  return luhnCheck(sanitizedCardNumber);
};

function luhnCheck(cardNumber: string): boolean {
  if (/[^0-9]+/.test(cardNumber)) {
    return false;
  }

  let nCheck = 0;
  let bEven = false;

  for (let n = cardNumber.length - 1; n >= 0; n--) {
    const cDigit = cardNumber.charAt(n);
    let nDigit = parseInt(cDigit, 10);

    if (bEven) {
      if ((nDigit *= 2) > 9) {
        nDigit -= 9;
      }
    }

    nCheck += nDigit;
    bEven = !bEven;
  }

  return nCheck % 10 === 0;
}
