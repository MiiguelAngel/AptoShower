const { google } = require('googleapis');
require('dotenv').config(); // solo necesario si usas `.env` localmente

exports.handler = async function (event, context) {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    const spreadsheetId = process.env.SHEET_ID;
    const sheetName = 'Invitados'; // <- asegúrate de que el nombre coincide con el de tu hoja de cálculo

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`, // ← columna A con nombres
    });

    const values = response.data.values || [];

    // Filtramos filas vacías y nos quedamos con los valores
    const invitados = values
      .map(row => row[0])
      .filter(nombre => typeof nombre === 'string' && nombre.trim() !== '');

    return {
      statusCode: 200,
      body: JSON.stringify(invitados),
    };

  } catch (error) {
    console.error("Error en getGuests:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "No se pudo obtener la lista de invitados" }),
    };
  }
};
