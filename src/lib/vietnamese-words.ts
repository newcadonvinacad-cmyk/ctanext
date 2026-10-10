/**
 * Utility function to convert numbers into Vietnamese currency words (VND)
 * Standard accounting format: "Mười lăm triệu hai trăm năm mươi nghìn đồng chẵn."
 */

const DIGITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
const UNITS = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ", "tỷ tỷ"];

function readGroupOfThree(num: number, hasHigherGroup: boolean): string {
  const hundred = Math.floor(num / 100);
  const ten = Math.floor((num % 100) / 10);
  const one = num % 10;
  let res = "";

  if (hundred > 0 || hasHigherGroup) {
    res += DIGITS[hundred] + " trăm ";
  }

  if (ten > 1) {
    res += DIGITS[ten] + " mươi ";
    if (one === 1) res += "mốt";
    else if (one === 5) res += "lăm";
    else if (one > 0) res += DIGITS[one];
  } else if (ten === 1) {
    res += "mười ";
    if (one === 1) res += "một";
    else if (one === 5) res += "lăm";
    else if (one > 0) res += DIGITS[one];
  } else {
    // ten === 0
    if ((hundred > 0 || hasHigherGroup) && one > 0) {
      res += "lẻ ";
    }
    if (one > 0) res += DIGITS[one];
  }

  return res.trim();
}

export function readVndNumberToWords(n: number | string): string {
  const num = typeof n === "string" ? Math.round(Number(n)) : Math.round(n);
  if (isNaN(num) || num <= 0) return "Không đồng";

  let numStr = num.toString();
  const groups: number[] = [];

  while (numStr.length > 0) {
    const len = Math.min(3, numStr.length);
    groups.unshift(parseInt(numStr.slice(-len), 10));
    numStr = numStr.slice(0, -len);
  }

  let words = "";
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    if (g > 0) {
      const gWord = readGroupOfThree(g, i > 0);
      const unitIdx = groups.length - 1 - i;
      const unit = UNITS[unitIdx] || "";
      words += gWord + (unit ? " " + unit : "") + " ";
    }
  }

  words = words.trim();
  if (!words) return "Không đồng";

  return words.charAt(0).toUpperCase() + words.slice(1) + " đồng chẵn.";
}
