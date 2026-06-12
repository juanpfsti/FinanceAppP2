// Criar esta pasta e arquivo para funções de formatação
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const parseCurrencyToNumber = (formatted: string): number => {
  const numeric = formatted.replace(/[^0-9,-]/g, '').replace(',', '.');
  return parseFloat(numeric) || 0;
};

export const formatToBRLString = (value: string): string => {
  const numeric = value.replace(/\D/g, '');
  if (numeric === '') return '';
  const number = parseInt(numeric, 10) / 100;
  return number.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};