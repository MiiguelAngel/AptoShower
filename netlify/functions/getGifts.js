const { google } = require("googleapis");

exports.handler = async function () {
  try {
    if (!process.env.GOOGLE_CREDENTIALS_BASE64) {
      throw new Error("Falta la variable GOOGLE_CREDENTIALS_BASE64");
    }
    if (!process.env.SHEET_ID) {
      throw new Error("Falta la variable SHEET_ID");
    }

    const credentialsJSON = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, "base64").toString("utf-8");
    const credentials = JSON.parse(credentialsJSON);

    const spreadsheetId = process.env.SHEET_ID;
    const sheetName = "Regalos"; // hoja sin encabezados

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Lee todas las filas y columnas A..F (id_regalo, nombre, precio, lugar, descripcion, link)
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:K`,
    });

    const rows = resp.data.values || [];

    // Mapea por índice de columna (sin encabezados)
    const data = rows
      .map((row) => {
        const [id_regalo, nombre, precio, lugar, descripcion, link, img, estado,reservado_por, categoria, tipo] = row;
        return {
          id_regalo: (id_regalo || "").toString().trim(),
          nombre: (nombre || "").toString().trim(),
          precio: Number((precio || "0").toString().replace(/[^\d.,-]/g, "").replace(",", ".")) || 0,
          lugar: (lugar || "").toString().trim(),
          descripcion: (descripcion || "").toString().trim(),
          link: (link || "").toString().trim(),
          img: (img || "").toString().trim(),
          estado: (estado || "").toString().trim(),
          reservado_por: (reservado_por || "").toString().trim(),
          categoria: (categoria || "").toString().trim(),
          tipo: (tipo || "").toString().trim(),
        };
      })
      // Filtra filas vacías o sin nombre
      .filter((r) => r.nombre !== "");

    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (error) {
    console.error("❌ Error en getGifts:", error.message);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
