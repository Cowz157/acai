/**
 * Gera um CPF com dígitos verificadores válidos (passa no algoritmo da Receita).
 * Usado para preencher campo CPF do gateway Vyat sem exigir o documento real do cliente.
 *
 * Atenção: o CPF gerado é matematicamente válido, mas não corresponde a nenhum
 * documento real. Use apenas em integrações onde isso for explicitamente aceito.
 */
export function generateCPF(): string {
  const digits: number[] = []
  for (let i = 0; i < 9; i++) {
    digits.push(Math.floor(Math.random() * 10))
  }

  // Primeiro dígito verificador
  let sum = 0
  for (let i = 0; i < 9; i++) sum += digits[i] * (10 - i)
  let dv1 = (sum * 10) % 11
  if (dv1 === 10) dv1 = 0
  digits.push(dv1)

  // Segundo dígito verificador
  sum = 0
  for (let i = 0; i < 10; i++) sum += digits[i] * (11 - i)
  let dv2 = (sum * 10) % 11
  if (dv2 === 10) dv2 = 0
  digits.push(dv2)

  return digits.join("")
}
