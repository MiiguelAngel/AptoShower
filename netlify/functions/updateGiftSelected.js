// updateAttendance.js
const { google } = require("googleapis");

exports.handler = async function (event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Método no permitido" };
    }

    const { nombre, asistencia } = JSON.parse(event.body || "{}");

    if (!nombre || typeof nombre !== "string") {
      return { statusCode: 400, body: "Nombre inválido" };
    }
    if (typeof asistencia !== "boolean") {
      return { statusCode: 400, body: "Asistencia inválida" };
    }

    // Credenciales
    const credentialsJSON = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, "base64").toString("utf-8");
    const credentials = JSON.parse(credentialsJSON);
    const spreadsheetId = process.env.SHEET_ID;
    const sheetName = "Invitados";

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // 🔍 Buscar el nombre en la columna A
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`,
    });

    const rows = resp.data.values || [];
    let fila = -1;
    rows.forEach((row, i) => {
      if (row[0] && row[0].toLowerCase().trim() === nombre.toLowerCase().trim()) {
        fila = i + 1; // Google Sheets es 1-based
      }
    });

    if (fila === -1) {
      return { statusCode: 404, body: "Nombre no encontrado en la lista" };
    }

    // ✍️ Actualizar columna B en la fila encontrada
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!C${fila}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[asistencia ? "Sí Asistira" : "No Asistira"]],
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Asistencia registrada", fila }),
    };
  } catch (error) {
    console.error("❌ Error en updateAttendance:", error.message);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};