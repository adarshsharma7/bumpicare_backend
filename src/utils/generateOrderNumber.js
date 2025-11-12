export const generateOrderNumber = () => {
  // Format: ORD-YYYYMMDD-XXXX (XXXX = random 4 digits)
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const random = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${date}-${random}`;
};
