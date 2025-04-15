require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const winston = require('winston');
const config = require('./config.json');
const { setupBot } = require('./src/bot');

// ディレクトリの確認と作成
const dirs = [
  './recordings',
  './credentials',
  './logs'
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ロガーの設定
const logger = winston.createLogger({
  level: config.logLevel || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Discordクライアントの初期化
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// 未処理の例外をキャッチ
process.on('uncaughtException', (error) => {
  logger.error(`未処理の例外: ${error.message}`);
  logger.error(error.stack);
});

process.on('unhandledRejection', (error) => {
  logger.error(`未処理の拒否: ${error.message}`);
  logger.error(error.stack);
});

// ボットのセットアップと起動
async function main() {
  try {
    // Google認証情報の確認
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './credentials/google-credentials.json';
    if (!fs.existsSync(credentialsPath)) {
      logger.warn(`Google認証情報ファイルが見つかりません: ${credentialsPath}`);
      logger.warn('Google Drive機能は無効になります');
    }

    // ボットのセットアップ
    setupBot(client, logger);

    // ボットのログイン
    await client.login(process.env.DISCORD_TOKEN);
    logger.info('Discord Botが正常に起動しました');
  } catch (error) {
    logger.error(`ボットの起動中にエラーが発生しました: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

main();