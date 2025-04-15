import os
import json
from pathlib import Path
from google.oauth2 import service_account
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

# Google Drive APIのスコープ
SCOPES = ['https://www.googleapis.com/auth/drive.file']

async def authorize(logger):
    """
    Google Drive APIの認証を行う
    
    Args:
        logger: ロガー
        
    Returns:
        google.auth.credentials.Credentials: 認証済みのクレデンシャル
    """
    try:
        # 環境変数から認証情報のパスを取得
        credentials_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS') or \
                          str(Path(__file__).parent.parent / 'credentials' / 'google-credentials.json')
        
        # 認証情報ファイルが存在するか確認
        if not os.path.exists(credentials_path):
            raise FileNotFoundError(f'認証情報ファイルが見つかりません: {credentials_path}')
        
        # 認証情報を読み込む
        with open(credentials_path, 'r') as f:
            credentials_data = json.load(f)
        
        # サービスアカウント認証の場合
        if 'type' in credentials_data and credentials_data['type'] == 'service_account':
            credentials = service_account.Credentials.from_service_account_file(
                credentials_path, scopes=SCOPES)
            return credentials
        
        # OAuth2認証の場合
        elif 'installed' in credentials_data or 'web' in credentials_data:
            # トークンファイルのパス
            token_path = str(Path(__file__).parent.parent / 'credentials' / 'token.json')
            
            credentials = None
            # トークンファイルが存在する場合は読み込む
            if os.path.exists(token_path):
                credentials = Credentials.from_authorized_user_info(
                    json.loads(open(token_path, 'r').read()), SCOPES)
            
            # 有効な認証情報がない場合は新たに取得
            if not credentials or not credentials.valid:
                if credentials and credentials.expired and credentials.refresh_token:
                    credentials.refresh(Request())
                else:
                    flow = InstalledAppFlow.from_client_secrets_file(credentials_path, SCOPES)
                    credentials = flow.run_local_server(port=0)
                
                # トークンを保存
                with open(token_path, 'w') as token:
                    token.write(credentials.to_json())
            
            return credentials
        else:
            raise ValueError('サポートされていない認証タイプです。')
    
    except Exception as e:
        logger.error(f'Google認証中にエラーが発生しました: {str(e)}', exc_info=True)
        raise

async def upload_to_drive(file_path, file_name, channel_name, logger):
    """
    ファイルをGoogle Driveにアップロードする
    
    Args:
        file_path (str): アップロードするファイルのパス
        file_name (str): ファイル名
        channel_name (str): 音声チャンネル名（フォルダ名として使用）
        logger: ロガー
        
    Returns:
        dict: アップロード結果
    """
    try:
        # 設定ファイルの読み込み
        with open('config.json', 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        # Google認証
        credentials = await authorize(logger)
        drive_service = build('drive', 'v3', credentials=credentials)
        
        # ファイルのメタデータ
        file_metadata = {
            'name': file_name,
            'description': f'Discord音声チャンネル「{channel_name}」の録音 - {datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")}'
        }
        
        # 保存先フォルダが指定されている場合
        if config.get('googleDriveFolderId'):
            file_metadata['parents'] = [config['googleDriveFolderId']]
        
        # メディアデータ
        mime_type = get_mime_type(file_name)
        media = MediaFileUpload(file_path, mimetype=mime_type, resumable=True)
        
        # ファイルのアップロード
        logger.info(f'Google Driveにアップロード中: {file_name}')
        file = drive_service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id,name,webViewLink'
        ).execute()
        
        logger.info(f'アップロード完了: {file.get("name")} (ID: {file.get("id")})')
        
        # ファイルの共有設定を変更（リンクを知っている全員が閲覧可能に）
        drive_service.permissions().create(
            fileId=file.get('id'),
            body={
                'role': 'reader',
                'type': 'anyone'
            }
        ).execute()
        
        logger.info(f'共有設定を変更しました: {file.get("id")}')
        
        return {
            'id': file.get('id'),
            'name': file.get('name'),
            'web_view_link': file.get('webViewLink')
        }
    
    except Exception as e:
        logger.error(f'Google Driveへのアップロード中にエラーが発生しました: {str(e)}', exc_info=True)
        raise

def get_mime_type(file_name):
    """
    ファイル拡張子からMIMEタイプを取得
    
    Args:
        file_name (str): ファイル名
        
    Returns:
        str: MIMEタイプ
    """
    ext = os.path.splitext(file_name)[1].lower()
    
    mime_types = {
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.m4a': 'audio/mp4',
        '.flac': 'audio/flac'
    }
    
    return mime_types.get(ext, 'application/octet-stream')

# datetime モジュールのインポート
import datetime