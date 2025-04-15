const fs = require('fs');
const path = require('path');
const config = require('../config.json');

/**
 * 時間（秒）を読みやすい形式に変換
 * @param {number} seconds - 秒数
 * @returns {string} - 読みやすい形式の時間（例: 1時間23分45秒）
 */
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  let result = '';
  
  if (hours > 0) {
    result += `${hours}時間`;
  }
  
  if (minutes > 0 || hours > 0) {
    result += `${minutes}分`;
  }
  
  result += `${secs}秒`;
  
  return result;
}

/**
 * ファイルサイズを読みやすい形式に変換
 * @param {number} bytes - バイト数
 * @returns {string} - 読みやすい形式のファイルサイズ（例: 1.23 MB）
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 一時ディレクトリを掃除（古いファイルを削除）
 * @param {number} maxAgeDays - 保持する最大日数
 * @param {Logger} logger - ロガー
 */
function cleanupTempDirectory(maxAgeDays = 7, logger) {
  try {
    const directory = config.localStoragePath;
    const now = new Date();
    
    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
      return;
    }
    
    // ディレクトリ内のファイルを取得
    const files = fs.readdirSync(directory);
    
    let deletedCount = 0;
    let deletedSize = 0;
    
    // 各ファイルをチェック
    for (const file of files) {
      const filePath = path.join(directory, file);
      
      // ファイルの情報を取得
      const stats = fs.statSync(filePath);
      
      // ディレクトリはスキップ
      if (stats.isDirectory()) continue;
      
      // ファイルの経過日数を計算
      const fileDate = new Date(stats.mtime);
      const ageDays = (now - fileDate) / (1000 * 60 * 60 * 24);
      
      // 指定日数より古いファイルを削除
      if (ageDays > maxAgeDays) {
        const fileSize = stats.size;
        fs.unlinkSync(filePath);
        deletedCount++;
        deletedSize += fileSize;
        
        logger.debug(`古いファイルを削除しました: ${file} (${formatFileSize(fileSize)}, ${Math.floor(ageDays)}日前)`);
      }
    }
    
    if (deletedCount > 0) {
      logger.info(`一時ディレクトリの掃除が完了しました: ${deletedCount}ファイル削除 (合計 ${formatFileSize(deletedSize)})`);
    }
  } catch (error) {
    logger.error(`一時ディレクトリの掃除中にエラーが発生しました: ${error.message}`);
    logger.error(error.stack);
  }
}

/**
 * 安全なファイル名を生成（無効な文字を置換）
 * @param {string} filename - 元のファイル名
 * @returns {string} - 安全なファイル名
 */
function sanitizeFilename(filename) {
  // ファイル名に使用できない文字を置換
  return filename
    .replace(/[<>:"/\\|?*]/g, '_') // Windowsで禁止されている文字
    .replace(/\s+/g, '_')          // スペースをアンダースコアに置換
    .replace(/\.+/g, '.')          // 連続したドットを1つに
    .replace(/^\./, '_')           // 先頭のドットを置換
    .trim();
}

/**
 * 設定ファイルを再読み込み
 * @returns {Object} - 設定オブジェクト
 */
function reloadConfig() {
  try {
    // キャッシュをクリア
    delete require.cache[require.resolve('../config.json')];
    // 設定を再読み込み
    return require('../config.json');
  } catch (error) {
    console.error(`設定ファイルの読み込み中にエラーが発生しました: ${error.message}`);
    // エラーが発生した場合は既存の設定を返す
    return config;
  }
}

module.exports = {
  formatDuration,
  formatFileSize,
  cleanupTempDirectory,
  sanitizeFilename,
  reloadConfig
};