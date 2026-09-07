/**
 * Team ACE roster. Members log in with their registration number; the
 * name is looked up here. To add / remove someone: edit this list and
 * push (Vercel redeploys automatically).
 */
export type Member = { name: string; regNo: string };

export const MEMBERS: Member[] = [
  { name: "ADARSH GUPTA", regNo: "25BME0009" },
  { name: "ADHVIK REDDY", regNo: "25BCE2248" },
  { name: "AMITH JOHN KOSHY", regNo: "25BEC0091" },
  { name: "AMOGH GUPTA", regNo: "25BCE2394" },
  { name: "ANUSHA SHARMA", regNo: "25BVD0110" },
  { name: "ARSHPREET SUKHDEEP SINGH DHILLON", regNo: "25BCE0050" },
  { name: "ATHARV NAMDEO", regNo: "25BCE2267" },
  { name: "AZLAAN ALI LADHA", regNo: "25BCE2294" },
  { name: "DHRUV SHARMA", regNo: "24BCE0085" },
  { name: "HARSHIT GUPTA", regNo: "25BCE2252" },
  { name: "IPSHITA AGRAWAL", regNo: "25BME0434" },
  { name: "NILESH KUMAR SRIVASTAVA", regNo: "26BIT0338" },
  { name: "PARVESHH PRABHU", regNo: "24BEC0084" },
  { name: "PAYAL PRIYADARSHINI SAHOO", regNo: "25BCE0037" },
  { name: "RIKHIL MODALAVALASA", regNo: "25BCE2884" },
  { name: "SAKCHAM PASARI", regNo: "25BCE2257" },
  { name: "SAMBHAV JAIN", regNo: "25BCE2396" },
  { name: "SHAAN AHAMED M", regNo: "25BCE2196" },
  { name: "SHREYANSH KEWAT", regNo: "25BME0028" },
  { name: "VEDANT VIDHANI", regNo: "25BCE2073" },
  { name: "VISHWANATHAN TAMIZHARASAN", regNo: "25BCE2885" },
  { name: "YUVRAJ SINGH JAKHAR", regNo: "25BCE2259" },
];

export function normalizeReg(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

export function memberByReg(input: string): Member | undefined {
  const reg = normalizeReg(input);
  return MEMBERS.find((m) => m.regNo === reg);
}
