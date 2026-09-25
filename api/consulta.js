export default async function handler(req, res) {
  const { dni } = req.query;

  if (!dni) {
    return res.status(400).json({ success: false, message: "Falta DNI" });
  }

  try {
    // La URL final de la ONPE
    const urlDestino = `https://resultadohistorico-eg2026.onpe.gob.pe/presentacion-backend/padron/mesa/${dni}`;

    // Tu clave secreta de ZenRows (segura en el backend)
    const apiKey = "9923d43e077ae99a4fc2fd2c12e158db17125acd";

    // La URL de ZenRows con el Anti-Bot activado
    const zenRowsUrl = `https://api.zenrows.com/v1/?apikey=${apiKey}&url=${encodeURIComponent(urlDestino)}&mode=auto`;

    // Hacemos la consulta de SERVIDOR a SERVIDOR (Adiós CORS)
    const response = await fetch(zenRowsUrl);

    if (!response.ok) {
      throw new Error(`Error de ZenRows: ${response.status}`);
    }

    const data = await response.json();

    // Le enviamos la data limpia a tu página web
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({
        success: false,
        message: "Error interno procesando la solicitud.",
      });
  }
}
