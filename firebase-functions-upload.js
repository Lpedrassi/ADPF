/**
 * Cloud Function para upload de revistas para Google Drive
 *
 * Deploy: firebase deploy --only functions:uploadRevistaToGoogleDrive
 *
 * Chamada do cliente (index.html):
 * const response = await fetch('https://your-region-project.cloudfunctions.net/uploadRevistaToGoogleDrive', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     fileName: 'ALUNO - Revista Cordeirinhos de Cristo.pdf',
 *     fileBase64: base64String,
 *     folderId: 'ID_DA_PASTA_NO_GOOGLE_DRIVE'
 *   })
 * });
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');
const fetch = require('node-fetch');

// Inicializar admin (automático no Cloud Functions)
admin.initializeApp();

// Configuração: Adicione aqui ou via Secret Manager
const GOOGLE_DRIVE_FOLDER_ID = 'SEU_FOLDER_ID_AQUI'; // ID da pasta "ADB Floripa - Revistas EBD"

/**
 * Cloud Function para fazer upload de PDF para Google Drive
 */
exports.uploadRevistaToGoogleDrive = functions
  .region('southamerica-east1') // Região mais próxima do Brasil
  .https.onCall(async (data, context) => {

    // Verificar autenticação
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado');
    }

    // Verificar se é admin
    const userDoc = await admin.firestore().collection('usuarios').doc(context.auth.uid).get();
    if (!userDoc.exists || userDoc.data().perfil !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Apenas admins podem fazer upload');
    }

    try {
      const { fileName, fileBase64, folderId, salaId, tipoRevista } = data;

      if (!fileName || !fileBase64) {
        throw new functions.https.HttpsError('invalid-argument', 'fileName e fileBase64 são obrigatórios');
      }

      // Decodificar base64 para buffer
      const fileBuffer = Buffer.from(fileBase64, 'base64');

      // Criar cliente Google Drive com Service Account
      const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/drive'],
      });

      const drive = google.drive({ version: 'v3', auth });

      // Upload do arquivo
      const fileMetadata = {
        name: fileName,
        parents: [folderId || GOOGLE_DRIVE_FOLDER_ID],
        description: `Revista EBD - ${salaId} (${tipoRevista})`
      };

      const media = {
        mimeType: 'application/pdf',
        body: fileBuffer,
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink, webContentLink',
      });

      const fileId = response.data.id;
      const driveLink = response.data.webViewLink;

      // Dar permissão de visualização pública
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      // Salvar link no Firestore (opcional - o cliente pode fazer isso)
      if (salaId) {
        const revistaData = {};
        if (tipoRevista === 'aluno') {
          revistaData.revistaPdfUrl = driveLink;
        } else if (tipoRevista === 'professor') {
          revistaData.revistaProUrl = driveLink;
        }

        if (Object.keys(revistaData).length > 0) {
          await admin.firestore()
            .collection('turmas')
            .doc(salaId)
            .update(revistaData);
        }
      }

      return {
        success: true,
        fileId: fileId,
        driveLink: driveLink,
        fileName: fileName
      };

    } catch (error) {
      console.error('Erro no upload:', error);
      throw new functions.https.HttpsError('internal', `Erro ao fazer upload: ${error.message}`);
    }
  });

/**
 * Alternativa: HTTP Endpoint (se preferir não usar Cloud Functions Callable)
 */
exports.uploadRevistaToGoogleDriveHttp = functions
  .region('southamerica-east1')
  .https.onRequest(async (req, res) => {

    // CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(200).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }

    try {
      const { fileName, fileBase64, folderId, authToken } = req.body;

      if (!fileName || !fileBase64) {
        res.status(400).json({ error: 'fileName e fileBase64 são obrigatórios' });
        return;
      }

      // Verificar autenticação via token
      let uid;
      try {
        const decodedToken = await admin.auth().verifyIdToken(authToken);
        uid = decodedToken.uid;
      } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
        return;
      }

      // Verificar se é admin
      const userDoc = await admin.firestore().collection('usuarios').doc(uid).get();
      if (!userDoc.exists || userDoc.data().perfil !== 'admin') {
        res.status(403).json({ error: 'Apenas admins podem fazer upload' });
        return;
      }

      // Decodificar base64
      const fileBuffer = Buffer.from(fileBase64, 'base64');

      // Criar cliente Google Drive
      const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/drive'],
      });

      const drive = google.drive({ version: 'v3', auth });

      // Upload
      const response = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [folderId || GOOGLE_DRIVE_FOLDER_ID],
        },
        media: {
          mimeType: 'application/pdf',
          body: fileBuffer,
        },
        fields: 'id, webViewLink',
      });

      // Permissão pública
      await drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      res.status(200).json({
        success: true,
        fileId: response.data.id,
        driveLink: response.data.webViewLink,
        fileName: fileName
      });

    } catch (error) {
      console.error('Erro:', error);
      res.status(500).json({ error: error.message });
    }
  });
