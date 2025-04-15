import os
import logging
import json
from pathlib import Path
import discord
from discord.ext import commands
from dotenv import load_dotenv
from src.bot import setup_bot

# .env ファイルの読み込み
load_dotenv()

# 設定ファイルの読み込み
with open('config.json', 'r', encoding='utf-8') as f:
    config = json.load(f)

# ディレクトリの確認と作成
dirs = [
    './recordings',
    './credentials',
    './logs'
]

for dir_path in dirs:
    Path(dir_path).mkdir(exist_ok=True, parents=True)

# ロガーの設定
logger = logging.getLogger('discord_recorder')
logger.setLevel(getattr(logging, config.get('logLevel', 'INFO').upper()))

# ログのフォーマット設定
formatter = logging.Formatter('[%(asctime)s] %(levelname)s: %(message)s')

# コンソールハンドラ
console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)
logger.addHandler(console_handler)

# ファイルハンドラ
file_handler = logging.FileHandler('logs/combined.log', encoding='utf-8')
file_handler.setFormatter(formatter)
logger.addHandler(file_handler)

# エラーログ用ファイルハンドラ
error_handler = logging.FileHandler('logs/error.log', encoding='utf-8')
error_handler.setLevel(logging.ERROR)
error_handler.setFormatter(formatter)
logger.addHandler(error_handler)

# 未処理の例外をキャッチ
def handle_exception(exc_type, exc_value, exc_traceback):
    if issubclass(exc_type, KeyboardInterrupt):
        # デフォルトの処理を使用
        return sys.__excepthook__(exc_type, exc_value, exc_traceback)
    
    logger.error("未処理の例外:", exc_info=(exc_type, exc_value, exc_traceback))

import sys
sys.excepthook = handle_exception

# Discordクライアントの初期化
intents = discord.Intents.default()
intents.message_content = True
intents.voice_states = True
intents.guilds = True

client = commands.Bot(command_prefix=config['prefix'], intents=intents)

# ボットのセットアップと起動
async def main():
    try:
        # Google認証情報の確認
        credentials_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS', './credentials/google-credentials.json')
        if not Path(credentials_path).exists():
            logger.warning(f'Google認証情報ファイルが見つかりません: {credentials_path}')
            logger.warning('Google Drive機能は無効になります')
        
        # ボットのセットアップ
        setup_bot(client, logger)
        
        # ボットのログイン
        await client.start(os.getenv('DISCORD_TOKEN'))
    except Exception as e:
        logger.error(f'ボットの起動中にエラーが発生しました: {str(e)}', exc_info=True)
        sys.exit(1)

if __name__ == '__main__':
    import asyncio
    asyncio.run(main())