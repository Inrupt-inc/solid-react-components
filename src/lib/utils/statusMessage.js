export default function solidResponse(code, message, optionals) {
  return { code, message, ...optionals };
}
