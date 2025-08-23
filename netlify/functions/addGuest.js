const { google } = require('googleapis');

exports.handler = async function (event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Método no permitido" };
    }

    const { nombre } = JSON.parse(event.body || '{}');

    if (!nombre || typeof nombre !== 'string' || nombre.trim() === "") {
      return { statusCode: 400, body: "Nombre inválido" };
    }

    const credentialsJSON = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf-8');
    const credentials = JSON.parse(credentialsJSON);
    const spreadsheetId = process.env.SHEET_ID;
    const sheetName = 'Invitados';

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:A`,
      valueInputOption: "USER_ENTERED",
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