import discord
from discord.ext import commands
import asyncio
from .recorder import start_recording, stop_recording

# アクティブな録音セッションを追跡
active_recordings = {}

def setup_bot(client, logger):
    """
    Discordボットのセットアップ
    
    Args:
        client (commands.Bot): Discord.pyのBotクライアント
        logger (Logger): ロガー
    """
    
    @client.event
    async def on_ready():
        """ボットの準備完了時"""
        logger.info(f'ボットとして準備完了: {client.user.name}')
    
    @client.event
    async def on_voice_state_update(member, before, after):
        """
        ボイスステート更新イベント（ユーザーがVCに参加/退出した時）
        
        Args:
            member (discord.Member): 状態が変更されたメンバー
            before (discord.VoiceState): 変更前の状態
            after (discord.VoiceState): 変更後の状態
        """
        try:
            # 同じチャンネルでの移動は無視
            if before.channel == after.channel:
                return
            
            # ボットのVCイベントは無視
            if member.bot:
                return
            
            # ユーザーがVCに参加した場合
            if after.channel:
                channel = after.channel
                # チャンネル内のメンバー数をカウント（ボットを除く）
                member_count = len([m for m in channel.members if not m.bot])
                
                # 2人以上のメンバーがいる場合、録音を開始
                if member_count >= 2 and channel.id not in active_recordings:
                    logger.info(f'録音開始: {channel.name} ({channel.guild.name})')
                    
                    # 関連するテキストチャンネルを探す
                    text_channel = await find_related_text_channel(channel)
                    
                    if text_channel:
                        # 設定ファイルの読み込み
                        import json
                        with open('config.json', 'r', encoding='utf-8') as f:
                            config = json.load(f)
                        
                        # 録音開始メッセージを送信
                        await text_channel.send(config['messageTemplates']['recordingStart'])
                        
                        # 録音を開始
                        voice_client = await channel.connect()
                        
                        recording_session = await start_recording(voice_client, channel, logger)
                        
                        # アクティブな録音セッションを追跡
                        active_recordings[channel.id] = {
                            'voice_client': voice_client,
                            'recording_session': recording_session,
                            'text_channel': text_channel
                        }
                    else:
                        logger.warning(f'関連するテキストチャンネルが見つかりません: {channel.name}')
            
            # ユーザーがVCから退出した場合
            if before.channel:
                channel = before.channel
                
                # チャンネルが存在しない場合（削除された場合など）
                if not channel:
                    return
                
                # チャンネル内のメンバー数をカウント（ボットを除く）
                member_count = len([m for m in channel.members if not m.bot])
                
                # アクティブな録音があり、メンバーが0人になった場合、録音を停止
                if member_count == 0 and channel.id in active_recordings:
                    logger.info(f'録音停止: {channel.name} ({channel.guild.name})')
                    
                    session = active_recordings[channel.id]
                    voice_client = session['voice_client']
                    recording_session = session['recording_session']
                    text_channel = session['text_channel']
                    
                    # 録音を停止
                    recording_result = await stop_recording(recording_session, channel, logger)
                    
                    # 接続を切断
                    await voice_client.disconnect()
                    
                    # アクティブな録音セッションから削除
                    del active_recordings[channel.id]
                    
                    # 録音結果がある場合
                    if recording_result and recording_result.get('drive_link') and text_channel:
                        # 設定ファイルの読み込み
                        import json
                        with open('config.json', 'r', encoding='utf-8') as f:
                            config = json.load(f)
                        
                        # 録音終了メッセージと共有リンクを送信
                        await text_channel.send(config['messageTemplates']['recordingEnd'])
                        await text_channel.send(
                            config['messageTemplates']['shareLink'].replace('{link}', recording_result['drive_link'])
                        )
        
        except Exception as e:
            logger.error(f'ボイスステート処理中にエラーが発生しました: {str(e)}', exc_info=True)
    
    @client.command(name='help')
    async def help_command(ctx):
        """ヘルプコマンド"""
        # 設定ファイルの読み込み
        import json
        with open('config.json', 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        help_message = f"""
**Discord VC録音Bot**

このボットは音声チャンネルでの会話を自動的に録音し、Google Driveに保存します。

**自動録音**:
- 音声チャンネルに2人以上が参加すると自動的に録音を開始します
- 全員が退出すると録音を停止し、Google Driveのリンクを投稿します

**コマンド**:
- `{config['prefix']}help` - このヘルプメッセージを表示します
        """
        
        await ctx.reply(help_message)

async def find_related_text_channel(voice_channel):
    """
    音声チャンネルに関連するテキストチャンネルを探す
    
    Args:
        voice_channel (discord.VoiceChannel): 音声チャンネル
        
    Returns:
        discord.TextChannel or None: 関連するテキストチャンネル
    """
    guild = voice_channel.guild
    
    # 1. 同じカテゴリ内の「general」または「一般」という名前のテキストチャンネル
    if voice_channel.category:
        for channel in voice_channel.category.channels:
            if isinstance(channel, discord.TextChannel) and channel.name in ['general', '一般']:
                return channel
    
    # 2. 音声チャンネルと同じ名前のテキストチャンネル
    for channel in guild.channels:
        if isinstance(channel, discord.TextChannel) and channel.name == voice_channel.name:
            return channel
    
    # 3. サーバーのシステムチャンネル
    if guild.system_channel:
        return guild.system_channel
    
    # 4. 最初に見つかったテキストチャンネル
    for channel in guild.channels:
        if isinstance(channel, discord.TextChannel):
            return channel
    
    return None