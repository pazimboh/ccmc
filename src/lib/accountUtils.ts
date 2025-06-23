export function generateAccountNumber(): string {
  // Generate a random 10-digit number
  const randomNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();
  // Basic prefix, can be enhanced based on account type or other logic
  const prefix = "ACC";
  return `${prefix}${randomNumber}`;
}
