const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const config = require('../config.json');

// Google Drive APIのスコープ
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

/**
 * Google Drive APIの認証を行う
 * @param {Logger} logger - ロガー
 * @returns {google.auth.OAuth2} - 認証済みのOAuth2クライアント
 */
async function authorize(logger) {
  try {
    // 環境変数から認証情報のパスを取得
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
                           path.join(__dirname, '../credentials/google-credentials.json');
    
    // 認証情報ファイルが存在するか確認
    if (!fs.existsSync(credentialsPath)) {
      throw new Error(`認証情報ファイルが見つかりません: ${credentialsPath}`);
    }
    
    // 認証情報を読み込む
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    
    // サービスアカウント認証の場合
    if (credentials.type === 'service_account') {
      const auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: SCOPES
      });
      return auth;
    } 
    // OAuth2認証の場合
    else if (credentials.installed || credentials.web) {
      const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
      const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
      
      // トークンファイルのパス
      const tokenPath = path.join(__dirname, '../credentials/token.json');
      
      // トークンファイルが存在する場合は読み込む
      if (fs.existsSync(tokenPath)) {
        const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
        oauth2Client.setCredentials(token);
        return oauth2Client;
      } else {
        throw new Error('OAuth2トークンが見つかりません。認証フローを実行してください。');
      }
    } else {
      throw new Error('サポートされていない認証タイプです。');
    }
  } catch (error) {
    logger.error(`Google認証中にエラーが発生しました: ${error.message}`);
    throw error;
  }
}

/**
 * ファイルをGoogle Driveにアップロードする
 * @param {string} filePath - アップロードするファイルのパス
 * @param {string} fileName - ファイル名
 * @param {string} channelName - 音声チャンネル名（フォルダ名として使用）
 * @param {Logger} logger - ロガー
 * @returns {Object} - アップロード結果
 */
async function uploadToDrive(filePath, fileName, channelName, logger) {
  try {
    // Google認証
    const auth = await authorize(logger);
    const drive = google.drive({ version: 'v3', auth });
    
    // ファイルのメタデータ
    const fileMetadata = {
      name: fileName,
      description: `Discord音声チャンネル「${channelName}」の録音 - ${new Date().toLocaleString()}`,
    };
    
    // 保存先フォルダが指定されている場合
    if (config.googleDriveFolderId) {
      fileMetadata.parents = [config.googleDriveFolderId];
    }
    
    // メディアデータ
    const media = {
      mimeType: getMimeType(fileName),
      body: fs.createReadStream(filePath)
    };
    
    // ファイルのアップロード
    logger.info(`Google Driveにアップロード中: ${fileName}`);
    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id,name,webViewLink'
    });
    
    logger.info(`アップロード完了: ${response.data.name} (ID: ${response.data.id})`);
    
    // ファイルの共有設定を変更（リンクを知っている全員が閲覧可能に）
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });
    
    logger.info(`共有設定を変更しました: ${response.data.id}`);
    
    return response.data;
  } catch (error) {
    logger.error(`Google Driveへのアップロード中にエラーが発生しました: ${error.message}`);
    throw error;
  }
}

/**
 * ファイル拡張子からMIMEタイプを取得
 * @param {string} fileName - ファイル名
 * @returns {string} - MIMEタイプ
 */
function getMimeType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  
  const mimeTypes = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.flac': 'audio/flac'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

module.exports = {
  uploadToDrive
};