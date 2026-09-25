export default function handler(req, res) {
  // Solo permitimos peticiones POST (envío de datos seguros)
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método no permitido" });
  }

  const { usuario, password } = req.body;

  const credenciales = [
    { usuario: "luis", password: "12345678Lc" },
    { usuario: "romy", password: "romy12345" },
    { usuario: "katherine", password: "senado4" },
    { usuario: "milton", password: "saep" },
  ];

  // Buscamos si existe un usuario y contraseña que coincidan en la lista
  const usuarioValido = credenciales.find(
    (credencial) =>
      credencial.usuario === usuario && credencial.password === password,
  );

  // Validamos el resultado de la búsqueda
  if (usuarioValido) {
    // Login exitoso: Devolvemos un token simulado
    return res.status(200).json({
      success: true,
      token: "token-secreto-saep-12345",
    });
  } else {
    // Login fallido
    return res.status(401).json({
      success: false,
      message: "Usuario o contraseña incorrectos",
    });
  }
}
