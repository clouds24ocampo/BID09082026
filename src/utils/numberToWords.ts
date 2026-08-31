/**
 * Converts numeric currency amounts to official uppercase English words format
 * Example: 1250000.50 -> "ONE MILLION TWO HUNDRED FIFTY THOUSAND PESOS AND 50/100"
 */
export function numberToWords(amount: number | string): string {
  if (amount === undefined || amount === null || amount === '') return '';

  const numStr = String(amount).replace(/,/g, '').trim();
  const num = parseFloat(numStr);
  if (isNaN(num) || num < 0) return '';

  const units = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
  const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
  const scales = ['', 'THOUSAND', 'MILLION', 'BILLION', 'TRILLION'];

  const convertGroup = (n: number): string => {
    let res = '';
    const h = Math.floor(n / 100);
    const r = n % 100;
    if (h > 0) {
      res += `${units[h]} HUNDRED`;
    }
    if (r > 0) {
      if (res) res += ' ';
      if (r < 10) {
        res += units[r];
      } else if (r < 20) {
        res += teens[r - 10];
      } else {
        const t = Math.floor(r / 10);
        const u = r % 10;
        res += tens[t] + (u > 0 ? `-${units[u]}` : '');
      }
    }
    return res;
  };

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  if (integerPart === 0 && decimalPart === 0) {
    return 'ZERO PESOS ONLY';
  }

  let words = '';
  if (integerPart > 0) {
    let temp = integerPart;
    let scaleIndex = 0;
    const parts: string[] = [];

    while (temp > 0) {
      const group = temp % 1000;
      if (group > 0) {
        const groupWords = convertGroup(group);
        const scaleStr = scales[scaleIndex] ? ` ${scales[scaleIndex]}` : '';
        parts.unshift(`${groupWords}${scaleStr}`);
      }
      temp = Math.floor(temp / 1000);
      scaleIndex++;
    }
    words = parts.join(' ');
  } else {
    words = 'ZERO';
  }

  words += ' PESOS';

  if (decimalPart > 0) {
    words += ` AND ${decimalPart}/100`;
  } else {
    words += ' ONLY';
  }

  return words.toUpperCase();
}

export default numberToWords;
