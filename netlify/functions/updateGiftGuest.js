// updateGiftGuest.js
const { google } = require("googleapis");

exports.handler = async function (event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Método no permitido" };
    }

    const { id, reservado, invitado } = JSON.parse(event.body || "{}");

    const idStr = (id ?? "").toString().trim();
    if (!idStr) {
      return { statusCode: 400, body: "Id inválido" };
    }
    if (typeof reservado !== "boolean") {
      return { statusCode: 400, body: "Reserva inválida" };
    }

    // Credenciales
    const credentialsJSON = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, "base64").toString("utf-8");
    const credentials = JSON.parse(credentialsJSON);
    const spreadsheetId = process.env.SHEET_ID;
    const sheetName = "Regalos";

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
      if (row[0] && row[0].toLowerCase().trim() === idStr.toLowerCase().trim()) {
        fila = i + 1; // Google Sheets es 1-based
      }
    });

    if (fila === -1) {
      return { statusCode: 404, body: "Id no encontrado en la lista" };
    }

    const estado = reservado ? "Reservado" : "Disponible";
    const invitadoFinal = reservado ? (invitado || "") : ""; // si libera, vacía la columna I
    const ESTADO_COLUMN = "H";
    const INVITADO_COLUMN = "I";

    // ✍️ Actualizar columna H en la fila encontrada
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!${ESTADO_COLUMN}${fila}:${INVITADO_COLUMN}${fila}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[estado, invitadoFinal]],
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Reserva actualizada", fila, estado, invitado: invitadoFinal }),
    };
  } catch (error) {
    console.error("❌ Error en updateGiftGuest:", error.message);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};