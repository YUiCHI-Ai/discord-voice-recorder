const { createWriteStream } = require('fs');
const { pipeline } = require('stream/promises');
const path = require('path');
const { createAudioResource, createAudioPlayer, AudioPlayerStatus, EndBehaviorType } = require('@discordjs/voice');
const { OpusEncoder } = require('@discordjs/opus');
const prism = require('prism-media');
const { uploadToDrive } = require('./drive');
const config = require('../config.json');

/**
 * 音声チャンネルの録音を開始
 * @param {VoiceConnection} connection - 音声接続
 * @param {VoiceChannel} channel - 音声チャンネル
 * @param {Logger} logger - ロガー
 * @returns {Object} 録音セッション情報
 */
async function startRecording(connection, channel, logger) {
  try {
    // 録音ファイル名の生成（日時とチャンネル名を含む）
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedChannelName = channel.name.replace(/[^\w-]/g, '_');
    const filename = `${timestamp}_${sanitizedChannelName}.${config.recordingFormat}`;
    const outputPath = path.join(config.localStoragePath, filename);
    
    logger.info(`録音ファイル作成: ${outputPath}`);
    
    // 録音ストリームの設定
    const receiver = connection.receiver;
    
    // 音声プレイヤーの作成（サイレントオーディオを再生して接続を維持）
    const player = createAudioPlayer();
    connection.subscribe(player);
    
    // 録音ストリームとファイル出力の設定
    const opusEncoder = new OpusEncoder(48000, 2);
    const ffmpegArgs = [
      '-f', 's16le',
      '-ar', '48000',
      '-ac', '2',
      '-c:a', 'libmp3lame',
      '-b:a', `${config.recordingBitrate}k`,
      outputPath
    ];
    
    // FFmpegプロセスの作成
    const ffmpeg = new prism.FFmpeg({
      args: ffmpegArgs
    });
    
    // 出力ファイルストリーム
    const outputStream = createWriteStream(outputPath);
    
    // 全ユーザーの音声を混合するためのマップ
    const userAudioStreams = new Map();
    
    // ユーザーが話し始めたときのイベント
    receiver.speaking.on('start', (userId) => {
      if (userAudioStreams.has(userId)) return;
      
      logger.debug(`ユーザー音声検出: ${userId}`);
      
      // ユーザーの音声ストリームを取得
      const audioStream = receiver.subscribe(userId, {
        end: {
          behavior: EndBehaviorType.AfterSilence,
          duration: 500
        }
      });
      
      // ストリームをFFmpegに接続
      audioStream.pipe(ffmpeg, { end: false });
      
      // ユーザーストリームを追跡
      userAudioStreams.set(userId, audioStream);
      
      // ストリーム終了時の処理
      audioStream.on('end', () => {
        logger.debug(`ユーザー音声終了: ${userId}`);
        userAudioStreams.delete(userId);
      });
    });
    
    // FFmpegの出力を録音ファイルに書き込む
    ffmpeg.pipe(outputStream, { end: false });
    
    // 録音セッション情報を返す
    return {
      connection,
      receiver,
      outputPath,
      filename,
      ffmpeg,
      outputStream,
      userAudioStreams,
      startTime: new Date()
    };
  } catch (error) {
    logger.error(`録音開始中にエラーが発生しました: ${error.message}`);
    logger.error(error.stack);
    throw error;
  }
}

/**
 * 録音を停止し、Google Driveにアップロード
 * @param {Object} recordingSession - 録音セッション情報
 * @param {VoiceChannel} channel - 音声チャンネル
 * @param {Logger} logger - ロガー
 * @returns {Object} 録音結果（Google Driveリンクなど）
 */
async function stopRecording(recordingSession, channel, logger) {
  try {
    const { outputPath, filename, ffmpeg, outputStream, userAudioStreams, startTime } = recordingSession;
    
    // 録音時間を計算
    const duration = (new Date() - startTime) / 1000; // 秒単位
    
    // 録音時間が短すぎる場合はスキップ（ノイズや誤検出の可能性）
    if (duration < 3) {
      logger.info(`録音時間が短すぎるためスキップします: ${duration}秒`);
      return null;
    }
    
    logger.info(`録音停止: ${outputPath} (${duration}秒)`);
    
    // すべてのユーザーストリームを終了
    for (const [userId, stream] of userAudioStreams.entries()) {
      stream.destroy();
    }
    
    // FFmpegストリームを終了
    ffmpeg.end();
    
    // 出力ストリームを閉じる
    outputStream.end();
    
    // ストリームが完全に閉じるのを待つ
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Google Driveにアップロード
    logger.info(`Google Driveにアップロード中: ${filename}`);
    
    try {
      const driveResult = await uploadToDrive(outputPath, filename, channel.name, logger);
      
      // 自動削除が有効な場合、ローカルファイルを削除
      if (config.autoDeleteLocalFiles) {
        const fs = require('fs');
        fs.unlinkSync(outputPath);
        logger.info(`ローカルファイルを削除しました: ${outputPath}`);
      }
      
      return {
        filename,
        duration,
        driveLink: driveResult.webViewLink,
        driveId: driveResult.id
      };
    } catch (uploadError) {
      logger.error(`Google Driveへのアップロード中にエラーが発生しました: ${uploadError.message}`);
      logger.error(uploadError.stack);
      
      // アップロードに失敗してもローカルファイルは保持
      return {
        filename,
        duration,
        localPath: outputPath,
        error: uploadError.message
      };
    }
  } catch (error) {
    logger.error(`録音停止中にエラーが発生しました: ${error.message}`);
    logger.error(error.stack);
    return null;
  }
}

module.exports = {
  startRecording,
  stopRecording
};