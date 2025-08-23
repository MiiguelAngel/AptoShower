const { google } = require("googleapis");

exports.handler = async function (event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Método no permitido" };
    }

    const { nombre } = JSON.parse(event.body || '{}');

    if (!nombre || typeof nombre !== 'string' || nombre.trim() === "") {
      return { statusCode: 400, body: "Nombre inválido" };
    }

    // Credenciales desde variable de entorno en base64
    const credentialsJSON = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf-8');
    const credentials = JSON.parse(credentialsJSON);
    const spreadsheetId = process.env.SHEET_ID;
    const sheetName = "Invitados"; // Hoja donde se guarda

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Usar append para agregar a una fila vacía
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:A`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [[nombre]],
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Nombre agregado exitosamente" }),
    };

  } catch (error) {
    console.error("❌ Error al agregar invitado:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
