import os
import asyncio
import datetime
from pathlib import Path
import discord
from discord.sinks import MP3Sink, WaveSink, OGGSink
from .drive import upload_to_drive

def get_sink_class(format_name):
    """
    録音フォーマットに基づいてSinkクラスを取得
    
    Args:
        format_name (str): 録音フォーマット名
        
    Returns:
        discord.sinks.Sink: 適切なSinkクラス
    """
    format_map = {
        'mp3': MP3Sink,
        'wav': WaveSink,
        'ogg': OGGSink
    }
    return format_map.get(format_name.lower(), MP3Sink)

async def start_recording(voice_client, channel, logger):
    """
    音声チャンネルの録音を開始
    
    Args:
        voice_client (discord.VoiceClient): 音声クライアント
        channel (discord.VoiceChannel): 音声チャンネル
        logger (Logger): ロガー
        
    Returns:
        dict: 録音セッション情報
    """
    try:
        # 設定ファイルの読み込み
        import json
        with open('config.json', 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        # 録音ファイル名の生成（日時とチャンネル名を含む）
        timestamp = datetime.datetime.now().strftime('%Y-%m-%dT%H-%M-%S')
        sanitized_channel_name = ''.join(c if c.isalnum() or c in '-_' else '_' for c in channel.name)
        filename = f"{timestamp}_{sanitized_channel_name}.{config['recordingFormat']}"
        output_path = os.path.join(config['localStoragePath'], filename)
        
        logger.info(f'録音ファイル作成: {output_path}')
        
        # 録音フォーマットに基づいてSinkを選択
        sink_class = get_sink_class(config['recordingFormat'])
        
        # 録音の開始
        sink = sink_class(filters={"bitrate": config.get('recordingBitrate', 128) * 1000})
        voice_client.start_recording(
            sink,
            finished_callback=lambda sink: logger.debug('録音コールバック: 録音完了'),
            failed_callback=lambda err: logger.error(f'録音エラー: {err}')
        )
        
        # 録音セッション情報を返す
        return {
            'voice_client': voice_client,
            'output_path': output_path,
            'filename': filename,
            'sink': sink,
            'start_time': datetime.datetime.now()
        }
    except Exception as e:
        logger.error(f'録音開始中にエラーが発生しました: {str(e)}', exc_info=True)
        raise

async def stop_recording(recording_session, channel, logger):
    """
    録音を停止し、Google Driveにアップロード
    
    Args:
        recording_session (dict): 録音セッション情報
        channel (discord.VoiceChannel): 音声チャンネル
        logger (Logger): ロガー
        
    Returns:
        dict: 録音結果（Google Driveリンクなど）
    """
    try:
        voice_client = recording_session['voice_client']
        output_path = recording_session['output_path']
        filename = recording_session['filename']
        sink = recording_session['sink']
        start_time = recording_session['start_time']
        
        # 録音時間を計算
        duration = (datetime.datetime.now() - start_time).total_seconds()
        
        # 録音時間が短すぎる場合はスキップ（ノイズや誤検出の可能性）
        if duration < 3:
            logger.info(f'録音時間が短すぎるためスキップします: {duration}秒')
            return None
        
        logger.info(f'録音停止: {output_path} ({duration}秒)')
        
        # 録音を停止
        voice_client.stop_recording()
        
        # 録音データを保存
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # 設定ファイルの読み込み
        import json
        with open('config.json', 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        # 録音データをファイルに書き込む
        audio_data = sink.get_all_audio()
        if not audio_data:
            logger.warning('録音データがありません')
            return None
        
        # 複数ユーザーの音声を1つのファイルに結合
        # 注: 実際の実装ではより複雑な音声ミキシングが必要かもしれません
        with open(output_path, 'wb') as f:
            # 最初のユーザーの音声データを使用
            for user_id, audio in audio_data.items():
                f.write(audio.file.read())
                break
        
        # Google Driveにアップロード
        logger.info(f'Google Driveにアップロード中: {filename}')
        
        try:
            drive_result = await upload_to_drive(output_path, filename, channel.name, logger)
            
            # 自動削除が有効な場合、ローカルファイルを削除
            if config.get('autoDeleteLocalFiles', True):
                os.unlink(output_path)
                logger.info(f'ローカルファイルを削除しました: {output_path}')
            
            return {
                'filename': filename,
                'duration': duration,
                'drive_link': drive_result.get('web_view_link'),
                'drive_id': drive_result.get('id')
            }
        except Exception as upload_error:
            logger.error(f'Google Driveへのアップロード中にエラーが発生しました: {str(upload_error)}', exc_info=True)
            
            # アップロードに失敗してもローカルファイルは保持
            return {
                'filename': filename,
                'duration': duration,
                'local_path': output_path,
                'error': str(upload_error)
            }
    except Exception as e:
        logger.error(f'録音停止中にエラーが発生しました: {str(e)}', exc_info=True)
        return None