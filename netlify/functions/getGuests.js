const { google } = require('googleapis');

exports.handler = async function (event, context) {
  try {
    // Paso 1: Verifica las variables de entorno
    if (!process.env.GOOGLE_CREDENTIALS_JSON) {
      throw new Error("Falta la variable GOOGLE_CREDENTIALS_JSON");
    }
    if (!process.env.SHEET_ID) {
      throw new Error("Falta la variable SHEET_ID");
    }

    console.log("✔ Variables de entorno presentes");

    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    const spreadsheetId = process.env.SHEET_ID;
    const sheetName = 'Invitados'; // <- asegúrate de que este nombre existe en la pestaña

    // Paso 2: Inicializa autenticación
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    console.log("✔ Autenticación configurada");

    const sheets = google.sheets({ version: 'v4', auth });

    // Paso 3: Intenta obtener los valores
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`, // solo columna A
    });

    // Paso 4: Verifica la respuesta
    console.log("✔ Datos recibidos de Sheets");

    const rawValues = response.data.values;
    console.log("📄 Valores crudos recibidos:", JSON.stringify(rawValues, null, 2));

    if (!rawValues || !Array.isArray(rawValues)) {
      throw new Error("La respuesta no contiene una matriz de datos válida");
    }

    // Paso 5: Procesa los datos (limpia nulos y vacíos)
    const invitados = rawValues
      .map(row => row[0])
      .filter(nombre => typeof nombre === 'string' && nombre.trim() !== '');

    console.log(`✔ Se encontraron ${invitados.length} invitados válidos`);
    console.log("🧾 Lista final:", invitados);

    // Paso 6: Devuelve la lista
    return {
      statusCode: 200,
      body: JSON.stringify(invitados),
    };

  } catch (error) {
    // Captura y muestra el error detallado
    console.error("🚨 Error en getGuests:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Error interno" }),
    };
  }
};
